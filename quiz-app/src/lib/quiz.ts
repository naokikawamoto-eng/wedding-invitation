import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { computeScores } from "./scoring";
import type { Answer, AnswerKey, Participant, Question, QuestionType, Room } from "./types";

// ── パス ────────────────────────────────────────────────

export const roomRef = (roomId: string) => doc(db(), "rooms", roomId);
export const questionsCol = (roomId: string) => collection(db(), "rooms", roomId, "questions");
export const answerKeysCol = (roomId: string) => collection(db(), "rooms", roomId, "answerKeys");
export const participantsCol = (roomId: string) => collection(db(), "rooms", roomId, "participants");
export const answersCol = (roomId: string) => collection(db(), "rooms", roomId, "answers");
export const answerId = (questionId: string, uid: string) => `${questionId}_${uid}`;

export function fromDoc<T>(snap: DocumentSnapshot): T {
  return { id: snap.id, ...snap.data({ serverTimestamps: "estimate" }) } as T;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O・1/I など紛らわしい文字は除外

export function randomCode(length = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

/** 500 件制限があるので、書き込みを分割してコミットする。最後の 1 件は最後のバッチに入る */
async function commitInChunks(ops: ((b: WriteBatch) => void)[], size = 450) {
  for (let i = 0; i < ops.length; i += size) {
    const batch = writeBatch(db());
    ops.slice(i, i + size).forEach((op) => op(batch));
    await batch.commit();
  }
}

// ── ルーム ──────────────────────────────────────────────

export async function createRoom(title: string, hostUid: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomCode();
    if ((await getDoc(roomRef(id))).exists()) continue;
    await setDoc(roomRef(id), {
      title,
      hostUid,
      phase: "lobby",
      currentQuestionId: null,
      currentNumber: 0,
      totalQuestions: 0,
      questionStartedAt: null,
      revealedQuestionIds: [],
      reveal: null,
      createdAt: serverTimestamp(),
    } satisfies Omit<Room, "id" | "createdAt" | "questionStartedAt"> & Record<string, unknown>);
    return id;
  }
  throw new Error("ルームコードを作れませんでした。もう一度お試しください");
}

// ── 参加者 ──────────────────────────────────────────────

export async function joinRoom(roomId: string, uid: string, nickname: string) {
  const ref = doc(participantsCol(roomId), uid);
  if ((await getDoc(ref)).exists()) {
    await updateDoc(ref, { nickname });
  } else {
    await setDoc(ref, { nickname, score: 0, totalTimeMs: 0, joinedAt: serverTimestamp() });
  }
}

export async function submitAnswer(
  room: Room,
  uid: string,
  nickname: string,
  answer: { choice: number } | { text: string },
) {
  if (!room.currentQuestionId || !room.questionStartedAt) throw new Error("いまは回答できません");
  // 締切判定・二重回答の禁止・時刻の記録はセキュリティルール側で強制している
  await setDoc(doc(answersCol(room.id), answerId(room.currentQuestionId, uid)), {
    questionId: room.currentQuestionId,
    uid,
    nickname,
    choice: "choice" in answer ? answer.choice : null,
    text: "text" in answer ? answer.text.trim() : null,
    startedAt: room.questionStartedAt,
    answeredAt: serverTimestamp(),
  });
}

// ── 問題の作成・編集 ─────────────────────────────────────

export interface QuestionDraft {
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  choices: string[];
  correctChoice: number | null;
  correctTexts: string[];
}

export async function saveQuestion(roomId: string, draft: QuestionDraft, order: number, questionId?: string) {
  const qRef = questionId ? doc(questionsCol(roomId), questionId) : doc(questionsCol(roomId));
  const isChoice = draft.type === "choice";
  const batch = writeBatch(db());
  batch.set(qRef, {
    order,
    type: draft.type,
    text: draft.text.trim(),
    imageUrl: draft.imageUrl || null,
    choices: isChoice ? draft.choices.map((c) => c.trim()) : [],
  } satisfies Omit<Question, "id">);
  batch.set(doc(answerKeysCol(roomId), qRef.id), {
    correctChoice: isChoice ? draft.correctChoice : null,
    correctTexts: isChoice ? [] : draft.correctTexts.map((t) => t.trim()).filter(Boolean),
  } satisfies AnswerKey);
  await batch.commit();
  return qRef.id;
}

export async function deleteQuestion(roomId: string, questionId: string) {
  const batch = writeBatch(db());
  batch.delete(doc(questionsCol(roomId), questionId));
  batch.delete(doc(answerKeysCol(roomId), questionId));
  await batch.commit();
}

export async function swapQuestionOrder(roomId: string, a: Question, b: Question) {
  const batch = writeBatch(db());
  batch.update(doc(questionsCol(roomId), a.id), { order: b.order });
  batch.update(doc(questionsCol(roomId), b.id), { order: a.order });
  await batch.commit();
}

// ── 進行コントロール ─────────────────────────────────────

/** 「次の問題を表示する」。参加者の画面はこの更新を購読して切り替わる */
export async function showQuestion(roomId: string, questions: Question[], questionId: string) {
  await updateDoc(roomRef(roomId), {
    phase: "question",
    currentQuestionId: questionId,
    currentNumber: questions.findIndex((q) => q.id === questionId) + 1,
    totalQuestions: questions.length,
    questionStartedAt: serverTimestamp(),
    reveal: null,
  });
}

/** 「回答を締め切る」。以降の回答はセキュリティルールで拒否される */
export async function closeAnswers(roomId: string) {
  await updateDoc(roomRef(roomId), { phase: "closed" });
}

async function loadAnswerKeys(roomId: string) {
  const [qSnap, kSnap] = await Promise.all([
    getDocs(query(questionsCol(roomId), orderBy("order"))),
    getDocs(answerKeysCol(roomId)),
  ]);
  return {
    questions: qSnap.docs.map((d) => fromDoc<Question>(d)),
    keys: new Map(kSnap.docs.map((d) => [d.id, d.data() as AnswerKey])),
  };
}

/** 全参加者の得点を再計算して書き込む。extra はスコアと同じ最後のバッチで書く追加更新 */
async function syncScores(roomId: string, revealedIds: string[], extra?: (b: WriteBatch) => void) {
  const [{ questions, keys }, aSnap, pSnap] = await Promise.all([
    loadAnswerKeys(roomId),
    getDocs(answersCol(roomId)),
    getDocs(participantsCol(roomId)),
  ]);
  const scores = computeScores(questions, keys, aSnap.docs.map((d) => fromDoc<Answer>(d)), revealedIds);
  const ops: ((b: WriteBatch) => void)[] = [];
  for (const d of pSnap.docs) {
    const p = d.data() as Participant;
    const s = scores.get(d.id) ?? { score: 0, totalTimeMs: 0 };
    if (p.score !== s.score || p.totalTimeMs !== s.totalTimeMs) ops.push((b) => b.update(d.ref, { ...s }));
  }
  if (extra) ops.push(extra);
  await commitInChunks(ops);
  return { questions, keys };
}

/** 「正解を発表する」。採点してランキングを更新し、正解を参加者に公開する */
export async function revealAnswer(roomId: string, questionId: string) {
  const room = fromDoc<Room>(await getDoc(roomRef(roomId)));
  const revealedIds = room.revealedQuestionIds.includes(questionId)
    ? room.revealedQuestionIds
    : [...room.revealedQuestionIds, questionId];
  const { questions, keys } = await loadAnswerKeys(roomId);
  const question = questions.find((q) => q.id === questionId);
  const key = keys.get(questionId);
  if (!question || !key) throw new Error("問題または正解が見つかりません");
  await syncScores(roomId, revealedIds, (b) =>
    b.update(roomRef(roomId), {
      phase: "revealed",
      revealedQuestionIds: revealedIds,
      reveal: { questionId, type: question.type, ...key },
    }),
  );
}

/** 正解を後から直したときなどに、発表済みの問題で得点を付け直す */
export async function recalculateScores(roomId: string) {
  const room = fromDoc<Room>(await getDoc(roomRef(roomId)));
  await syncScores(roomId, room.revealedQuestionIds);
}

export async function finishQuiz(roomId: string) {
  await updateDoc(roomRef(roomId), { phase: "finished" });
}

/** リハーサル後などに、回答と得点を消してロビーに戻す */
export async function resetRoom(roomId: string, removeParticipants: boolean) {
  const [aSnap, pSnap] = await Promise.all([getDocs(answersCol(roomId)), getDocs(participantsCol(roomId))]);
  const ops: ((b: WriteBatch) => void)[] = [
    ...aSnap.docs.map((d) => (b: WriteBatch) => b.delete(d.ref)),
    ...pSnap.docs.map((d) => (b: WriteBatch) =>
      removeParticipants ? b.delete(d.ref) : b.update(d.ref, { score: 0, totalTimeMs: 0 }),
    ),
    (b) =>
      b.update(roomRef(roomId), {
        phase: "lobby",
        currentQuestionId: null,
        currentNumber: 0,
        questionStartedAt: null,
        revealedQuestionIds: [],
        reveal: null,
      }),
  ];
  await commitInChunks(ops);
}

export async function removeParticipant(roomId: string, uid: string) {
  const batch = writeBatch(db());
  batch.delete(doc(participantsCol(roomId), uid));
  await batch.commit();
}
