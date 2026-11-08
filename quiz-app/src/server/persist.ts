import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";
import type { Answer, Participant } from "../lib/types";
import { overlayGuests, type GuestRecord } from "./answers";
import { applyAction, cleanRoomId, emptyState, normalize, rescoreIfPublished, type Action, type QuizState } from "./engine";

const STATE_PATH = "quiz/state.json";
const LOCK_PATH = "quiz/state.lock";
const CACHE_MS = 350;

interface Cache {
  state: QuizState;
  etag: string | null;
  at: number;
}

let cache: Cache | null = null;
let chain: Promise<unknown> = Promise.resolve();
const guestChains = new Map<string, Promise<unknown>>();
let guestListCache: { roomId: string; at: number; guests: GuestRecord[] } | null = null;

const GUEST_LIST_MS = 1000;

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

async function saveBlob(state: QuizState): Promise<void> {
  // ifMatch はプライベート Blob だと一致しないことがあったので、ロックの中で上書きする
  await put(STATE_PATH, JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function breakStaleLock() {
  const res = await get(LOCK_PATH, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return;
  const text = await new Response(res.stream).text();
  const started = Number(text.split("-")[0]);
  if (Number.isFinite(started) && Date.now() - started > 8_000) await del(LOCK_PATH).catch(() => undefined);
}

/** 同時の回答を直列にする。ロックが取れない間は少し待ってやり直す */
async function withBlobLock<T>(fn: () => Promise<T>): Promise<T> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let last: unknown;
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      await put(LOCK_PATH, token, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "text/plain",
        cacheControlMaxAge: 60,
      });
    } catch (error) {
      last = error;
      const message = error instanceof Error ? error.message : "";
      const contention = /exist|conflict|locked|precondition|etag/i.test(message);
      if (!contention && attempt >= 1) throw error;
      if (attempt === 6 || attempt === 14) await breakStaleLock().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
      continue;
    }
    try {
      return await fn();
    } finally {
      await del(LOCK_PATH).catch(() => undefined);
    }
  }
  const message = last instanceof Error ? last.message : "保存できませんでした";
  throw new Error(message.includes("混み合って") ? message : "サーバーが混み合っています。もう一度お試しください");
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
  return withBlobLock(async () => {
    const loaded = await loadBlob();
    const current = normalize(loaded.state, Date.now());
    const next = mutator(current);
    if (next === loaded.state) {
      remember(loaded.state, loaded.etag);
      return loaded.state;
    }
    const saved = { ...next, version: loaded.state.version + 1 };
    await saveBlob(saved);
    remember(saved, null);
    return saved;
  });
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

