import type { Question, QuestionDraft, QuizEvent, Room } from "./types";
import { postAction } from "./transport";

export type { QuestionDraft };

export async function createRoom(title: string, hostUid: string, event: QuizEvent = "afterparty"): Promise<string> {
  const { roomId } = await postAction({ op: "createRoom", title, event, hostUid }, true);
  if (!roomId) throw new Error("ルームを作れませんでした");
  return roomId;
}

export async function joinRoom(roomId: string, uid: string, nickname: string) {
  await postAction({ op: "join", roomId, uid, nickname });
}

export async function submitAnswer(
  room: Room,
  uid: string,
  _nickname: string,
  answer: { choice: number } | { text: string },
  questionId?: string,
) {
  await postAction({
    op: "answer",
    roomId: room.id,
    uid,
    questionId,
    choice: "choice" in answer ? answer.choice : null,
    text: "text" in answer ? answer.text : null,
  });
}

export async function openQuiz(roomId: string) {
  await postAction({ op: "openQuiz", roomId }, true);
}

export async function revealAll(roomId: string) {
  await postAction({ op: "revealAll", roomId }, true);
}

export async function saveQuestion(roomId: string, draft: QuestionDraft, order: number, questionId?: string) {
  await postAction({ op: "saveQuestion", roomId, draft, order, questionId }, true);
}

export async function deleteQuestion(roomId: string, questionId: string) {
  await postAction({ op: "deleteQuestion", roomId, questionId }, true);
}

export async function swapQuestionOrder(roomId: string, a: Question, b: Question) {
  await postAction({ op: "swapQuestionOrder", roomId, aId: a.id, bId: b.id }, true);
}

export async function showQuestion(roomId: string, _questions: Question[], questionId: string) {
  await postAction({ op: "showQuestion", roomId, questionId }, true);
}

export async function closeAnswers(roomId: string) {
  await postAction({ op: "closeAnswers", roomId }, true);
}

export async function revealAnswer(roomId: string, questionId: string) {
  await postAction({ op: "revealAnswer", roomId, questionId }, true);
}

export async function recalculateScores(roomId: string) {
  await postAction({ op: "recalculateScores", roomId }, true);
}

export async function finishQuiz(roomId: string) {
  await postAction({ op: "finishQuiz", roomId }, true);
}

export async function resetRoom(roomId: string, removeParticipants: boolean) {
  await postAction({ op: "resetRoom", roomId, removeParticipants }, true);
}

export async function removeParticipant(roomId: string, uid: string) {
  await postAction({ op: "removeParticipant", roomId, uid }, true);
}

export async function setAnswerSeconds(roomId: string, answerSeconds: number) {
  await postAction({ op: "setAnswerSeconds", roomId, answerSeconds }, true);
}
