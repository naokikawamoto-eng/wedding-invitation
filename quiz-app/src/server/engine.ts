import { computeScores } from "../lib/scoring";
import type {
  Answer,
  AnswerKey,
  Participant,
  Question,
  QuestionDraft,
  QuizEvent,
  QuizMode,
  Reveal,
  Room,
  SyncBody,
} from "../lib/types";
import { isPrizeId } from "../lib/prizes";
import { PRESETS } from "./presets";

export interface RoomRecord extends Room {
  questions: Question[];
  keys: Record<string, AnswerKey>;
  participants: Record<string, Participant>;
  answers: Record<string, Answer>;
}

export interface QuizState {
  version: number;
  rooms: Record<string, RoomRecord>;
}

export type Action =
  | { op: "join"; roomId: string; uid: string; nickname: string; prizeWish?: string | null }
  | { op: "setPrizeWish"; roomId: string; uid: string; prizeWish: string }
  | { op: "answer"; roomId: string; uid: string; questionId?: string; choice?: number | null; text?: string | null }
  | { op: "createRoom"; title: string; event: QuizEvent; hostUid: string }
  | { op: "saveQuestion"; roomId: string; draft: QuestionDraft; order: number; questionId?: string }
  | { op: "deleteQuestion"; roomId: string; questionId: string }
  | { op: "swapQuestionOrder"; roomId: string; aId: string; bId: string }
  | { op: "showQuestion"; roomId: string; questionId: string }
  | { op: "openQuiz"; roomId: string }
  | { op: "closeAnswers"; roomId: string }
  | { op: "revealAll"; roomId: string }
  | { op: "advanceReveal"; roomId: string }
  | { op: "showStandings"; roomId: string }
  | { op: "revealAnswer"; roomId: string; questionId: string }
  | { op: "recalculateScores"; roomId: string }
  | { op: "finishQuiz"; roomId: string }
  | { op: "resetRoom"; roomId: string; removeParticipants: boolean }
  | { op: "removeParticipant"; roomId: string; uid: string }
  | { op: "setAnswerSeconds"; roomId: string; answerSeconds: number };

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(length = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export function emptyState(): QuizState {
  return { version: 0, rooms: {} };
}

export function publicRoom(room: RoomRecord): Room {
  return {
    id: room.id,
    title: room.title,
    event: room.event,
    mode: room.mode ?? (room.event === "reception" ? "self" : "paced"),
    hostUid: room.hostUid,
    phase: room.phase,
    currentQuestionId: room.currentQuestionId,
    currentNumber: room.currentNumber,
    totalQuestions: room.totalQuestions,
    questionStartedAt: room.questionStartedAt,
    questionEndsAt: room.questionEndsAt,
    answerSeconds: room.answerSeconds,
    revealedQuestionIds: room.revealedQuestionIds,
    reveal: room.reveal,
    createdAt: room.createdAt,
    presentIndex: room.presentIndex ?? null,
    presentAnswer: room.presentAnswer ?? false,
    presentStandings: room.presentStandings ?? false,
  };
}

function ordered(room: RoomRecord): Question[] {
  return [...room.questions].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function withoutWishes(people: Participant[], keepUid?: string): Participant[] {
  return people.map((person) => {
    if ((keepUid && person.id === keepUid) || !person.prizeWish) return person;
    const next = { ...person };
    delete next.prizeWish;
    return next;
  });
}

function publicQuestion(q: Question): Question {
  return { id: q.id, order: q.order, type: q.type, text: q.text, imageUrl: q.imageUrl, choices: q.choices };
}

function blankRoom(input: {
  id: string;
  title: string;
  event: QuizEvent;
  mode: QuizMode;
  hostUid: string;
  now: number;
  answerSeconds: number;
  questions?: Question[];
  keys?: Record<string, AnswerKey>;
}): RoomRecord {
  return {
    id: input.id,
    title: input.title,
    event: input.event,
    mode: input.mode,
    hostUid: input.hostUid,
    phase: "lobby",
    currentQuestionId: null,
    currentNumber: 0,
    totalQuestions: input.questions?.length ?? 0,
    questionStartedAt: null,
    questionEndsAt: null,
    answerSeconds: input.answerSeconds,
    revealedQuestionIds: [],
    reveal: null,
    createdAt: input.now,
    questions: input.questions ?? [],
    keys: input.keys ?? {},
    participants: {},
    answers: {},
  };
}

function buildPreset(preset: (typeof PRESETS)[number], now: number): RoomRecord {
  const questions: Question[] = preset.questions.map((q, i) => ({
    id: q.id,
    order: i + 1,
    type: q.type,
    text: q.text,
    imageUrl: null,
    choices: q.type === "choice" ? q.choices : [],
    ...(q.sample ? { sample: true } : {}),
  }));
  const keys: Record<string, AnswerKey> = {};
  for (const q of preset.questions) {
    keys[q.id] = {
      correctChoice: q.type === "choice" ? q.correctChoice : null,
      correctTexts: q.type === "text" ? q.correctTexts : [],
    };
  }
  return blankRoom({
    id: preset.id,
    title: preset.title,
    event: preset.event,
    mode: preset.event === "reception" ? "self" : "paced",
    hostUid: "preset",
    now,
    answerSeconds: preset.answerSeconds,
    questions,
    keys,
  });
}

/** 制限時間を過ぎた問題を締め切る。変化がなければ同じオブジェクトを返す */
export function tick(state: QuizState, now: number): QuizState {
  let rooms = state.rooms;
  let changed = false;
  for (const id of Object.keys(rooms)) {
    const room = rooms[id];
    if (room.phase === "question" && room.questionEndsAt != null && now >= room.questionEndsAt) {
      if (!changed) rooms = { ...rooms };
      rooms[id] = { ...room, phase: "closed" };
      changed = true;
    }
  }
  return changed ? { ...state, rooms } : state;
}

/** 固定の一次会・二次会ルームが消えていたら作り直す。中身は上書きしない */
export function ensurePresets(state: QuizState, now: number): QuizState {
  let rooms = state.rooms;
  let changed = false;
  for (const preset of PRESETS) {
    if (rooms[preset.id]) continue;
    if (!changed) rooms = { ...rooms };
    rooms[preset.id] = buildPreset(preset, now);
    changed = true;
  }
  return changed ? { ...state, rooms } : state;
}

/** 古い保存データに進行方式が無いときだけ補う。問題や回答は変えない */
function ensureModes(state: QuizState): QuizState {
  let rooms = state.rooms;
  let changed = false;
  for (const id of Object.keys(rooms)) {
    const room = rooms[id];
    if (room.mode) continue;
    if (!changed) rooms = { ...rooms };
    rooms[id] = { ...room, mode: room.event === "reception" ? "self" : "paced" };
    changed = true;
  }
  return changed ? { ...state, rooms } : state;
}

export function normalize(state: QuizState, now: number): QuizState {
  return tick(ensureModes(ensurePresets(state, now)), now);
}

function mustRoom(state: QuizState, roomId: string): RoomRecord {
  const room = state.rooms[cleanRoomId(roomId)];
  if (!room) throw new Error("ルームが見つかりません");
  return room;
}

export function cleanRoomId(id: string): string {
  const roomId = id.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(roomId)) throw new Error("ルームコードを確認してください");
  return roomId;
}

function updateRoom(state: QuizState, room: RoomRecord): QuizState {
  return { ...state, rooms: { ...state.rooms, [room.id]: room } };
}

/** 一次会だけ保存する。未指定なら今の希望を残す。二次会では保存しない */
function cleanPrizeWish(room: RoomRecord, value: string | null | undefined, current?: string | null): string | undefined {
  if (room.event !== "reception") return undefined;
  if (value == null || value === "") return current ?? undefined;
  if (!isPrizeId(value)) throw new Error("景品を選んでください");
  return value;
}

function cleanNickname(input: string): string {
  const nickname = input.replace(/\s+/g, " ").trim();
  if (nickname.length < 1 || nickname.length > 20) throw new Error("ニックネームは1〜20文字にしてください");
  return nickname;
}

function recompute(room: RoomRecord, revealedIds: string[]): RoomRecord {
  const scores = computeScores(
    room.questions,
    new Map(Object.entries(room.keys)),
    Object.values(room.answers),
    revealedIds,
  );
  const participants: Record<string, Participant> = {};
  for (const [id, p] of Object.entries(room.participants)) {
    const s = scores.get(id) ?? { score: 0, totalTimeMs: 0 };
    participants[id] = p.score === s.score && p.totalTimeMs === s.totalTimeMs ? p : { ...p, ...s };
  }
  return { ...room, participants, revealedQuestionIds: revealedIds };
}

/** 発表後の得点を、部屋ファイルと個人ファイルを重ねた回答から計算し直す。保存はしない */
export function rescoreIfPublished(state: QuizState, roomId: string): QuizState {
  const room = state.rooms[roomId];
  if (!room) return state;
  if (room.phase !== "revealed" && room.phase !== "finished") return state;
  const next = recompute(room, room.revealedQuestionIds);
  const same = Object.keys(room.participants).every((id) => {
    const prev = room.participants[id];
    const scored = next.participants[id];
    return !!scored && prev.score === scored.score && prev.totalTimeMs === scored.totalTimeMs;
  });
  if (same && Object.keys(next.participants).length === Object.keys(room.participants).length) return state;
  return updateRoom(state, next);
}

function validateDraft(draft: QuestionDraft): QuestionDraft {
  const text = (draft.text ?? "").trim();
  const imageUrl = draft.imageUrl?.trim() || null;
  if (!text && !imageUrl) throw new Error("問題文か画像を入力してください");
  if (text.length > 500) throw new Error("問題文が長すぎます");
  if (imageUrl && imageUrl.length > 500) throw new Error("画像 URL が長すぎます");
  if (draft.type === "choice") {
    const choices = (draft.choices ?? []).map((c) => c.trim());
    if (choices.length < 2 || choices.length > 4) throw new Error("選択肢は2〜4個にしてください");
    if (choices.some((c) => !c || c.length > 80)) throw new Error("選択肢を確認してください");
    if (draft.correctChoice == null || !Number.isInteger(draft.correctChoice) || draft.correctChoice < 0 || draft.correctChoice >= choices.length) {
      throw new Error("正解の選択肢を選んでください");
    }
    return { type: "choice", text, imageUrl, choices, correctChoice: draft.correctChoice, correctTexts: [], sample: draft.sample };
  }
  if (draft.type === "text") {
    const correctTexts = (draft.correctTexts ?? []).map((t) => t.trim()).filter(Boolean);
    if (!correctTexts.length || correctTexts.some((t) => t.length > 50)) throw new Error("正解テキストを入力してください");
    return { type: "text", text, imageUrl, choices: [], correctChoice: null, correctTexts, sample: draft.sample };
  }
  throw new Error("問題の形式が不正です");
}

export function applyAction(state: QuizState, action: Action, now: number): QuizState {
  state = normalize(state, now);
  switch (action.op) {
    case "join": {
      const room = mustRoom(state, action.roomId);
      const nickname = cleanNickname(action.nickname);
      if (!action.uid || action.uid.length > 80) throw new Error("参加者を確認できません");
      const existing = room.participants[action.uid];
      if (!existing && Object.keys(room.participants).length >= 400) throw new Error("参加者が上限に達しました");
      const prizeWish = cleanPrizeWish(room, action.prizeWish, existing?.prizeWish);
      const participant: Participant = existing
        ? { ...existing, nickname, ...(prizeWish ? { prizeWish } : {}) }
        : { id: action.uid, nickname, score: 0, totalTimeMs: 0, joinedAt: now, ...(prizeWish ? { prizeWish } : {}) };
      return updateRoom(state, { ...room, participants: { ...room.participants, [action.uid]: participant } });
    }
    case "setPrizeWish": {
      const room = mustRoom(state, action.roomId);
      if (room.event !== "reception") throw new Error("景品の選択は一次会だけです");
      const participant = room.participants[action.uid];
      if (!participant) throw new Error("先に入室してください");
      if (!isPrizeId(action.prizeWish)) throw new Error("景品を選んでください");
      if (participant.prizeWish === action.prizeWish) return state;
      return updateRoom(state, {
        ...room,
        participants: { ...room.participants, [action.uid]: { ...participant, prizeWish: action.prizeWish } },
      });
    }
    case "answer": {
      const room = mustRoom(state, action.roomId);
      if (room.phase !== "question" || room.questionStartedAt == null) {
        throw new Error(room.phase === "lobby" ? "まだ回答は始まっていません" : "回答は締め切られました");
      }
      const questionId = room.mode === "self" ? action.questionId : room.currentQuestionId;
      const question = room.questions.find((q) => q.id === questionId);
      if (!question) throw new Error(room.mode === "self" ? "問題を選んでください" : "問題が見つかりません");
      const participant = room.participants[action.uid];
      if (!participant) throw new Error("先に入室してください");
      const id = `${question.id}_${action.uid}`;
      const previous = room.answers[id];
      if (previous && room.mode !== "self") throw new Error("すでに回答済みです");
      let choice: number | null = null;
      let text: string | null = null;
      if (question.type === "choice") {
        if (typeof action.choice !== "number" || !Number.isInteger(action.choice) || action.choice < 0 || action.choice >= question.choices.length) {
          throw new Error("選択肢を選んでください");
        }
        choice = action.choice;
      } else {
        const value = (action.text ?? "").trim();
        if (!value || value.length > 50) throw new Error("回答は1〜50文字にしてください");
        text = value;
      }
      const answer: Answer = {
        id,
        questionId: question.id,
        uid: action.uid,
        nickname: participant.nickname,
        choice,
        text,
        startedAt: previous?.startedAt ?? room.questionStartedAt,
        answeredAt: now,
      };
      return updateRoom(state, { ...room, answers: { ...room.answers, [id]: answer } });
    }
    case "createRoom": {
      const title = action.title.trim();
      if (!title || title.length > 40) throw new Error("ルーム名は1〜40文字にしてください");
      if (action.event !== "reception" && action.event !== "afterparty") throw new Error("区分を選んでください");
      let id = "";
      for (let i = 0; i < 5; i++) {
        const candidate = randomCode();
        if (!state.rooms[candidate]) {
          id = candidate;
          break;
        }
      }
      if (!id) throw new Error("ルームコードを作れませんでした。もう一度お試しください");
      return updateRoom(
        state,
        blankRoom({
          id,
          title,
          event: action.event,
          mode: action.event === "reception" ? "self" : "paced",
          hostUid: action.hostUid || "host",
          now,
          answerSeconds: action.event === "reception" ? 0 : 30,
        }),
      );
    }
    case "saveQuestion": {
      const room = mustRoom(state, action.roomId);
      const draft = validateDraft(action.draft);
      const id = action.questionId ?? `q_${randomCode(8).toLowerCase()}`;
      const previous = room.questions.find((q) => q.id === id);
      const question: Question = {
        id,
        order: previous?.order ?? action.order,
        type: draft.type,
        text: draft.text,
        imageUrl: draft.imageUrl,
        choices: draft.type === "choice" ? draft.choices : [],
        ...(draft.sample ? { sample: true } : {}),
      };
      const questions = previous ? room.questions.map((q) => (q.id === id ? question : q)) : [...room.questions, question];
      const key: AnswerKey = {
        correctChoice: draft.type === "choice" ? draft.correctChoice : null,
        correctTexts: draft.type === "text" ? draft.correctTexts : [],
      };
      let next: RoomRecord = { ...room, questions, keys: { ...room.keys, [id]: key }, totalQuestions: questions.length };
      if (next.revealedQuestionIds.includes(id)) next = recompute(next, next.revealedQuestionIds);
      return updateRoom(state, next);
    }
    case "deleteQuestion": {
      const room = mustRoom(state, action.roomId);
      const questions = room.questions.filter((q) => q.id !== action.questionId);
      const keys = { ...room.keys };
      delete keys[action.questionId];
      const answers: Record<string, Answer> = {};
      for (const [id, answer] of Object.entries(room.answers)) {
        if (answer.questionId !== action.questionId) answers[id] = answer;
      }
      const revealedQuestionIds = room.revealedQuestionIds.filter((id) => id !== action.questionId);
      let next: RoomRecord = { ...room, questions, keys, answers, totalQuestions: questions.length };
      next = recompute(next, revealedQuestionIds);
      if (next.currentQuestionId === action.questionId) {
        next = { ...next, currentQuestionId: null, phase: next.phase === "lobby" || next.phase === "finished" ? next.phase : "lobby" };
      }
      return updateRoom(state, next);
    }
    case "swapQuestionOrder": {
      const room = mustRoom(state, action.roomId);
      const a = room.questions.find((q) => q.id === action.aId);
      const b = room.questions.find((q) => q.id === action.bId);
      if (!a || !b) throw new Error("問題が見つかりません");
      const questions = room.questions.map((q) => {
        if (q.id === a.id) return { ...q, order: b.order };
        if (q.id === b.id) return { ...q, order: a.order };
        return q;
      });
      return updateRoom(state, { ...room, questions });
    }
    case "openQuiz": {
      const room = mustRoom(state, action.roomId);
      if (room.mode !== "self") throw new Error("このルームは1問ずつの進行です");
      if (!room.questions.length) throw new Error("問題がありません");
      return updateRoom(state, {
        ...room,
        phase: "question",
        currentQuestionId: null,
        currentNumber: 0,
        totalQuestions: room.questions.length,
        questionStartedAt: now,
        questionEndsAt: null,
        reveal: null,
      });
    }
    case "showQuestion": {
      const room = mustRoom(state, action.roomId);
      if (room.mode === "self") throw new Error("一次会は全問をまとめて開始します");
      const questions = ordered(room);
      const index = questions.findIndex((q) => q.id === action.questionId);
      if (index < 0) throw new Error("問題が見つかりません");
      return updateRoom(state, {
        ...room,
        phase: "question",
        currentQuestionId: action.questionId,
        currentNumber: index + 1,
        totalQuestions: questions.length,
        questionStartedAt: now,
        questionEndsAt: room.answerSeconds > 0 ? now + room.answerSeconds * 1000 : null,
        reveal: null,
        presentStandings: false,
      });
    }
    case "closeAnswers": {
      const room = mustRoom(state, action.roomId);
      if (room.phase !== "question") throw new Error("いまは締め切れません");
      return updateRoom(state, { ...room, phase: "closed" });
    }
    case "revealAll": {
      const room = mustRoom(state, action.roomId);
      if (room.mode !== "self") throw new Error("このルームは1問ずつ発表します");
      const revealedIds = ordered(room).map((q) => q.id);
      const scored = recompute(room, revealedIds);
      return updateRoom(state, {
        ...scored,
        phase: "revealed",
        revealedQuestionIds: revealedIds,
        reveal: null,
        presentIndex: 0,
        presentAnswer: false,
        presentStandings: false,
      });
    }
    case "advanceReveal": {
      const room = mustRoom(state, action.roomId);
      if (room.mode !== "self") throw new Error("このルームは1問ずつ発表します");
      if (room.phase !== "revealed") throw new Error("答え合わせ中だけ進められます");
      const questions = ordered(room);
      const index = room.presentIndex ?? 0;
      if (!room.presentAnswer) {
        if (!questions[index]) throw new Error("問題が見つかりません");
        return updateRoom(state, { ...room, presentIndex: index, presentAnswer: true, presentStandings: false });
      }
      if (index + 1 < questions.length) {
        return updateRoom(state, { ...room, presentIndex: index + 1, presentAnswer: false, presentStandings: false });
      }
      throw new Error("最後の問題です。最終順位を発表してください");
    }
    case "showStandings": {
      const room = mustRoom(state, action.roomId);
      if (room.mode === "self") throw new Error("一次会の順位は、答え合わせの最後に出します");
      if (room.phase !== "revealed") throw new Error("正解を発表してから順位を出してください");
      return updateRoom(state, { ...room, presentStandings: true });
    }
    case "revealAnswer": {
      const room = mustRoom(state, action.roomId);
      const question = room.questions.find((q) => q.id === action.questionId);
      const key = room.keys[action.questionId];
      if (!question || !key) throw new Error("問題または正解が見つかりません");
      const revealedIds = room.revealedQuestionIds.includes(action.questionId)
        ? room.revealedQuestionIds
        : [...room.revealedQuestionIds, action.questionId];
      const scored = recompute(room, revealedIds);
      return updateRoom(state, {
        ...scored,
        phase: "revealed",
        reveal: { questionId: action.questionId, type: question.type, ...key },
        presentStandings: false,
      });
    }
    case "recalculateScores": {
      const room = mustRoom(state, action.roomId);
      return updateRoom(state, recompute(room, room.revealedQuestionIds));
    }
    case "finishQuiz": {
      const room = mustRoom(state, action.roomId);
      return updateRoom(state, { ...room, phase: "finished", presentStandings: false });
    }
    case "resetRoom": {
      const room = mustRoom(state, action.roomId);
      const participants = action.removeParticipants
        ? {}
        : Object.fromEntries(
            Object.entries(room.participants).map(([id, p]) => [id, { ...p, score: 0, totalTimeMs: 0 }]),
          );
      return updateRoom(state, {
        ...room,
        phase: "lobby",
        currentQuestionId: null,
        currentNumber: 0,
        questionStartedAt: null,
        questionEndsAt: null,
        revealedQuestionIds: [],
        reveal: null,
        presentIndex: null,
        presentAnswer: false,
        presentStandings: false,
        answers: {},
        participants,
      });
    }
    case "removeParticipant": {
      const room = mustRoom(state, action.roomId);
      const participants = { ...room.participants };
      delete participants[action.uid];
      const answers: Record<string, Answer> = {};
      for (const [id, answer] of Object.entries(room.answers)) {
        if (answer.uid !== action.uid) answers[id] = answer;
      }
      return updateRoom(state, recompute({ ...room, participants, answers }, room.revealedQuestionIds));
    }
    case "setAnswerSeconds": {
      const room = mustRoom(state, action.roomId);
      const answerSeconds = Math.round(action.answerSeconds);
      if (!Number.isInteger(answerSeconds) || answerSeconds < 0 || answerSeconds > 180) {
        throw new Error("制限時間は0〜180秒にしてください");
      }
      return updateRoom(state, { ...room, answerSeconds });
    }
    default:
      throw new Error("操作を確認してください");
  }
}

function withoutReveal(room: Room): Room {
  return room.phase === "revealed" ? room : { ...room, reveal: null };
}

/** スクリーンとゲストに正解を出してよい問題。一次会は「次へ」で増える */
function publicAnswerIds(room: RoomRecord): Set<string> {
  if (room.mode !== "self") return new Set();
  if (room.phase === "finished") return new Set(room.revealedQuestionIds);
  if (room.phase !== "revealed") return new Set();
  const list = ordered(room);
  const index = room.presentIndex ?? 0;
  const ids = list.slice(0, Math.max(0, index)).map((q) => q.id);
  if (room.presentAnswer && list[index]) ids.push(list[index].id);
  return new Set(ids);
}

function choiceCountsFor(room: RoomRecord, questionId: string): number[] {
  const question = room.questions.find((q) => q.id === questionId);
  if (!question || question.type !== "choice") return [];
  const counts = question.choices.map(() => 0);
  for (const answer of Object.values(room.answers)) {
    if (answer.questionId !== questionId || typeof answer.choice !== "number") continue;
    if (answer.choice >= 0 && answer.choice < counts.length) counts[answer.choice] += 1;
  }
  return counts;
}

/** 自分のペースモードで、すでに公開した問題の正解だけを渡す */
function answerSheet(room: RoomRecord): Reveal[] | null {
  if (room.mode !== "self") return null;
  if (room.phase !== "revealed" && room.phase !== "finished") return null;
  const ids = publicAnswerIds(room);
  if (!ids.size) return null;
  return ordered(room)
    .filter((q) => ids.has(q.id) && room.keys[q.id])
    .map((q) => ({ questionId: q.id, type: q.type, ...room.keys[q.id] }));
}

/** 画面ごとの見える範囲。ゲストとスクリーンには未発表の正解を渡さない */
export function project(
  state: QuizState,
  query: { view: "guest" | "screen" | "host" | "list"; roomId?: string; uid?: string },
  now: number,
): SyncBody {
  const base = { serverNow: now, version: state.version };
  if (query.view === "list") {
    const rooms = Object.values(state.rooms)
      .map((room) => ({ ...publicRoom(room), reveal: null }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return { ...base, rooms };
  }
  const record = query.roomId ? state.rooms[query.roomId] : undefined;
  if (!record) return { ...base, room: null };
  const room = publicRoom(record);

  if (query.view === "guest" && record.mode === "self") {
    const uid = query.uid ?? "";
    const open = room.phase !== "lobby";
    return {
      ...base,
      room: withoutReveal(room),
      questions: open ? ordered(record).map(publicQuestion) : [],
      question: null,
      participants: withoutWishes(Object.values(record.participants), uid),
      me: record.participants[uid] ?? null,
      myAnswers: open ? Object.values(record.answers).filter((a) => a.uid === uid) : [],
      answerSheet: answerSheet(record),
    };
  }

  if (query.view === "guest") {
    const active = room.phase === "question" || room.phase === "closed" || room.phase === "revealed";
    const found = active ? record.questions.find((q) => q.id === room.currentQuestionId) ?? null : null;
    const uid = query.uid ?? "";
    return {
      ...base,
      room: withoutReveal(room),
      question: found ? publicQuestion(found) : null,
      participants: withoutWishes(Object.values(record.participants), uid),
      me: record.participants[uid] ?? null,
      myAnswer: found ? record.answers[`${found.id}_${uid}`] ?? null : null,
    };
  }

  if (query.view === "screen" && record.mode === "self") {
    const open = room.phase !== "lobby";
    const questions = open ? ordered(record) : [];
    const presenting = room.phase === "revealed" ? questions[room.presentIndex ?? 0] ?? null : null;
    const shown = publicAnswerIds(record);
    return {
      ...base,
      room: withoutReveal(room),
      questions: questions.map(publicQuestion),
      question: presenting ? publicQuestion(presenting) : null,
      participants: withoutWishes(Object.values(record.participants)),
      progress: questions.map((q) => ({
        questionId: q.id,
        answered: Object.values(record.answers).filter((a) => a.questionId === q.id).length,
      })),
      answerSheet: answerSheet(record),
      choiceCounts: presenting && shown.has(presenting.id) ? choiceCountsFor(record, presenting.id) : undefined,
      answeredCount: new Set(Object.values(record.answers).map((a) => a.uid)).size,
    };
  }

  if (query.view === "screen") {
    const found = record.questions.find((q) => q.id === room.currentQuestionId) ?? null;
    const currentAnswers = Object.values(record.answers).filter((a) => a.questionId === room.currentQuestionId);
    const revealed = room.phase === "revealed";
    const answers =
      !found || (found.type === "text" && !revealed)
        ? []
        : currentAnswers.map((a) => ({ ...a, text: revealed ? a.text : null }));
    return {
      ...base,
      room: withoutReveal(room),
      question: found ? publicQuestion(found) : null,
      participants: withoutWishes(Object.values(record.participants)),
      answers,
      answerKey: revealed && found ? record.keys[found.id] ?? null : null,
      answeredCount: currentAnswers.length,
    };
  }

  return {
    ...base,
    room,
    questions: ordered(record),
    keys: record.keys,
    answers: Object.values(record.answers),
    participants: Object.values(record.participants),
    question: record.questions.find((q) => q.id === room.currentQuestionId) ?? null,
    answeredCount: Object.values(record.answers).filter((a) => a.questionId === room.currentQuestionId).length,
  };
}
