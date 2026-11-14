"use client";

import { useMemo } from "react";
import { EVENT_LABEL } from "@/lib/events";
import { useMyAnswer, useParticipants, useQuestion } from "@/lib/hooks";
import { isCorrect } from "@/lib/judge";
import { rankParticipants } from "@/lib/scoring";
import type { Participant, Room } from "@/lib/types";
import { Countdown } from "../Countdown";
import { QuestionBody } from "../QuestionBody";
import { Ranking } from "../Ranking";
import { Card, Ornament, Spinner, Title } from "../ui";
import { AnswerArea } from "./AnswerArea";
import { SelfPlay } from "./SelfPlay";

export function PlayerGame({ room, me }: { room: Room; me: Participant }) {
  const participants = useParticipants(room.id).data ?? [];
  const byTime = room.mode !== "self";
  const ranked = useMemo(() => rankParticipants(participants, byTime), [participants, byTime]);
  const myRank = ranked.find((p) => p.id === me.id)?.rank;

  if (room.mode === "self") return <SelfPlay room={room} me={me} />;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-full bg-white/80 px-4 py-2 text-sm shadow-sm">
        <span className="min-w-0 truncate font-bold">
          {me.nickname}
          <span className="ml-2 font-normal text-ink-soft">· {EVENT_LABEL[room.event]}</span>
        </span>
        <span className="shrink-0 text-ink-soft">
          正解 <b className="text-lg text-blush-600">{me.score}</b>
          {room.revealedQuestionIds.length > 0 && myRank && (
            <>
              <span className="mx-2">·</span>
              <b className="text-lg text-gold-600">{myRank}</b> 位 / {ranked.length}人
            </>
          )}
        </span>
      </header>

      {room.phase === "lobby" && <Lobby room={room} count={participants.length} />}
      {room.phase === "finished" && <FinalResult me={me} rank={myRank} participants={participants} />}
      {(room.phase === "question" || room.phase === "closed" || room.phase === "revealed") && (
        <QuestionStage room={room} me={me} />
      )}
    </div>
  );
}

function Lobby({ room, count }: { room: Room; count: number }) {
  return (
    <Card className="space-y-4 py-12 text-center">
      <div className="animate-float text-5xl" aria-hidden>
        🥂
      </div>
      <Title sub={room.title}>Ready?</Title>
      <p className="font-bold">まもなくクイズが始まります</p>
      <p className="text-sm text-ink-soft">現在 {count} 人が参加中</p>
    </Card>
  );
}

function QuestionStage({ room, me }: { room: Room; me: Participant }) {
  const question = useQuestion(room.id, room.currentQuestionId);
  const myAnswer = useMyAnswer(room.id, room.currentQuestionId, me.id);
  if (question.data === undefined || myAnswer.data === undefined) return <Spinner />;
  if (!question.data) return <Spinner label="問題を準備しています…" />;

  const reveal = room.phase === "revealed" && room.reveal?.questionId === question.data.id ? room.reveal : null;
  const correct = reveal && myAnswer.data ? isCorrect(reveal.type, reveal, myAnswer.data) : false;

  return (
    <div className="space-y-4">
      {room.phase === "question" && <Countdown endsAt={room.questionEndsAt} />}
      <Card>
        <QuestionBody question={question.data} number={room.currentNumber} total={room.totalQuestions} />
      </Card>

      {reveal && (
        <div
          className={`animate-pop rounded-3xl p-5 text-center text-white shadow-lg ${
            correct ? "bg-gradient-to-r from-gold-400 to-blush-400" : "bg-ink-soft"
          }`}
        >
          <p className="text-3xl font-bold">{correct ? "正解！🎉" : myAnswer.data ? "残念…" : "未回答"}</p>
          {reveal.type === "text" && (
            <p className="mt-2 text-sm">
              正解：<b className="text-base">{reveal.correctTexts.join(" / ")}</b>
            </p>
          )}
        </div>
      )}

      <AnswerArea
        key={question.data.id}
        room={room}
        question={question.data}
        me={me}
        myAnswer={myAnswer.data}
        reveal={reveal}
      />
    </div>
  );
}

function FinalResult({ me, rank, participants }: { me: Participant; rank?: number; participants: Participant[] }) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3 py-8 text-center">
        <p className="text-sm text-ink-soft">クイズ終了！あなたの順位は</p>
        <p className="animate-pop font-display text-7xl font-semibold italic text-gold-600">
          {rank ?? "-"}
          <span className="text-3xl"> 位</span>
        </p>
        <p>
          正解数 <b className="text-2xl text-blush-600">{me.score}</b> 問
        </p>
        <Ornament />
        <p className="text-sm text-ink-soft">ご参加ありがとうございました 💐</p>
      </Card>
      <Card>
        <h2 className="mb-3 text-center font-bold">最終ランキング</h2>
        <Ranking participants={participants} highlightUid={me.id} limit={10} showTime={false} />
      </Card>
    </div>
  );
}
