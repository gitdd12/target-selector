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
    const { error } = await this.db
      .from("sessions")
      .upsert({ id: s.id, data: s, updated_at: new Date().toISOString() });
    if (error) throw new Error(`저장소 쓰기 실패: ${error.message}`);
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
