"use client";

import { useParams } from "next/navigation";
import { AdminGate } from "@/components/admin/AdminGate";
import { AnswerStats } from "@/components/AnswerStats";
import { CHOICE_LETTERS, CHOICE_STYLES } from "@/components/choice";
import { JoinQR } from "@/components/JoinQR";
import { QuestionBody } from "@/components/QuestionBody";
import { Ranking } from "@/components/Ranking";
import { Ornament, Spinner, Title } from "@/components/ui";
import { useHostData, useRoom } from "@/lib/hooks";
import type { Room } from "@/lib/types";

/** 会場のプロジェクター用。主催者 PC で開き、全画面（F11 / ⌃⌘F）にして使う */
export default function ScreenPage() {
  const roomId = useParams<{ roomId: string }>().roomId.toUpperCase();
  const room = useRoom(roomId);
  return (
    <AdminGate>
      {() => (room.data ? <Screen room={room.data} /> : <Spinner />)}
    </AdminGate>
  );
}

function Screen({ room }: { room: Room }) {
  const { questions, keys, answers, participants } = useHostData(room.id);
  const current = questions.find((q) => q.id === room.currentQuestionId);
  const answered = answers.filter((a) => a.questionId === room.currentQuestionId).length;

  if (room.phase === "lobby") {
    return (
      <main className="grid min-h-dvh items-center gap-12 p-12 lg:grid-cols-2">
        <div className="space-y-8 text-center">
          <Title sub={<span className="text-2xl">{room.title}</span>}>
            <span className="text-7xl">Wedding Quiz</span>
          </Title>
          <Ornament />
          <JoinQR roomId={room.id} size={320} />
          <p className="text-2xl">
            ルームコード <b className="font-display text-5xl tracking-[0.3em] text-gold-600">{room.id}</b>
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-center text-3xl">
            参加者 <b className="text-6xl text-blush-600">{participants.length}</b> 人
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {participants.map((p) => (
              <li key={p.id} className="animate-pop rounded-full bg-white/90 px-4 py-2 text-xl font-bold shadow">
                {p.nickname}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  if (room.phase === "finished") {
    return (
      <main className="mx-auto max-w-4xl space-y-8 p-12">
        <Title sub={<span className="text-2xl">{room.title}</span>}>
          <span className="text-7xl">Results</span>
        </Title>
        <Ornament />
        <Ranking participants={participants} limit={10} large />
      </main>
    );
  }

  if (!current) return <Spinner />;
  const revealed = room.phase === "revealed";
  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col justify-center gap-8 p-10">
      <QuestionBody question={current} number={room.currentNumber} total={room.totalQuestions} large />

      {revealed ? (
        <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white/85 p-8 shadow-xl">
          <AnswerStats question={current} answerKey={keys.get(current.id)} answers={answers} large />
        </div>
      ) : (
        <>
          {current.type === "choice" && (
            <ul className="grid gap-4 md:grid-cols-2">
              {current.choices.map((choice, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-4 rounded-3xl border-4 bg-white/90 px-6 py-5 text-3xl font-bold shadow ${CHOICE_STYLES[i].idle}`}
                >
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-white ${CHOICE_STYLES[i].badge}`}>
                    {CHOICE_LETTERS[i]}
                  </span>
                  {choice}
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-3xl">
            {room.phase === "closed" ? (
              <b className="text-blush-600">回答締め切り！</b>
            ) : (
              <>回答受付中</>
            )}
            <span className="ml-6">
              <b className="text-5xl text-blush-600">{answered}</b> / {participants.length} 人
            </span>
          </p>
        </>
      )}
    </main>
  );
}
