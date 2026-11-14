"use client";

import type { ReactNode } from "react";
import { JoinQR } from "@/components/JoinQR";
import { PrizeIntro } from "@/components/player/Prizes";
import { CHOICE_LETTERS, CHOICE_STYLES } from "@/components/choice";
import { useServerClock } from "@/lib/hooks";
import { rankParticipants } from "@/lib/scoring";
import type { Answer, AnswerKey, Participant, Question, Reveal, Room } from "@/lib/types";

export function Projector({
  room,
  participants,
  questions,
  question,
  progress,
  answerSheet,
  choiceCounts,
  answeredCount,
  answerKey,
  answers,
}: {
  room: Room;
  participants: Participant[];
  questions: Question[];
  question: Question | null;
  progress: { questionId: string; answered: number }[];
  answerSheet: Reveal[] | null;
  choiceCounts?: number[];
  answeredCount: number;
  answerKey: AnswerKey | null;
  answers: Answer[];
}) {
  if (room.phase === "lobby") return <Welcome room={room} participants={participants} />;
  if (room.mode === "self" && (room.phase === "question" || room.phase === "closed")) {
    return <SelfBoard room={room} participants={participants} questions={questions} progress={progress} answeredCount={answeredCount} />;
  }
  if (room.phase === "finished" || (room.mode !== "self" && room.presentStandings)) {
    return <RankStage room={room} participants={participants} final={room.phase === "finished"} />;
  }
  if (room.mode === "self") {
    const current = question ?? questions[room.presentIndex ?? 0] ?? null;
    const sheet = answerSheet?.find((item) => item.questionId === current?.id) ?? null;
    if (!current) return <Welcome room={room} participants={participants} />;
    return (
      <QuestionStage
        room={room}
        question={current}
        number={(room.presentIndex ?? 0) + 1}
        total={questions.length || room.totalQuestions}
        revealed={!!sheet}
        correctChoice={sheet?.correctChoice ?? null}
        counts={choiceCounts}
        participants={participants.length}
        answeredCount={progress.find((item) => item.questionId === current.id)?.answered ?? 0}
      />
    );
  }
  if (!question) return <Welcome room={room} participants={participants} />;
  const revealed = room.phase === "revealed";
  return (
    <QuestionStage
      room={room}
      question={question}
      number={room.currentNumber}
      total={room.totalQuestions}
      revealed={revealed}
      correctChoice={revealed ? answerKey?.correctChoice ?? null : null}
      counts={revealed ? countsFrom(question, answers) : undefined}
      participants={participants.length}
      answeredCount={answeredCount}
      endsAt={room.phase === "question" ? room.questionEndsAt : null}
      closed={room.phase === "closed"}
    />
  );
}

