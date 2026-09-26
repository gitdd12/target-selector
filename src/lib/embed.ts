// 검색 문장 임베딩과 업무 문장 검색.
// 업무 문장(O*NET 31.0, 고유 문장 17,579개)은 미리 임베딩해 data/onet31/task_emb_e5.f16에 두었다.
// 사람마다 새로 임베딩하는 건 검색 문장뿐이다. 업무 임베딩과 같은 모델(e5-base-v2)이어야 한다.
//
// 모델 파일(fp16, 약 218MB)은 배포 묶음 용량 제한(250MB)에 걸려서 넣지 않고, 서버가 처음 쓸 때
// Hugging Face에서 받아 임시 폴더에 둔다. 같은 서버 인스턴스에서는 다시 받지 않는다.
// fp16 모델의 검색 결과는 업무 임베딩을 만든 원래 모델(fp32)과 상위 30개가 99.9% 같다(2026-09-26 확인).
import fs from "fs";
import os from "os";
import path from "path";
import { EMBED } from "./config";

type Extractor = (texts: string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = path.join(os.tmpdir(), "hf-cache");
      env.allowLocalModels = false;
      const ex = await pipeline("feature-extraction", EMBED.model, { dtype: EMBED.dtype, revision: EMBED.revision });
      return ex as unknown as Extractor;
    })().catch((e) => {
      extractorPromise = null; // 실패하면 다음 호출에서 다시 시도한다
      throw e;
    });
  }
  return extractorPromise;
}

/** 검색 문장을 임베딩한다. 한 줄에 768개 숫자, 길이 1로 맞춘 벡터. */
export async function embedQueries(queries: string[]): Promise<Float32Array[]> {
  const ex = await getExtractor();
  const out: Float32Array[] = [];
  for (let i = 0; i < queries.length; i += 32) {
    const batch = queries.slice(i, i + 32).map((q) => EMBED.queryPrefix + q);
    const { data } = await ex(batch, { pooling: "mean", normalize: true });
    for (let j = 0; j < batch.length; j++) out.push(data.slice(j * EMBED.dim, (j + 1) * EMBED.dim));
  }
  return out;
}

type TaskIndex = { texts: string[]; vecs: Float32Array };
let index: TaskIndex | null = null;

function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const f = h & 0x3ff;
  if (e === 0) return s * f * 2 ** -24;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * (1 + f / 1024) * 2 ** (e - 15);
}

/** 업무 문장 임베딩을 읽는다. 파일은 float16(리틀엔디언)으로 문장 순서는 task_emb_texts.json과 같다. */
export function taskIndex(): TaskIndex {
  if (index) return index;
  const dir = path.join(process.cwd(), "data", "onet31");
  const texts = JSON.parse(fs.readFileSync(path.join(dir, "task_emb_texts.json"), "utf8")) as string[];
  const buf = fs.readFileSync(path.join(dir, "task_emb_e5.f16"));
  const n = buf.length / 2;
  if (n !== texts.length * EMBED.dim) throw new Error(`업무 임베딩 크기가 맞지 않음: ${n} != ${texts.length}×${EMBED.dim}`);
  const table = new Float32Array(65536);
  for (let h = 0; h < 65536; h++) table[h] = halfToFloat(h);
  const vecs = new Float32Array(n);
  for (let i = 0; i < n; i++) vecs[i] = table[buf.readUInt16LE(i * 2)];
  index = { texts, vecs };
  return index;
}

/** 검색 문장 하나에 가장 가까운 업무 문장 k개(코사인 유사도 순). */
export function searchTasks(query: Float32Array, k: number = EMBED.perQuery): { text: string; score: number }[] {
  const { texts, vecs } = taskIndex();
  const D = EMBED.dim;
  const top: { i: number; s: number }[] = [];
  for (let i = 0; i < texts.length; i++) {
    let s = 0;
    const o = i * D;
    for (let d = 0; d < D; d++) s += vecs[o + d] * query[d];
    if (top.length < k) {
      top.push({ i, s });
      if (top.length === k) top.sort((a, b) => b.s - a.s);
    } else if (s > top[k - 1].s) {
      let j = k - 1;
      while (j > 0 && top[j - 1].s < s) {
        top[j] = top[j - 1];
        j--;
      }
      top[j] = { i, s };
    }
  }
  if (top.length < k) top.sort((a, b) => b.s - a.s);
  return top.map(({ i, s }) => ({ text: texts[i], score: s }));
}
