"use client";

import { useState } from "react";
import { CHOICE_LETTERS, CHOICE_STYLES } from "@/components/choice";
import { EVENT_LABEL } from "@/lib/events";
import { useGuestPacket, useParticipants } from "@/lib/hooks";
import { rankParticipants } from "@/lib/scoring";
import { submitAnswer } from "@/lib/quiz";
import type { Participant, Reveal, Room } from "@/lib/types";
import { QuestionBody } from "../QuestionBody";
import { Ranking } from "../Ranking";
import { Card, Ornament, Title } from "../ui";

/** 一次会。全員が全問を自分のペースで答え、締め切りまで選び直せる */
export function SelfPlay({ room, me }: { room: Room; me: Participant }) {
  const packet = useGuestPacket(room.id);
  const participants = useParticipants(room.id).data ?? [];
  const ranked = rankParticipants(participants, false);
  const myRank = ranked.find((p) => p.id === me.id)?.rank;
  const answered = packet.myAnswers.filter((a) => a.choice != null).length;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-full bg-white/80 px-4 py-2 text-sm shadow-sm">
        <span className="min-w-0 truncate font-bold">
          {me.nickname}
          <span className="ml-2 font-normal text-ink-soft">· {EVENT_LABEL[room.event]}</span>
        </span>
        <span className="shrink-0 text-ink-soft">
          {room.phase === "revealed" || room.phase === "finished" ? (
            <>
              正解 <b className="text-lg text-blush-600">{me.score}</b>
              {myRank && (
                <>
                  <span className="mx-2">·</span>
                  <b className="text-lg text-gold-600">{myRank}</b> 位
                </>
              )}
            </>
          ) : (
            <>
              回答 <b className="text-lg text-blush-600">{answered}</b> / {room.totalQuestions || packet.questions.length}
            </>
          )}
        </span>
      </header>

      {room.phase === "lobby" && (
        <Card className="space-y-3 py-10 text-center">
          <div className="animate-float text-5xl" aria-hidden>
            💐
          </div>
          <Title sub={room.title}>Ready?</Title>
          <p className="font-bold">開始までお待ちください</p>
          <p className="text-sm text-ink-soft">始まったら全問を自分のペースで答えられます。締め切りまで選び直せます。</p>
        </Card>
      )}

      {room.phase !== "lobby" && (
        <div className="space-y-4">
          {room.phase === "question" && (
            <p className="rounded-2xl bg-white/80 px-4 py-3 text-center text-sm">
              全問に答えてください。締め切りまで回答は変えられます。
            </p>
          )}
          {room.phase === "closed" && (
            <p className="rounded-2xl bg-blush-100 px-4 py-3 text-center text-sm font-bold text-blush-600">
              締め切りました。正解発表をお待ちください。
            </p>
          )}
          {packet.questions.map((question, index) => (
            <SelfQuestion
              key={question.id}
              room={room}
              me={me}
              number={index + 1}
              total={packet.questions.length}
              questionId={question.id}
              text={question.text}
              choices={question.choices}
              selected={packet.myAnswers.find((a) => a.questionId === question.id)?.choice ?? null}
              sheet={packet.answerSheet?.find((s) => s.questionId === question.id) ?? null}
            />
          ))}
          {(room.phase === "revealed" || room.phase === "finished") && (
            <Card>
              <h2 className="mb-3 text-center font-bold">順位</h2>
              <Ranking participants={participants} highlightUid={me.id} limit={10} showTime={false} byTime={false} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function SelfQuestion({
  room,
  me,
  number,
  total,
  questionId,
  text,
  choices,
  selected,
  sheet,
}: {
  room: Room;
  me: Participant;
  number: number;
  total: number;
  questionId: string;
  text: string;
  choices: string[];
  selected: number | null;
  sheet: Reveal | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const open = room.phase === "question";

  async function pick(choice: number) {
    if (!open || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await submitAnswer(room, me.id, me.nickname, { choice }, questionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <QuestionBody question={{ text, imageUrl: null, type: "choice" }} number={number} total={total} />
      <ul className="space-y-2">
        {choices.map((choice, i) => {
          const picked = selected === i;
          const correct = sheet?.correctChoice === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!open || busy}
                onClick={() => pick(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-bold ${
                  picked ? `${CHOICE_STYLES[i].picked} text-white` : `${CHOICE_STYLES[i].idle} bg-white`
                } ${correct ? "ring-4 ring-gold-300 ring-offset-2" : ""}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${picked ? "bg-white/25" : CHOICE_STYLES[i].badge}`}>
                  {CHOICE_LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{choice}</span>
                {correct && <span>⭕️</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {open && selected != null && <p className="text-center text-xs text-ink-soft">保存しました。締め切りまで変更できます。</p>}
    </Card>
  );
}
