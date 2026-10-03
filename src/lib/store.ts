import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CONSENT_VERSION, MODELS } from "./config";
import { env } from "./env";
import { specVersions } from "./specs";
import { WINDOW_ORDER, type Session, type WindowKind, type WindowState } from "./types";

// 세션 하나 = 사람 한 명의 인터뷰 기록 전체(4개 대화창 + 기록 필드 + 결과지 초안).
// 이메일은 대화 기록과 분리해서(contacts) 저장한다. 서로는 세션 id로만 이어진다.
// Supabase 키가 있으면 Supabase에, 없으면 내 컴퓨터의 .data 폴더에 저장한다(로컬 시험용).

export interface Contact {
  email: string;
  at: string;
}

export interface Store {
  get(id: string): Promise<Session | null>;
  put(s: Session): Promise<void>;
  del(id: string): Promise<void>; // 세션과 이메일을 함께 지운다
  count(): Promise<number>;
  list(): Promise<Session[]>;
  getContact(id: string): Promise<Contact | null>;
  putContact(id: string, c: Contact): Promise<void>;
  // 여러 세션이 함께 쓰는 값(근거 업무 번역처럼 한 번 만들어 계속 쓰는 것). 못 읽으면 빈 값으로 넘어간다.
  getCache(keys: string[]): Promise<Record<string, unknown>>;
  putCache(entries: Record<string, unknown>): Promise<void>;
}

// 링크에 들어가는 비밀 코드 형식. 폴더 경로 조작 같은 것을 막는 검사도 겸한다.
export const isValidId = (id: string) => /^[A-Za-z0-9_-]{24,64}$/.test(id);

// put()이 저장하려는 세션의 rev가 이미 저장소에 있는 값과 다를 때 던진다(§40) — 그 사이 다른 요청이
// 먼저 저장했다는 뜻이다. 부른 쪽은 세션을 다시 읽어와 같은 작업을 그 위에 다시 적용해야 한다.
export class ConflictError extends Error {
  constructor() {
    super("세션이 그 사이 다른 곳에서 저장됐어요(저장 경쟁)");
  }
}

class FileStore implements Store {
  private root = path.join(process.cwd(), ".data");
  private file(kind: "sessions" | "contacts", id: string) {
    return path.join(this.root, kind, `${id}.json`);
  }
  private read<T>(kind: "sessions" | "contacts", id: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(this.file(kind, id), "utf8")) as T;
    } catch {
      return null;
    }
  }
  private write(kind: "sessions" | "contacts", id: string, v: unknown) {
    fs.mkdirSync(path.join(this.root, kind), { recursive: true });
    fs.writeFileSync(this.file(kind, id), JSON.stringify(v, null, 1), "utf8");
  }
  async get(id: string) {
    return this.read<Session>("sessions", id);
  }
  async put(s: Session) {
    // 로컬 시험용이라 완벽한 원자성은 없지만(파일 시스템), 같은 rev일 때만 쓰게 해서 §40의 저장 경쟁을 재현·시험할 수 있게 한다.
    const expected = s.rev ?? 0;
    const current = this.read<Session>("sessions", s.id);
    if (current && (current.rev ?? 0) !== expected) throw new ConflictError();
    s.rev = expected + 1;
    this.write("sessions", s.id, s);
  }
  async del(id: string) {
    fs.rmSync(this.file("sessions", id), { force: true });
    fs.rmSync(this.file("contacts", id), { force: true });
  }
  async count() {
    try {
      return fs.readdirSync(path.join(this.root, "sessions")).length;
    } catch {
      return 0;
    }
  }
  async list() {
    try {
      return fs
        .readdirSync(path.join(this.root, "sessions"))
        .map((f) => this.read<Session>("sessions", f.replace(/\.json$/, "")))
        .filter((s): s is Session => s !== null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return [];
    }
  }
  async getContact(id: string) {
    return this.read<Contact>("contacts", id);
  }
  async putContact(id: string, c: Contact) {
    this.write("contacts", id, c);
  }
  private cacheFile() {
    return path.join(this.root, "cache.json");
  }
  private readCache(): Record<string, unknown> {
    try {
      return JSON.parse(fs.readFileSync(this.cacheFile(), "utf8"));
    } catch {
      return {};
    }
  }
  async getCache(keys: string[]) {
    const all = this.readCache();
    return Object.fromEntries(keys.filter((k) => k in all).map((k) => [k, all[k]]));
  }
  async putCache(entries: Record<string, unknown>) {
    fs.mkdirSync(this.root, { recursive: true });
    fs.writeFileSync(this.cacheFile(), JSON.stringify({ ...this.readCache(), ...entries }), "utf8");
  }
}

