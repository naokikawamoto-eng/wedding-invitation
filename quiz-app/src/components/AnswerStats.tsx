import { questionStats } from "@/lib/scoring";
import type { Answer, AnswerKey, Question } from "@/lib/types";
import { CHOICE_LETTERS, CHOICE_STYLES } from "./choice";

/** 問題ごとの集計：正解率と、選択肢（または記述回答）の分布 */
export function AnswerStats({
  question,
  answerKey,
  answers,
  showCorrect = true,
  large = false,
}: {
  question: Question;
  answerKey: AnswerKey | undefined;
  answers: Answer[];
  showCorrect?: boolean;
  large?: boolean;
}) {
  const stats = questionStats(question, answerKey, answers);
  const max = Math.max(1, ...stats.choiceCounts);
  return (
    <div className={large ? "space-y-4 text-2xl" : "space-y-3"}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span>
          回答 <b className="text-blush-600">{stats.total}</b> 人
        </span>
        {showCorrect && (
          <span>
            正解 <b className="text-blush-600">{stats.correct}</b> 人
            <b className={`ml-2 text-gold-600 ${large ? "text-4xl" : "text-xl"}`}>{Math.round(stats.rate * 100)}%</b>
          </span>
        )}
      </div>

      {question.type === "choice" ? (
        <ul className="space-y-2">
          {question.choices.map((choice, i) => {
            const correct = showCorrect && answerKey?.correctChoice === i;
            const count = stats.choiceCounts[i];
            return (
              <li key={i} className={`rounded-2xl p-2 ${correct ? "bg-gold-100 ring-2 ring-gold-300" : ""}`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${CHOICE_STYLES[i].badge}`}>
                    {CHOICE_LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{choice}</span>
                  {correct && <span className="text-sm font-bold text-gold-600">正解</span>}
                  <span className="font-bold">{count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-blush-50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${CHOICE_STYLES[i].bar}`}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-1">
          {stats.textGroups.slice(0, 12).map((g) => (
            <li
              key={g.label}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${showCorrect && g.correct ? "bg-gold-100 font-bold" : "bg-white/70"}`}
            >
              <span className="min-w-0 flex-1 truncate">{g.label}</span>
              {showCorrect && g.correct && <span className="text-sm text-gold-600">正解</span>}
              <span className="font-bold">{g.count}</span>
            </li>
          ))}
          {stats.textGroups.length > 12 && (
            <li className="px-3 text-sm text-ink-soft">ほか {stats.textGroups.length - 12} 種類</li>
          )}
          {!stats.total && <li className="text-sm text-ink-soft">まだ回答がありません</li>}
        </ul>
      )}
    </div>
  );
}
