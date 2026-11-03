import { elapsedMs, isCorrect, normalizeText } from "./judge";
import type { Answer, AnswerKey, Participant, Question } from "./types";

export interface Score {
  score: number;
  totalTimeMs: number;
}

/**
 * 発表済みの問題と全回答から、参加者ごとの得点を毎回ゼロから計算する。
 * 何度実行しても同じ結果になるので、ボタンの二度押しや正解の修正後の再計算でもずれない。
 */
export function computeScores(
  questions: Question[],
  keys: Map<string, AnswerKey>,
  answers: Answer[],
  revealedIds: string[],
): Map<string, Score> {
  const revealed = new Set(revealedIds);
  const types = new Map(questions.map((q) => [q.id, q.type]));
  const scores = new Map<string, Score>();
  for (const a of answers) {
    const type = types.get(a.questionId);
    const key = keys.get(a.questionId);
    if (!revealed.has(a.questionId) || !type || !key || !isCorrect(type, key, a)) continue;
    const s = scores.get(a.uid) ?? { score: 0, totalTimeMs: 0 };
    s.score += 1;
    s.totalTimeMs += elapsedMs(a);
    scores.set(a.uid, s);
  }
  return scores;
}

export interface Ranked extends Participant {
  rank: number;
}

/** 正解数の多い順、同点なら回答時間の合計が短い順。完全に同じなら同順位 */
export function rankParticipants(participants: Participant[]): Ranked[] {
  const sorted = [...participants].sort(
    (a, b) =>
      b.score - a.score ||
      a.totalTimeMs - b.totalTimeMs ||
      (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0),
  );
  let rank = 0;
  return sorted.map((p, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.score !== p.score || prev.totalTimeMs !== p.totalTimeMs) rank = i + 1;
    return { ...p, rank };
  });
}

export interface QuestionStats {
  total: number;
  correct: number;
  rate: number;
  /** 選択式：選択肢ごとの回答数 */
  choiceCounts: number[];
  /** 記述式：表記をそろえた回答ごとの件数（多い順） */
  textGroups: { label: string; count: number; correct: boolean }[];
}

export function questionStats(q: Question, key: AnswerKey | undefined, answers: Answer[]): QuestionStats {
  const list = answers.filter((a) => a.questionId === q.id);
  const correct = key ? list.filter((a) => isCorrect(q.type, key, a)).length : 0;
  const choiceCounts = q.choices.map((_, i) => list.filter((a) => a.choice === i).length);
  const groups = new Map<string, { label: string; count: number; correct: boolean }>();
  if (q.type === "text") {
    for (const a of list) {
      const norm = normalizeText(a.text ?? "");
      const g = groups.get(norm) ?? {
        label: a.text?.trim() || "（空欄）",
        count: 0,
        correct: !!key && isCorrect("text", key, a),
      };
      g.count += 1;
      groups.set(norm, g);
    }
  }
  return {
    total: list.length,
    correct,
    rate: list.length ? correct / list.length : 0,
    choiceCounts,
    textGroups: [...groups.values()].sort((a, b) => b.count - a.count),
  };
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`;
}