class SupabaseStore implements Store {
  private db: SupabaseClient;
  constructor(url: string, key: string) {
    this.db = createClient(url, key, { auth: { persistSession: false } });
  }
  async get(id: string) {
    const { data, error } = await this.db.from("sessions").select("data").eq("id", id).maybeSingle();
    if (error) throw new Error(`저장소 읽기 실패: ${error.message}`);
    return (data?.data as Session | undefined) ?? null;
  }
  async put(s: Session) {
    // §40: rev가 저장소의 값과 같을 때만 쓴다(동시에 두 요청이 같은 세션을 읽고 저장하면, 먼저 저장한 쪽만
    // 성공하고 나중 쪽은 ConflictError를 받아 다시 읽어와서 다시 시도해야 한다 — 안 그러면 늦게 도착한 쪽이
    // 먼저 저장된 내용을 그냥 덮어써서 조용히 사라진다. 실제로 이메일 제출이 이렇게 사라진 사례가 있었다).
    const expected = s.rev ?? 0;
    const newRev = expected + 1;
    const { data, error } = await this.db
      .from("sessions")
      .update({ data: { ...s, rev: newRev }, rev: newRev, updated_at: new Date().toISOString() })
      .eq("id", s.id)
      .eq("rev", expected)
      .select("id");
    if (error) throw new Error(`저장소 쓰기 실패: ${error.message}`);
    if (!data || data.length === 0) {
      // 업데이트된 행이 없다 — 이 세션이 아직 없거나(첫 저장), rev가 달라서(저장 경쟁)다. 구분해서 처리한다.
      const { data: existing, error: selErr } = await this.db.from("sessions").select("rev").eq("id", s.id).maybeSingle();
      if (selErr) throw new Error(`저장소 읽기 실패: ${selErr.message}`);
      if (existing) throw new ConflictError();
      const { error: insErr } = await this.db
        .from("sessions")
        .insert({ id: s.id, data: { ...s, rev: newRev }, rev: newRev, updated_at: new Date().toISOString() });
      if (insErr) {
        if (insErr.code === "23505") throw new ConflictError(); // 그 사이 다른 요청이 먼저 만들었다
        throw new Error(`저장소 쓰기 실패: ${insErr.message}`);
      }
    }
    s.rev = newRev;
  }
  async del(id: string) {
    const c = await this.db.from("contacts").delete().eq("session_id", id);
    if (c.error) throw new Error(`저장소 삭제 실패: ${c.error.message}`);
    const { error } = await this.db.from("sessions").delete().eq("id", id);
    if (error) throw new Error(`저장소 삭제 실패: ${error.message}`);
  }
  async count() {
    const { count, error } = await this.db.from("sessions").select("id", { count: "exact", head: true });
    if (error) throw new Error(`저장소 읽기 실패: ${error.message}`);
    return count ?? 0;
  }
  async list() {
    const { data, error } = await this.db.from("sessions").select("data").order("created_at").limit(500);
    if (error) throw new Error(`저장소 읽기 실패: ${error.message}`);
    return (data ?? []).map((r) => r.data as Session);
  }
  async getContact(id: string) {
    const { data, error } = await this.db.from("contacts").select("email, created_at").eq("session_id", id).maybeSingle();
    if (error) throw new Error(`저장소 읽기 실패: ${error.message}`);
    return data ? { email: data.email as string, at: data.created_at as string } : null;
  }
  async putContact(id: string, c: Contact) {
    const { error } = await this.db.from("contacts").upsert({ session_id: id, email: c.email, created_at: c.at });
    if (error) throw new Error(`저장소 쓰기 실패: ${error.message}`);
  }
  // cache 표(supabase/schema.sql)가 아직 없으면 경고만 남기고 캐시 없이 진행한다(번역은 되지만 세션마다 새로 한다).
  async getCache(keys: string[]) {
    if (keys.length === 0) return {};
    const { data, error } = await this.db.from("cache").select("key, value").in("key", keys);
    if (error) {
      console.warn(`cache 표 읽기 실패(캐시 없이 진행): ${error.message}`);
      return {};
    }
    return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  }
  async putCache(entries: Record<string, unknown>) {
    const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
    if (rows.length === 0) return;
    const { error } = await this.db.from("cache").upsert(rows);
    if (error) console.warn(`cache 표 쓰기 실패(캐시 없이 진행): ${error.message}`);
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (url && key) store = new SupabaseStore(url, key);
  else {
    if (process.env.VERCEL) throw new Error("배포 환경에는 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다");
    store = new FileStore();
  }
  return store;
}

const emptyWindow = (kind: WindowKind): WindowState => ({ kind, status: "pending", messages: [], recorded: false });

export function newSession(profile: Session["profile"] = {}): Session {
  const now = new Date().toISOString();
  return {
    id: randomBytes(24).toString("base64url"),
    createdAt: now,
    updatedAt: now,
    rev: 0,
    consent: { at: now, version: CONSENT_VERSION },
    specVersions: specVersions(),
    models: { ...MODELS },
    phase: "targets",
    currentWindow: "exp1",
    profile,
    windows: Object.fromEntries(WINDOW_ORDER.map((k) => [k, emptyWindow(k)])) as Session["windows"],
    records: {},
    emailSubmitted: false,
    usage: { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    log: [],
  };
}

export async function save(s: Session) {
  s.updatedAt = new Date().toISOString();
  await getStore().put(s);
}
