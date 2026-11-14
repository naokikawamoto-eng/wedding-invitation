/** lobby → question（回答受付中）→ closed（締切）→ revealed（正解発表）→ … → finished */
export type Phase = "lobby" | "question" | "closed" | "revealed" | "finished";
export type QuestionType = "choice" | "text";
/** reception = 一次会（披露宴） / afterparty = 二次会 */
export type QuizEvent = "reception" | "afterparty";
/** paced = 司会が1問ずつ出す（二次会） / self = 各自のペースで全問（一次会） */
export type QuizMode = "paced" | "self";

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
  event: QuizEvent;
  mode: QuizMode;
  hostUid: string;
  phase: Phase;
  currentQuestionId: string | null;
  /** 参加者には問題一覧を見せないので「第何問 / 全何問」はここに持つ */
  currentNumber: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  /** この時刻を過ぎたらサーバーが回答を締め切る。null は無制限 */
  questionEndsAt: number | null;
  /** 次に出す問題の制限時間（秒）。0 は無制限 */
  answerSeconds: number;
  revealedQuestionIds: string[];
  reveal: Reveal | null;
  createdAt: number | null;
  /**
   * 一次会の答え合わせで、スクリーンに出している問題（0始まり）。
   * 未設定や null は、まだ答え合わせの画面に入っていない。
   */
  presentIndex?: number | null;
  /** いま出している問題の正解を、スクリーンとゲストに出してよいか */
  presentAnswer?: boolean;
  /** 二次会で、正解のあとに途中順位を出しているか */
  presentStandings?: boolean;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  choices: string[];
  /** 招待状の公開情報から入れた仮問題。主催者が保存し直すと外れる */
  sample?: boolean;
}

export interface Participant {
  id: string;
  nickname: string;
  score: number;
  /** 正解した問題の回答時間の合計。同点のときは短い人が上位 */
  totalTimeMs: number;
  joinedAt: number | null;
  /** 一次会で希望した景品。未設定は未選択。順位には使わない */
  prizeWish?: string | null;
}

export interface Answer {
  id: string;
  questionId: string;
  uid: string;
  nickname: string;
  choice: number | null;
  text: string | null;
  startedAt: number;
  answeredAt: number | null;
}

export interface QuestionDraft {
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  choices: string[];
  correctChoice: number | null;
  correctTexts: string[];
  sample?: boolean;
}

/** ポーリングで受け取る画面用のスナップショット。閲覧者ごとに中身が違う */
export interface SyncBody {
  serverNow: number;
  version: number;
  room?: Room | null;
  rooms?: Room[];
  question?: Question | null;
  questions?: Question[];
  keys?: Record<string, AnswerKey>;
  answers?: Answer[];
  answerKey?: AnswerKey | null;
  participants?: Participant[];
  me?: Participant | null;
  myAnswer?: Answer | null;
  /** 自分のペースモードでの、自分の全回答 */
  myAnswers?: Answer[];
  /** 正解発表後だけ入る。発表前は null */
  answerSheet?: Reveal[] | null;
  /** 自分のペースモードの、問題ごとの回答人数 */
  progress?: { questionId: string; answered: number }[];
  answeredCount?: number;
  /** 正解を出したあとの、選択肢ごとの人数。出す前は付けない */
  choiceCounts?: number[];
}
