import type { Timestamp } from "firebase/firestore";

/** lobby → question（回答受付中）→ closed（締切）→ revealed（正解発表）→ … → finished */
export type Phase = "lobby" | "question" | "closed" | "revealed" | "finished";
export type QuestionType = "choice" | "text";

export interface AnswerKey {
  /** 選択式の正解（choices の添字） */
  correctChoice: number | null;
  /** 記述式の正解（別解を含めて複数可） */
  correctTexts: string[];
}

export interface Reveal extends AnswerKey {
  questionId: string;
  type: QuestionType;
}

export interface Room {
  id: string;
  title: string;
  hostUid: string;
  phase: Phase;
  currentQuestionId: string | null;
  /** 参加者には問題一覧を見せないので「第何問 / 全何問」はここに持つ */
  currentNumber: number;
  totalQuestions: number;
  questionStartedAt: Timestamp | null;
  revealedQuestionIds: string[];
  reveal: Reveal | null;
  createdAt: Timestamp | null;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  choices: string[];
}

export interface Participant {
  id: string;
  nickname: string;
  score: number;
  /** 正解した問題の回答時間の合計。同点のときは短い人が上位 */
  totalTimeMs: number;
  joinedAt: Timestamp | null;
}

export interface Answer {
  id: string;
  questionId: string;
  uid: string;
  nickname: string;
  choice: number | null;
  text: string | null;
  startedAt: Timestamp;
  answeredAt: Timestamp | null;
}
