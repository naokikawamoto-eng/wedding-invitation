"use client";

import { useRef, useState } from "react";
import { PrizeIntro } from "@/components/player/Prizes";
import { CHOICE_LETTERS, CHOICE_STYLES } from "@/components/choice";
import { enqueueForUser, visibleChoice, type LocalPick } from "@/lib/answer-ui";
import { EVENT_LABEL } from "@/lib/events";
import { useGuestPacket, useParticipants } from "@/lib/hooks";
import { rankParticipants } from "@/lib/scoring";
import { submitAnswer, submitAnswers } from "@/lib/quiz";
import type { Participant, Reveal, Room } from "@/lib/types";
import { QuestionBody } from "../QuestionBody";
import { Ranking } from "../Ranking";
import { RankingHiddenNote } from "../admin/RankingToggle";
import { Button, Card, Ornament, Title } from "../ui";

/** 一次会。全員が全問を自分のペースで答え、締め切りまで選び直せる */
export function SelfPlay({ room, me, onSubmitted }: { room: Room; me: Participant; onSubmitted?: () => void }) {
  const packet = useGuestPacket(room.id);
  const participants = useParticipants(room.id).data ?? [];
  const ranked = rankParticipants(participants, false);
  const rankingOpen = room.rankingVisible !== false;
  const myRank = rankingOpen ? ranked.find((p) => p.id === me.id)?.rank : undefined;
  const [locals, setLocals] = useState<Record<string, LocalPick>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const locked = !!me.submitted;
  const savedCount = packet.questions.filter((question) =>
    packet.myAnswers.some((answer) => answer.questionId === question.id && answer.choice != null),
  ).length;
  const remaining = Math.max(0, packet.questions.length - savedCount);
  const readyToSend = packet.questions.length > 0 && remaining === 0 && !locked;
  const answeredIds = new Set(packet.myAnswers.filter((answer) => answer.choice != null).map((answer) => answer.questionId));
  if (room.phase === "question") {
    for (const [questionId, local] of Object.entries(locals)) {
      if (local.status !== "error") answeredIds.add(questionId);
    }
  }
  const answered = answeredIds.size;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-full bg-white/80 px-4 py-2 text-sm shadow-sm">
        <span className="min-w-0 truncate font-bold">
          {me.nickname}
          <span className="ml-2 font-normal text-ink-soft">· {EVENT_LABEL[room.event]}</span>
        </span>
        <span className="shrink-0 text-ink-soft">
          {room.phase === "finished" ? (
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

      <PrizeIntro />

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
          {room.phase === "closed" && (
            <p className="rounded-2xl bg-blush-100 px-4 py-3 text-center text-sm font-bold text-blush-600">
              締め切りました。正解発表をお待ちください。
            </p>
          )}
          {room.phase === "revealed" && (
            <p className="rounded-2xl bg-gold-100 px-4 py-3 text-center text-sm font-bold text-gold-600">
              {room.presentAll
                ? "全問の正解が出ました。自分の回答に ○ と × が付きます。"
                : "答え合わせは会場のスクリーンで進みます。出た問題から、自分の回答に正解が付きます。"}
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
              serverChoice={packet.myAnswers.find((a) => a.questionId === question.id)?.choice ?? null}
              local={locals[question.id] ?? null}
              onLocal={(pick) => setLocals((prev) => ({ ...prev, [question.id]: pick }))}
              sheet={packet.answerSheet?.find((s) => s.questionId === question.id) ?? null}
              locked={locked}
            />
          ))}
          {room.phase === "question" && !locked && (
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={!readyToSend || sending}
                onClick={() => {
                  if (!readyToSend || sending) return;
                  setSending(true);
                  setSendError("");
                  void submitAnswers(room.id, me.id)
                    .then(() => onSubmitted?.())
                    .catch((err) => setSendError(err instanceof Error ? err.message : "送信できませんでした"))
                    .finally(() => setSending(false));
                }}
              >
                {sending ? "送信しています…" : "回答を送信する"}
              </Button>
              {sendError && <p className="text-center text-sm text-red-700">{sendError}</p>}
              {!readyToSend && <p className="text-center text-xs text-ink-soft">あと{remaining}問で送信できます</p>}
            </div>
          )}
          {room.phase === "finished" &&
            (rankingOpen ? (
              <Card>
                <h2 className="mb-3 text-center font-bold">順位</h2>
                <Ranking participants={participants} highlightUid={me.id} limit={10} showTime={false} byTime={false} />
              </Card>
            ) : (
              <RankingHiddenNote />
            ))}
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
  serverChoice,
  local,
  onLocal,
  sheet,
  locked = false,
}: {
  room: Room;
  me: Participant;
  number: number;
  total: number;
  questionId: string;
  text: string;
  choices: string[];
  serverChoice: number | null;
  local: LocalPick | null;
  onLocal: (pick: LocalPick) => void;
  sheet: Reveal | null;
  locked?: boolean;
}) {
  const tokenRef = useRef(0);
  const [error, setError] = useState<string>();
  const open = room.phase === "question" && !locked;
  const selected = visibleChoice(serverChoice, local, open);
  const status = open ? local?.status : undefined;

  function pick(choice: number) {
    if (!open) return;
    if (selected === choice && local?.status !== "error") return;
    const token = ++tokenRef.current;
    setError(undefined);
    onLocal({ choice, status: "saving" });
    void enqueueForUser(`${room.id}:${me.id}`, async () => {
      if (tokenRef.current !== token) return;
      try {
        await submitAnswer(room, me.id, me.nickname, { choice }, questionId);
        if (tokenRef.current !== token) return;
        onLocal({ choice, status: "saved" });
      } catch (err) {
        if (tokenRef.current !== token) return;
        onLocal({ choice, status: "error" });
        setError(err instanceof Error ? err.message : "保存できませんでした");
      }
    });
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
                disabled={!open}
                aria-pressed={picked}
                onClick={() => pick(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-bold ${
                  picked ? `${CHOICE_STYLES[i].picked} text-white` : `${CHOICE_STYLES[i].idle} bg-white`
                } ${correct ? "ring-4 ring-gold-300 ring-offset-2" : ""}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${picked ? "bg-white/25" : CHOICE_STYLES[i].badge}`}>
                  {CHOICE_LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{choice}</span>
                {sheet && picked && correct && <span>⭕️</span>}
                {sheet && picked && !correct && <span>✖️</span>}
                {sheet && correct && !picked && <span className="text-sm">正解</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {status === "saving" && (
        <p className="text-center text-xs text-ink-soft" aria-live="polite">
          保存しています…
        </p>
      )}
      {status === "error" && (
        <p className="text-center text-sm text-red-700" aria-live="polite">
          {error || "保存できませんでした。もう一度押してください。"}
        </p>
      )}
      {open && selected != null && status !== "saving" && status !== "error" && (
        <p className="text-center text-xs text-ink-soft" aria-live="polite">
          保存しました。締め切りまで変更できます。
        </p>
      )}
    </Card>
  );
}
