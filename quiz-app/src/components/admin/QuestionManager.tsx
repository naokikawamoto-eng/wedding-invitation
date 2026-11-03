"use client";

import { useState } from "react";
import { deleteQuestion, showQuestion, swapQuestionOrder } from "@/lib/quiz";
import type { AnswerKey, Question, Room } from "@/lib/types";
import { CHOICE_LETTERS } from "../choice";
import { Button, Card } from "../ui";
import { QuestionEditor } from "./QuestionEditor";

export function QuestionManager({
  room,
  questions,
  keys,
}: {
  room: Room;
  questions: Question[];
  keys: Map<string, AnswerKey>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const nextOrder = (questions.at(-1)?.order ?? 0) + 1;

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const key = keys.get(q.id);
        if (editing === q.id) {
          return (
            <QuestionEditor
              key={q.id}
              roomId={room.id}
              question={q}
              answerKey={key}
              nextOrder={nextOrder}
              onClose={() => setEditing(null)}
            />
          );
        }
        const live = room.currentQuestionId === q.id && room.phase !== "lobby";
        const revealed = room.revealedQuestionIds.includes(q.id);
        return (
          <Card key={q.id} className={`flex gap-4 p-4 ${live ? "ring-2 ring-blush-300" : ""}`}>
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-semibold italic text-gold-600">Q{i + 1}</span>
              <button
                disabled={i === 0}
                onClick={() => swapQuestionOrder(room.id, q, questions[i - 1])}
                className="text-ink-soft disabled:opacity-20"
                title="上へ"
              >
                ▲
              </button>
              <button
                disabled={i === questions.length - 1}
                onClick={() => swapQuestionOrder(room.id, q, questions[i + 1])}
                className="text-ink-soft disabled:opacity-20"
                title="下へ"
              >
                ▼
              </button>
            </div>
            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-gold-100 px-2 py-0.5 text-gold-600">
                  {q.type === "choice" ? "選択式" : "記述式"}
                </span>
                {live && <span className="rounded-full bg-blush-100 px-2 py-0.5 text-blush-600">出題中</span>}
                {revealed && <span className="rounded-full bg-sage-100 px-2 py-0.5 text-sage-600">発表済</span>}
              </div>
              <p className="line-clamp-2 font-bold">{q.text || "（画像のみ）"}</p>
              <p className="text-sm text-ink-soft">
                正解：
                {q.type === "choice"
                  ? key?.correctChoice != null
                    ? `${CHOICE_LETTERS[key.correctChoice]}. ${q.choices[key.correctChoice]}`
                    : "未設定"
                  : key?.correctTexts.join(" / ") || "未設定"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(q.id)}>
                編集
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={room.phase === "question"}
                onClick={() => {
                  if (confirm(`Q${i + 1} を今すぐ出題しますか？`)) showQuestion(room.id, questions, q.id);
                }}
              >
                出題
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={live}
                onClick={() => {
                  if (confirm(`Q${i + 1} を削除しますか？`)) deleteQuestion(room.id, q.id);
                }}
              >
                削除
              </Button>
            </div>
          </Card>
        );
      })}

      {editing === "new" ? (
        <QuestionEditor roomId={room.id} nextOrder={nextOrder} onClose={() => setEditing(null)} />
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setEditing("new")}>
          ＋ 問題を追加
        </Button>
      )}
    </div>
  );
}
