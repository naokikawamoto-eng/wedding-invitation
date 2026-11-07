"use client";

import { useParams } from "next/navigation";
import { AnswerStats } from "@/components/AnswerStats";
import { CHOICE_LETTERS, CHOICE_STYLES } from "@/components/choice";
import { Countdown } from "@/components/Countdown";
import { JoinQR } from "@/components/JoinQR";
import { QuestionBody } from "@/components/QuestionBody";
import { Ranking } from "@/components/Ranking";
import { ErrorNote, Ornament, Spinner, Title } from "@/components/ui";
import { EVENT_LABEL } from "@/lib/events";
import { useScreen } from "@/lib/hooks";

/** 会場のプロジェクター用。合言葉は不要。未発表の正解はサーバーが渡さない */
export default function ScreenPage() {
  const roomId = useParams<{ roomId: string }>().roomId.toUpperCase();
  const screen = useScreen(roomId);
  if (screen.error) return <ErrorNote error={screen.error} />;
  if (screen.room === undefined) return <Spinner />;
  if (!screen.room) return <p className="py-20 text-center">ルーム「{roomId}」が見つかりません</p>;

  const room = screen.room;

  if (room.phase === "lobby") {
    return (
      <main className="grid min-h-dvh items-center gap-12 p-8 lg:grid-cols-2 lg:p-12">
        <div className="space-y-8 text-center">
          <Title sub={<span className="text-2xl">{EVENT_LABEL[room.event]}</span>}>
            <span className="text-6xl sm:text-7xl">Wedding Quiz</span>
          </Title>
          <p className="text-2xl font-bold">{room.title}</p>
          <Ornament />
          <JoinQR roomId={room.id} size={280} />
          <p className="text-2xl">
            ルームコード <b className="font-display text-5xl tracking-[0.2em] text-gold-600">{room.id}</b>
          </p>
          <p className="text-lg text-ink-soft">スマホのカメラで読み取って参加</p>
        </div>
        <div className="space-y-4">
          <p className="text-center text-3xl">
            参加者 <b className="text-6xl text-blush-600">{screen.participants.length}</b> 人
          </p>
          <ul className="flex max-h-[70vh] flex-wrap justify-center gap-2 overflow-y-auto">
            {screen.participants.map((p) => (
              <li key={p.id} className="animate-pop rounded-full bg-white/90 px-4 py-2 text-xl font-bold shadow">
                {p.nickname}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  if (room.mode === "self") {
    const showing = room.phase === "revealed" || room.phase === "finished";
    return (
      <main className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
        <Title sub={<span className="text-2xl">{room.title}</span>}>
          <span className="text-5xl sm:text-6xl">
            {room.phase === "question" ? "Answer" : room.phase === "closed" ? "Closed" : room.phase === "finished" ? "Results" : "Answers"}
          </span>
        </Title>
        <p className="text-center text-2xl font-bold">
          {room.phase === "question" && "回答受付中。締め切りまで選べます"}
          {room.phase === "closed" && "締め切りました"}
          {showing && room.phase !== "finished" && "正解発表"}
        </p>
        <div className="space-y-6">
          {screen.questions.map((question, index) => {
            const sheet = screen.answerSheet?.find((item) => item.questionId === question.id);
            const count = screen.progress.find((item) => item.questionId === question.id)?.answered ?? 0;
            return (
              <section key={question.id} className="rounded-3xl bg-white/80 p-6 shadow">
                <QuestionBody question={question} number={index + 1} total={screen.questions.length} />
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {question.choices.map((choice, i) => (
                    <li
                      key={i}
                      className={`rounded-2xl border-4 bg-white px-4 py-3 text-xl font-bold ${CHOICE_STYLES[i].idle} ${
                        sheet?.correctChoice === i ? "ring-4 ring-gold-300" : ""
                      }`}
                    >
                      {CHOICE_LETTERS[i]}. {choice}
                      {sheet?.correctChoice === i && <span className="ml-2 text-gold-600">正解</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-center text-lg">回答 {count} 人</p>
              </section>
            );
          })}
        </div>
        {room.phase === "finished" && <Ranking participants={screen.participants} limit={10} large showTime={false} byTime={false} />}
      </main>
    );
  }

  if (room.phase === "finished") {
    return (
      <main className="mx-auto max-w-4xl space-y-8 p-8 sm:p-12">
        <Title sub={<span className="text-2xl">{room.title}</span>}>
          <span className="text-6xl sm:text-7xl">Results</span>
        </Title>
        <Ornament />
        <Ranking participants={screen.participants} limit={10} large />
        {screen.participants.length > 10 && (
          <p className="text-center text-ink-soft">全 {screen.participants.length} 人中、上位10名を表示しています</p>
        )}
      </main>
    );
  }

  if (!screen.question) return <Spinner label="問題を準備しています…" />;
  const revealed = room.phase === "revealed";
  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col justify-center gap-8 p-6 sm:p-10">
      <p className="text-center text-sm font-bold text-ink-soft">{EVENT_LABEL[room.event]}</p>
      <QuestionBody question={screen.question} number={room.currentNumber} total={room.totalQuestions} large />
      {room.phase === "question" && <Countdown endsAt={room.questionEndsAt} large />}

      {revealed ? (
        <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white/85 p-8 shadow-xl">
          <AnswerStats question={screen.question} answerKey={screen.answerKey ?? undefined} answers={screen.answers} large />
        </div>
      ) : (
        <>
          {screen.question.type === "choice" && (
            <ul className="grid gap-4 md:grid-cols-2">
              {screen.question.choices.map((choice, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-4 rounded-3xl border-4 bg-white/90 px-6 py-5 text-2xl font-bold shadow sm:text-3xl ${CHOICE_STYLES[i].idle}`}
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
            {room.phase === "closed" ? <b className="text-blush-600">回答締め切り！</b> : <>回答受付中</>}
            <span className="ml-6">
              <b className="text-5xl text-blush-600">{screen.answeredCount}</b> / {screen.participants.length} 人
            </span>
          </p>
        </>
      )}
    </main>
  );
}
