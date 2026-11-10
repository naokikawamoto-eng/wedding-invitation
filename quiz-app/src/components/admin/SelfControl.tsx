"use client";

import { useState } from "react";
import { advanceReveal, closeAnswers, finishQuiz, openQuiz, recalculateScores, resetRoom, revealAll } from "@/lib/quiz";
import type { Answer, Participant, Question, Room } from "@/lib/types";
import { Ranking } from "../Ranking";
import { Button, Card, ErrorNote } from "../ui";

/** 一次会の進行。開始、手動締め切り、全問の正解発表 */
export function SelfControl({
  room,
  questions,
  answers,
  participants,
}: {
  room: Room;
  questions: Question[];
  answers: Answer[];
  participants: Participant[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  async function run(action: () => Promise<unknown>, confirmMessage?: string) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const donePeople = new Set(answers.map((a) => a.uid)).size;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <Card className="space-y-4">
          <p className="text-sm text-ink-soft">
            各自のペースで全問に答えます。締め切り時刻は決めず、お色直し後の再入場の前に「回答を締め切る」を押してください。締め切りまで回答は変えられます。会場スクリーンは、下のボタンに合わせて1問ずつ進みます。
          </p>
          <a href={`/screen/${room.id}`} target="_blank" rel="noreferrer" className="block text-center text-sm font-bold text-blush-600 underline">
            スクリーンを開く（/screen/{room.id}）
          </a>
          {room.phase === "lobby" && <p className="text-center font-bold">参加受付中です（{participants.length}人）</p>}
          {room.phase === "question" && <p className="text-center font-bold text-blush-600">回答受付中</p>}
          {room.phase === "closed" && <p className="text-center font-bold">締め切りました</p>}
          {room.phase === "revealed" && (
            <p className="text-center font-bold text-gold-600">
              答え合わせ中：第 {(room.presentIndex ?? 0) + 1} 問
              {room.presentAnswer ? "（正解を表示中）" : "（まだ正解は出していません）"}
            </p>
          )}
          {room.phase === "finished" && <p className="text-center font-bold text-gold-600">最終結果を発表中です</p>}

          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={q.id} className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                <span className="font-display text-lg text-gold-600">Q{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{q.text}</span>
                <span className="shrink-0 font-bold">
                  {answers.filter((a) => a.questionId === q.id).length}/{participants.length}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-center text-sm text-ink-soft">1問でも答えた人 {donePeople} 人</p>
          <ErrorNote error={error} />
          {room.phase === "lobby" && (
            <Button size="lg" className="w-full" disabled={busy || !questions.length} onClick={() => run(() => openQuiz(room.id))}>
              {busy ? "処理中…" : "回答受付を開始する"}
            </Button>
          )}
          {room.phase === "question" && (
            <Button size="lg" className="w-full" disabled={busy} onClick={() => run(() => closeAnswers(room.id), "回答を締め切ります。よろしいですか？")}>
              {busy ? "処理中…" : "回答を締め切る"}
            </Button>
          )}
          {room.phase === "closed" && (
            <Button variant="gold" size="lg" className="w-full" disabled={busy} onClick={() => run(() => revealAll(room.id))}>
              {busy ? "処理中…" : "答え合わせを始める"}
            </Button>
          )}
          {room.phase === "revealed" && !room.presentAnswer && (
            <Button variant="gold" size="lg" className="w-full" disabled={busy} onClick={() => run(() => advanceReveal(room.id))}>
              {busy ? "処理中…" : `第 ${(room.presentIndex ?? 0) + 1} 問の正解を出す`}
            </Button>
          )}
          {room.phase === "revealed" && room.presentAnswer && (room.presentIndex ?? 0) + 1 < questions.length && (
            <Button size="lg" className="w-full" disabled={busy} onClick={() => run(() => advanceReveal(room.id))}>
              {busy ? "処理中…" : "次の問題へ"}
            </Button>
          )}
          {room.phase === "revealed" && room.presentAnswer && (room.presentIndex ?? 0) + 1 >= questions.length && (
            <Button variant="gold" size="lg" className="w-full" disabled={busy} onClick={() => run(() => finishQuiz(room.id))}>
              {busy ? "処理中…" : "最終順位を発表する"}
            </Button>
          )}
        </Card>
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-ink-soft">メンテナンス</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => recalculateScores(room.id))}>
              得点を再計算
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => run(() => resetRoom(room.id, false), "回答と得点を消して受付に戻します。よろしいですか？")}
            >
              成績をリセット
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => run(() => resetRoom(room.id, true), "回答・得点・参加者をすべて削除します。よろしいですか？")}
            >
              参加者ごと全てリセット
            </Button>
          </div>
        </Card>
      </div>
      <Card className="h-fit">
        <h3 className="mb-3 font-bold">順位（正解数。同点は同順位）</h3>
        <Ranking participants={participants} byTime={false} showTime={false} limit={10} />
      </Card>
    </div>
  );
}