export async function readState(now = Date.now(), opts?: { fresh?: boolean }): Promise<QuizState> {
  assertStore();
  if (!opts?.fresh && cache && Date.now() - cache.at < CACHE_MS) {
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

function enqueueGuest<T>(roomId: string, uid: string, task: () => Promise<T>): Promise<T> {
  const key = `${roomId}:${uid}`;
  const prev = guestChains.get(key) ?? Promise.resolve();
  const run = prev.then(task, task);
  guestChains.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function safeUid(uid: string): string {
  const safe = uid.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  if (!safe) throw new Error("参加者を確認できません");
  return safe;
}

function guestBlobPath(roomId: string, uid: string): string {
  return `quiz/guests/${roomId}/${safeUid(uid)}.json`;
}

function parseGuest(text: string): GuestRecord | null {
  const data = JSON.parse(text) as { participant?: Participant; answers?: Answer[] };
  const participant = data?.participant;
  if (!participant || typeof participant.id !== "string" || typeof participant.nickname !== "string") return null;
  const answers = Array.isArray(data.answers)
    ? data.answers.filter((answer) => answer && answer.uid === participant.id && typeof answer.questionId === "string").slice(0, 40)
    : [];
  return { participant, answers };
}

async function readGuestBlob(pathname: string): Promise<GuestRecord | null> {
  const res = await get(pathname, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  const text = await new Response(res.stream).text();
  return parseGuest(text);
}

async function writeGuestBlob(roomId: string, participant: Participant, answers: Answer[]) {
  const pathname = guestBlobPath(roomId, participant.id);
  const body = JSON.stringify({ participant, answers });
  await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  const record = { participant, answers };
  if (guestListCache?.roomId === roomId) {
    guestListCache = {
      roomId,
      at: Date.now(),
      guests: [...guestListCache.guests.filter((guest) => guest.participant.id !== participant.id), record],
    };
  }
}

async function readAllGuests(roomId: string, fresh = false): Promise<GuestRecord[]> {
  if (!fresh && guestListCache && guestListCache.roomId === roomId && Date.now() - guestListCache.at < GUEST_LIST_MS) {
    return guestListCache.guests;
  }
  const prefix = `quiz/guests/${roomId}/`;
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (blob.pathname.endsWith(".json")) pathnames.push(blob.pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
    if (page.hasMore && !cursor) break;
  } while (cursor);
  const guests: GuestRecord[] = [];
  for (let i = 0; i < pathnames.length; i += 20) {
    const part = await Promise.all(
      pathnames.slice(i, i + 20).map(async (pathname) => {
        try {
          return await readGuestBlob(pathname);
        } catch (error) {
          console.error(error);
          return null;
        }
      }),
    );
    for (const guest of part) if (guest) guests.push(guest);
  }
  guestListCache = { roomId, at: Date.now(), guests };
  return guests;
}

async function readOwnGuest(roomId: string, uid: string): Promise<GuestRecord | null> {
  if (!uid) return null;
  try {
    return await readGuestBlob(guestBlobPath(roomId, uid));
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** 画面用。個人ファイルを部屋の状態へ重ね、発表後は得点を回答から計算し直す */
export async function withGuestBlobs(
  state: QuizState,
  roomId: string,
  scope: { view: "guest" | "host" | "screen" | "list"; uid: string },
): Promise<QuizState> {
  if (!usingBlob() || scope.view === "list" || !state.rooms[roomId]) return state;
  const room = state.rooms[roomId];
  const published = room.phase === "revealed" || room.phase === "finished";
  const needAll = scope.view !== "guest" || room.phase === "lobby" || published;
  let guests = needAll ? await readAllGuests(roomId) : [];
  if (scope.uid) {
    const mine = await readOwnGuest(roomId, scope.uid);
    guests = guests.filter((guest) => guest.participant.id !== scope.uid);
    if (mine) guests = [...guests, mine];
  }
  let next = overlayGuests(state, roomId, guests);
  if (published) next = rescoreIfPublished(next, roomId);
  return next;
}

const SNAPSHOT_OPS = new Set(["closeAnswers", "revealAll", "revealAnswer", "recalculateScores"]);

async function answerFast(action: Extract<Action, { op: "answer" }>, now: number): Promise<QuizState> {
  const roomId = cleanRoomId(action.roomId);
  return enqueueGuest(roomId, action.uid, async () => {
    const [state, own] = await Promise.all([readState(now, { fresh: true }), readOwnGuest(roomId, action.uid)]);
    const overlaid = overlayGuests(state, roomId, own ? [own] : []);
    const next = applyAction(overlaid, action, now);
    const room = next.rooms[roomId];
    const participant = room?.participants[action.uid];
    if (!participant) throw new Error("先に入室してください");
    const answers = Object.values(room.answers).filter((answer) => answer.uid === action.uid);
    await writeGuestBlob(roomId, participant, answers);
    return overlaid;
  });
}

async function joinFast(action: Extract<Action, { op: "join" }>, now: number): Promise<QuizState> {
  const roomId = cleanRoomId(action.roomId);
  return enqueueGuest(roomId, action.uid, async () => {
    const [state, own] = await Promise.all([readState(now, { fresh: true }), readOwnGuest(roomId, action.uid)]);
    const overlaid = overlayGuests(state, roomId, own ? [own] : []);
    const next = applyAction(overlaid, action, now);
    const participant = next.rooms[roomId]?.participants[action.uid];
    if (!participant) throw new Error("入室できませんでした");
    const answers = Object.values(next.rooms[roomId].answers).filter((answer) => answer.uid === action.uid);
    await writeGuestBlob(roomId, participant, answers);
    return overlaid;
  });
}

async function deleteGuestBlobs(action: Extract<Action, { op: "removeParticipant" | "resetRoom" }>) {
  const roomId = cleanRoomId(action.roomId);
  if (action.op === "removeParticipant") {
    await del(guestBlobPath(roomId, action.uid)).catch(() => undefined);
  } else {
    const prefix = `quiz/guests/${roomId}/`;
    const pathnames: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const blob of page.blobs) pathnames.push(blob.pathname);
      cursor = page.hasMore ? page.cursor : undefined;
      if (page.hasMore && !cursor) break;
    } while (cursor);
    if (pathnames.length) await del(pathnames).catch(() => undefined);
  }
  if (guestListCache?.roomId === roomId) guestListCache = null;
}

export async function runAction(action: Action, now = Date.now()): Promise<{ state: QuizState; createdRoomId?: string }> {
  if (usingBlob() && action.op === "answer") {
    const state = await answerFast(action, now);
    return { state };
  }
  if (usingBlob() && action.op === "join") {
    const state = await joinFast(action, now);
    return { state };
  }
  let createdRoomId: string | undefined;
  let snapshot: GuestRecord[] = [];
  if (usingBlob() && SNAPSHOT_OPS.has(action.op) && "roomId" in action && action.roomId) {
    try {
      snapshot = await readAllGuests(cleanRoomId(action.roomId), true);
    } catch (error) {
      console.error(error);
    }
  }
  const state = await commit((current) => {
    const before = new Set(Object.keys(current.rooms));
    const roomId = "roomId" in action && action.roomId ? action.roomId : "";
    const base = snapshot.length && roomId ? overlayGuests(current, cleanRoomId(roomId), snapshot) : current;
    const next = applyAction(base, action, now);
    if (action.op === "createRoom") {
      createdRoomId = Object.keys(next.rooms).find((id) => !before.has(id));
    }
    return next;
  });
  if (usingBlob() && (action.op === "removeParticipant" || action.op === "resetRoom")) {
    await deleteGuestBlobs(action);
  }
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
  guestChains.clear();
  guestListCache = null;
}
