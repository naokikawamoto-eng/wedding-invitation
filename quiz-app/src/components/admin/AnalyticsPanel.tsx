import type { Answer, AnswerKey, Question, Room } from "@/lib/types";
import { AnswerStats } from "../AnswerStats";
import { Card } from "../ui";

export function AnalyticsPanel({
  room,
  questions,
  keys,
  answers,
}: {
  room: Room;
  questions: Question[];
  keys: Map<string, AnswerKey>;
  answers: Answer[];
}) {
  const asked = questions.filter((q) => answers.some((a) => a.questionId === q.id) || room.currentQuestionId === q.id);
  if (!asked.length) return <p className="py-10 text-center text-ink-soft">出題するとここに集計が表示されます</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {asked.map((q) => (
        <Card key={q.id} className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold italic text-gold-600">
              Q{questions.indexOf(q) + 1}
            </span>
            <p className="line-clamp-2 font-bold">{q.text || "（画像のみ）"}</p>
          </div>
          <AnswerStats question={q} answerKey={keys.get(q.id)} answers={answers} />
        </Card>
      ))}
    </div>
  );
}
