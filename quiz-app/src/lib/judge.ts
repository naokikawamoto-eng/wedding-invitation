import type { Answer, AnswerKey, QuestionType } from "./types";

/**
 * 記述式の比較用に表記ゆれを最小限だけ吸収する。
 * 全角/半角（NFKC）・空白・英字の大文字小文字のみ。ひらがな/カタカナ等の違いは別解として登録する。
 */
export function normalizeText(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

export function isCorrect(
  type: QuestionType,
  key: AnswerKey,
  answer: Pick<Answer, "choice" | "text">,
): boolean {
  if (type === "choice") {
    return answer.choice !== null && answer.choice === key.correctChoice;
  }
  if (answer.text == null) return false;
  const given = normalizeText(answer.text);
  return given !== "" && key.correctTexts.some((t) => normalizeText(t) === given);
}

export function elapsedMs(answer: Pick<Answer, "startedAt" | "answeredAt">): number {
  if (!answer.answeredAt) return 0;
  return Math.max(0, answer.answeredAt - answer.startedAt);
}