function Welcome({ room, participants }: { room: Room; participants: Participant[] }) {
  return (
    <Stage>
      <div className="grid h-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <p className="font-display text-5xl italic text-gold-600 sm:text-7xl">Wedding Quiz</p>
          <p className="text-2xl font-bold sm:text-4xl">{room.title}</p>
          <p className="text-lg text-ink-soft sm:text-2xl">{room.mode === "self" ? "着席のあと、スマホでご参加ください" : "まもなく始まります"}</p>
          <JoinQR roomId={room.id} size={280} large />
          {room.event === "reception" && <PrizeIntro compact />}
        </div>
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-6">
          <p className="text-center text-2xl sm:text-3xl">
            参加者
            <b className="mx-3 text-7xl font-bold tabular-nums text-blush-600 sm:text-8xl">{participants.length}</b>
            人
          </p>
          <ul className="flex max-h-[46vh] flex-wrap content-start justify-center gap-3 overflow-y-auto">
            {participants.map((person) => (
              <li key={person.id} className="animate-pop rounded-full bg-white/90 px-5 py-2 text-xl font-bold shadow sm:text-2xl">
                {person.nickname}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Stage>
  );
}

function SelfBoard({
  room,
  participants,
  questions,
  progress,
  answeredCount,
}: {
  room: Room;
  participants: Participant[];
  questions: Question[];
  progress: { questionId: string; answered: number }[];
  answeredCount: number;
}) {
  const closed = room.phase === "closed";
  const people = Math.max(participants.length, 1);
  return (
    <Stage>
      <div className="grid h-full items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="font-display text-4xl italic text-gold-600 sm:text-6xl">{closed ? "Closed" : "Now Answering"}</p>
          <p className={`text-3xl font-bold sm:text-5xl ${closed ? "text-blush-600" : ""}`}>{closed ? "締め切りました" : "回答受付中"}</p>
          <p className="text-lg text-ink-soft sm:text-2xl">{closed ? "答え合わせまで、そのままお待ちください" : "締め切りまで、回答は変えられます"}</p>
          <JoinQR roomId={room.id} size={220} large />
          <PrizeIntro compact />
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <Figure label="参加者" value={participants.length} />
            <Figure label="回答した人" value={answeredCount} />
          </div>
          <ul className="space-y-3">
            {questions.map((q, index) => {
              const count = progress.find((item) => item.questionId === q.id)?.answered ?? 0;
              return (
                <li key={q.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4">
                  <span className="font-display text-3xl text-gold-600 sm:text-4xl">Q{index + 1}</span>
                  <span className="h-4 overflow-hidden rounded-full bg-white/80">
                    <span className="block h-full rounded-full bg-blush-400" style={{ width: `${Math.min(100, (count / people) * 100)}%` }} />
                  </span>
                  <span className="w-24 text-right text-xl font-bold sm:text-2xl">
                    {count}
                    <span className="text-ink-soft">/{participants.length}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Stage>
  );
}

function QuestionStage({
  room,
  question,
  number,
  total,
  revealed,
  correctChoice,
  counts,
  participants,
  answeredCount,
  endsAt,
  closed,
}: {
  room: Room;
  question: Question;
  number: number;
  total: number;
  revealed: boolean;
  correctChoice: number | null;
  counts?: number[];
  participants: number;
  answeredCount?: number;
  endsAt?: number | null;
  closed?: boolean;
}) {
  const totalAnswers = counts?.reduce((sum, count) => sum + count, 0) ?? answeredCount ?? 0;
  const correctCount = revealed && correctChoice != null ? counts?.[correctChoice] ?? 0 : null;
  return (
    <Stage>
      <div className="flex h-full flex-col gap-4">
        <header className="flex items-end justify-between gap-4">
          <p className="font-display text-4xl italic text-gold-600 sm:text-6xl">
            Q{number}
            <span className="text-[0.55em] text-gold-400"> / {total}</span>
          </p>
          {room.mode === "self" ? (
            <p className="text-xl font-bold text-ink-soft sm:text-3xl">{revealed ? "正解発表" : "問題"}</p>
          ) : endsAt ? (
            <HugeCountdown endsAt={endsAt} />
          ) : (
            <p className="text-3xl font-bold text-blush-600 sm:text-5xl">{closed ? "締め切り" : revealed ? "正解" : "回答受付中"}</p>
          )}
        </header>
        <h1 className="text-center text-[clamp(1.7rem,3.3vw,3.6rem)] font-bold leading-snug">{question.text}</h1>
        {revealed && correctChoice != null && (
          <p className="text-center text-3xl font-bold text-gold-600 sm:text-5xl">正解は {CHOICE_LETTERS[correctChoice]}</p>
        )}
        {question.type === "choice" ? (
          <ul className="grid flex-1 content-center gap-4 sm:grid-cols-2">
            {question.choices.map((choice, index) => {
              const correct = revealed && correctChoice === index;
              const count = counts?.[index] ?? 0;
              const pct = totalAnswers ? Math.round((count / totalAnswers) * 100) : 0;
              return (
                <li
                  key={index}
                  className={`flex items-center gap-4 rounded-[1.6rem] border-4 bg-white/90 px-5 py-4 shadow ${CHOICE_STYLES[index].idle} ${
                    correct ? "animate-pop scale-[1.02] bg-gold-100 ring-4 ring-gold-300" : revealed ? "opacity-70" : ""
                  }`}
                >
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl font-bold text-white sm:h-16 sm:w-16 sm:text-3xl ${CHOICE_STYLES[index].badge}`}>
                    {CHOICE_LETTERS[index]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[clamp(1.35rem,2.4vw,2.6rem)] font-bold leading-tight">{choice}</span>
                    {revealed && counts && (
                      <span className="mt-2 block">
                        <span className="mb-1 flex justify-between text-lg font-bold sm:text-2xl">
                          <span>{count} 人</span>
                          <span>{pct}%</span>
                        </span>
                        <span className="block h-3 overflow-hidden rounded-full bg-blush-50">
                          <span className={`block h-full rounded-full ${CHOICE_STYLES[index].bar}`} style={{ width: `${pct}%` }} />
                        </span>
                      </span>
                    )}
                  </span>
                  {correct && <span className="shrink-0 text-3xl font-bold text-gold-600 sm:text-5xl">正解</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-3xl">{revealed ? "正解を発表しました" : "記述で回答中"}</p>
        )}
        <footer className="flex items-end justify-between text-2xl sm:text-4xl">
          <p>
            {revealed ? "正解した人" : closed ? "締め切り" : "回答"}
            {revealed && correctCount != null ? (
              <b className="mx-2 text-6xl font-bold tabular-nums text-gold-600 sm:text-7xl">{correctCount}</b>
            ) : (
              <b className="mx-2 text-6xl font-bold tabular-nums text-blush-600 sm:text-7xl">{totalAnswers}</b>
            )}
            <span className="text-ink-soft">/ {participants} 人</span>
          </p>
          {!revealed && room.mode === "self" && <p className="text-xl text-ink-soft sm:text-3xl">正解は、このあと</p>}
        </footer>
      </div>
    </Stage>
  );
}

function RankStage({ room, participants, final }: { room: Room; participants: Participant[]; final: boolean }) {
  const byTime = room.mode !== "self";
  const ranked = rankParticipants(participants, byTime);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3, 10);
  const tied = ranked.some((person, index) => index > 0 && person.rank === ranked[index - 1].rank);
  return (
    <Stage>
      <div className="flex h-full flex-col gap-6">
        <header className="text-center">
          <p className="font-display text-5xl italic text-gold-600 sm:text-7xl">{final ? "Final Ranking" : "Standings"}</p>
          <p className="mt-2 text-2xl font-bold sm:text-4xl">{final ? "最終順位" : "ここまでの順位"}</p>
          {room.mode === "self" && <p className="mt-2 text-lg text-ink-soft sm:text-2xl">正解数が同じなら、同順位です</p>}
        </header>
        <ol className="grid flex-1 content-center gap-4 sm:grid-cols-3">
          {top.map((person) => (
            <li key={person.id} className="animate-pop rounded-[1.8rem] bg-white/90 px-4 py-6 text-center shadow-lg">
              <p className="text-6xl font-bold tabular-nums text-gold-600 sm:text-8xl">{person.rank}</p>
              <p className="mt-2 truncate text-3xl font-bold sm:text-4xl">{person.nickname}</p>
              <p className="mt-2 text-2xl">
                <b className="text-4xl text-blush-600 sm:text-5xl">{person.score}</b> 問
              </p>
            </li>
          ))}
        </ol>
        {rest.length > 0 && (
          <ol className="grid gap-2 sm:grid-cols-2">
            {rest.map((person) => (
              <li key={person.id} className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-2 text-xl sm:text-2xl">
                <span className="w-10 text-3xl font-bold tabular-nums text-gold-600">{person.rank}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{person.nickname}</span>
                <span className="font-bold text-blush-600">{person.score} 問</span>
              </li>
            ))}
          </ol>
        )}
        {tied && room.mode === "self" && <p className="text-center text-xl text-ink-soft">同じ数字は同順位です</p>}
      </div>
    </Stage>
  );
}

function HugeCountdown({ endsAt }: { endsAt: number }) {
  const now = useServerClock();
  const remain = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const urgent = remain <= 5;
  return (
    <p className={`text-center font-bold leading-none tabular-nums ${urgent ? "text-blush-600" : "text-gold-600"} text-7xl sm:text-9xl`}>
      {remain}
      <span className="ml-2 text-[0.35em]">秒</span>
    </p>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.6rem] bg-white/85 px-4 py-5 shadow">
      <p className="text-lg text-ink-soft sm:text-2xl">{label}</p>
      <p className="text-6xl font-bold tabular-nums text-blush-600 sm:text-7xl">{value}</p>
    </div>
  );
}

function Stage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto box-border flex min-h-dvh w-full max-w-[1600px] flex-col px-4 py-5 sm:px-8 sm:py-7 lg:h-dvh lg:overflow-hidden lg:px-10">
      {children}
    </main>
  );
}

function countsFrom(question: Question, answers: Answer[]): number[] {
  const counts = question.choices.map(() => 0);
  for (const answer of answers) {
    if (typeof answer.choice === "number" && answer.choice >= 0 && answer.choice < counts.length) counts[answer.choice] += 1;
  }
  return counts;
}
