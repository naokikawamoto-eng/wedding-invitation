"use client";

import { useState } from "react";
import { enqueueForUser } from "@/lib/answer-ui";
import { useServerClock } from "@/lib/hooks";
import { submitAnswer } from "@/lib/quiz";
import type { Answer, Participant, Question, Reveal, Room } from "@/lib/types";
import { CHOICE_LETTERS, CHOICE_STYLES } from "../choice";
import { Button, ErrorNote, inputClass } from "../ui";

export function AnswerArea({
  room,
  question,
  me,
  myAnswer,
  reveal,
}: {
  room: Room;
  question: Question;
  me: Participant;
  myAnswer: Answer | null;
  reveal: Reveal | null;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<unknown>();

  const now = useServerClock();
  const open =
    room.phase === "question" && !myAnswer && (room.questionEndsAt == null || now < room.questionEndsAt);
  const selected = myAnswer ? myAnswer.choice : picked;

  async function send(answer: { choice: number } | { text: string }) {
    setStatus("saving");
    setError(undefined);
    try {
      await enqueueForUser(`${room.id}:${me.id}`, () => submitAnswer(room, me.id, me.nickname, answer));
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(room.phase === "question" ? err : new Error("回答は締め切られました"));
    }
  }

  return (
    <div className="space-y-3">
      {question.type === "choice" ? (
        <ul className="space-y-3">
          {question.choices.map((choice, i) => {
            const isPicked = selected === i;
            const isAnswer = reveal?.correctChoice === i;
            return (
              <li key={i}>
                <button
                  disabled={!open || status === "saving"}
                  onClick={() => setPicked(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition active:scale-[0.98] ${
                    isPicked ? `${CHOICE_STYLES[i].picked} text-white shadow-lg` : `${CHOICE_STYLES[i].idle} bg-white`
                  } ${isAnswer ? "ring-4 ring-gold-300 ring-offset-2" : ""} ${reveal && !isAnswer && !isPicked ? "opacity-50" : ""}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${
                      isPicked ? "bg-white/25" : CHOICE_STYLES[i].badge
                    }`}
                  >
                    {CHOICE_LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">{choice}</span>
                  {isAnswer && <span className="text-2xl">⭕️</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : myAnswer ? (
        <div className="rounded-2xl border-2 border-blush-200 bg-white px-4 py-4 text-center text-lg font-bold">
          {myAnswer.text}
        </div>
      ) : (
        <input
          className={`${inputClass} text-lg`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!open || status === "saving"}
          maxLength={50}
          placeholder="回答を入力"
          enterKeyHint="send"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && text.trim()) send({ text });
          }}
        />
      )}

      <ErrorNote error={error} />
      {status === "saved" && open && (
        <p className="text-center text-xs text-ink-soft" aria-live="polite">
          保存しました
        </p>
      )}

      {open ? (
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          disabled={status === "saving" || (question.type === "choice" ? picked === null : !text.trim())}
          onClick={() => send(question.type === "choice" ? { choice: picked! } : { text })}
        >
          {status === "saving" ? "保存しています…" : status === "error" ? "もう一度保存する" : "この回答で決定"}
        </Button>
      ) : (
        !reveal && (
          <p className="rounded-full bg-white/80 py-3 text-center text-sm font-bold text-ink-soft">
            {myAnswer
              ? room.phase === "question"
                ? "回答しました！締め切りまでお待ちください"
                : "締め切りました。正解発表をお待ちください"
              : "回答は締め切られました"}
          </p>
        )
      )}
    </div>
  );
}
