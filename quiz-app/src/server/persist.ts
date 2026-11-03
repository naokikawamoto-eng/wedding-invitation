import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobPreconditionFailedError, BlobServiceRateLimited, get, put } from "@vercel/blob";
import { applyAction, emptyState, normalize, type Action, type QuizState } from "./engine";

const STATE_PATH = "quiz/state.json";
const CACHE_MS = 350;

interface Cache {
  state: QuizState;
  etag: string | null;
  at: number;
}

let cache: Cache | null = null;
let chain: Promise<unknown> = Promise.resolve();

export function usingBlob(): boolean {
  if (process.env.QUIZ_STATE_FILE) return false;
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

const DEFAULT_STATE_FILE = path.join(process.cwd(), "data", "quiz-state.json");

function stateFile(): string {
  return process.env.QUIZ_STATE_FILE || DEFAULT_STATE_FILE;
}

function assertStore() {
  if (process.env.VERCEL && !usingBlob()) {
    throw new Error("保存先（Vercel Blob）が未接続です。プロジェクトに Blob ストアを接続してください");
  }
}

function parseState(text: string): QuizState {
  const data = JSON.parse(text) as QuizState;
  if (!data || typeof data.version !== "number" || !data.rooms || typeof data.rooms !== "object") {
    throw new Error("保存データを読めませんでした");
  }
  return data;
}

async function readFileState(): Promise<QuizState> {
  try {
    // テスト用の一時パスはバンドル追跡から外す。本番のローカル実行は data/ 固定
    const text = process.env.QUIZ_STATE_FILE
      ? await readFile(/*turbopackIgnore: true*/ process.env.QUIZ_STATE_FILE, "utf8")
      : await readFile(DEFAULT_STATE_FILE, "utf8");
    return parseState(text);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

async function writeFileState(state: QuizState) {
  const file = stateFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const json = JSON.stringify(state);
  if (process.env.QUIZ_STATE_FILE) {
    await writeFile(/*turbopackIgnore: true*/ tmp, json);
    await rename(/*turbopackIgnore: true*/ tmp, file);
    return;
  }
  await writeFile(tmp, json);
  await rename(tmp, file);
}

async function loadBlob(): Promise<{ state: QuizState; etag: string | null }> {
  const res = await get(STATE_PATH, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { state: emptyState(), etag: null };
  const text = await new Response(res.stream).text();
  return { state: parseState(text), etag: res.blob.etag };
}

function isRetryable(error: unknown): boolean {
  if (error instanceof BlobPreconditionFailedError || error instanceof BlobServiceRateLimited) return true;
  const message = error instanceof Error ? error.message : "";
  return /already exists|precondition|conflict/i.test(message);
}

async function saveBlob(state: QuizState, etag: string | null): Promise<string> {
  const result = await put(STATE_PATH, JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
  return result.etag;
}

function remember(state: QuizState, etag: string | null) {
  cache = { state, etag, at: Date.now() };
}

async function fileCommit(mutator: (state: QuizState) => QuizState): Promise<QuizState> {
  const loaded = await readFileState();
  const current = normalize(loaded, Date.now());
  const next = mutator(current);
  if (next === loaded) {
    remember(loaded, null);
    return loaded;
  }
  const saved = { ...next, version: loaded.version + 1 };
  await writeFileState(saved);
  remember(saved, null);
  return saved;
}

async function blobCommit(mutator: (state: QuizState) => QuizState): Promise<QuizState> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const loaded = await loadBlob();
    const current = normalize(loaded.state, Date.now());
    const next = mutator(current);
    if (next === loaded.state) {
      remember(loaded.state, loaded.etag);
      return loaded.state;
    }
    const saved = { ...next, version: loaded.state.version + 1 };
    try {
      const etag = await saveBlob(saved, loaded.etag);
      remember(saved, etag);
      return saved;
    } catch (error) {
      if (!isRetryable(error) || attempt === 11) throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1) + Math.random() * 50));
    }
  }
  throw new Error("サーバーが混み合っています。もう一度お試しください");
}

export function commit(mutator: (state: QuizState) => QuizState): Promise<QuizState> {
  assertStore();
  const run = chain.then(() => (usingBlob() ? blobCommit(mutator) : fileCommit(mutator)));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function readState(now = Date.now()): Promise<QuizState> {
  assertStore();
  if (cache && Date.now() - cache.at < CACHE_MS) {
    const next = normalize(cache.state, now);
    if (next === cache.state) return cache.state;
    return commit((state) => normalize(state, Date.now()));
  }
  const loaded = usingBlob() ? await loadBlob() : { state: await readFileState(), etag: null };
  remember(loaded.state, loaded.etag);
  const next = normalize(loaded.state, now);
  if (next === loaded.state) return loaded.state;
  return commit((state) => normalize(state, Date.now()));
}

export async function runAction(action: Action, now = Date.now()): Promise<{ state: QuizState; createdRoomId?: string }> {
  let createdRoomId: string | undefined;
  const state = await commit((current) => {
    const before = new Set(Object.keys(current.rooms));
    const next = applyAction(current, action, now);
    if (action.op === "createRoom") {
      createdRoomId = Object.keys(next.rooms).find((id) => !before.has(id));
    }
    return next;
  });
  return { state, createdRoomId };
}

export async function saveImage(bytes: Buffer, contentType: string): Promise<string> {
  assertStore();
  const ext = contentType === "image/png" ? "png" : contentType === "image/gif" ? "gif" : contentType === "image/webp" ? "webp" : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (!usingBlob()) {
    const dir = path.join(process.cwd(), "public", "quiz");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
    return `/quiz/${filename}`;
  }
  const pathname = `quiz/images/${filename}`;
  await put(pathname, bytes, { access: "private", addRandomSuffix: false, contentType });
  return `/api/media?path=${encodeURIComponent(pathname)}`;
}

export async function readImage(pathname: string) {
  if (!usingBlob()) return null;
  if (!/^quiz\/images\/[A-Za-z0-9._-]+$/.test(pathname)) return null;
  const res = await get(pathname, { access: "private", useCache: true });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  return { stream: res.stream, contentType: res.blob.contentType || "application/octet-stream" };
}

export function __resetStoreForTests() {
  cache = null;
  chain = Promise.resolve();
}
