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

/**
 * 正解数の多い順。
 * byTime が true のときだけ、同点を回答時間の短さで分ける（二次会）。
 * false のときは正解数が同じなら同順位（一次会）。並び順のための参加時刻は順位に使わない。
 */
export function rankParticipants(participants: Participant[], byTime = true): Ranked[] {
  const sorted = [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (byTime && a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
    return (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
  });
  let rank = 0;
  return sorted.map((p, i) => {
    const prev = sorted[i - 1];
    const tied = !!prev && prev.score === p.score && (!byTime || prev.totalTimeMs === p.totalTimeMs);
    if (!tied) rank = i + 1;
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

/** まとめて発表用。分母は送信した人だけ。未送信の正解は数えない */
export function submittedCorrectRates(
  questions: Question[],
  keys: Map<string, AnswerKey>,
  answers: Answer[],
  participants: Participant[],
): { questionId: string; correct: number; submitted: number }[] {
  const submitted = new Set(participants.filter((person) => person.submitted).map((person) => person.id));
  return questions.map((question) => {
    const key = keys.get(question.id);
    let correct = 0;
    if (key) {
      for (const answer of answers) {
        if (answer.questionId !== question.id || !submitted.has(answer.uid)) continue;
        if (isCorrect(question.type, key, answer)) correct += 1;
      }
    }
    return { questionId: question.id, correct, submitted: submitted.size };
  });
}

export interface SubmissionRow {
  person: Participant;
  correct: number;
  submittedAt: number;
}

/** 主催者向け。発表前でも全問の正解数を数える。ゲストの得点や順位には使わない */
export function hostSubmissions(
  participants: Participant[],
  questions: Question[],
  keys: Map<string, AnswerKey>,
  answers: Answer[],
): { submitted: SubmissionRow[]; pending: Participant[] } {
  const submitted: SubmissionRow[] = [];
  const pending: Participant[] = [];
  for (const person of participants) {
    if (!person.submitted) {
      pending.push(person);
      continue;
    }
    let correct = 0;
    for (const question of questions) {
      const key = keys.get(question.id);
      const answer = answers.find((item) => item.uid === person.id && item.questionId === question.id);
      if (key && answer && isCorrect(question.type, key, answer)) correct += 1;
    }
    const latest = answers.reduce((max, item) => (item.uid === person.id && item.answeredAt ? Math.max(max, item.answeredAt) : max), 0);
    submitted.push({
      person,
      correct,
      submittedAt: typeof person.submittedAt === "number" ? person.submittedAt : latest || Number.POSITIVE_INFINITY,
    });
  }
  submitted.sort((a, b) => b.correct - a.correct || a.submittedAt - b.submittedAt || a.person.nickname.localeCompare(b.person.nickname, "ja"));
  pending.sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.nickname.localeCompare(b.nickname, "ja"));
  return { submitted, pending };
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`;
}
