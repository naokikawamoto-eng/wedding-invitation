"use client";

import { useState } from "react";
import {
  closeAnswers,
  finishQuiz,
  recalculateScores,
  resetRoom,
  revealAnswer,
  setAnswerSeconds,
  showQuestion,
  showStandings,
} from "@/lib/quiz";
import type { Answer, AnswerKey, Participant, Question, Room } from "@/lib/types";
import { AnswerStats } from "../AnswerStats";
import { Countdown } from "../Countdown";
import { QuestionBody } from "../QuestionBody";
import { Ranking } from "../Ranking";
import { Button, Card, ErrorNote } from "../ui";
import { SelfControl } from "./SelfControl";

const TIMER_OPTIONS = [
  { seconds: 0, label: "無制限" },
  { seconds: 20, label: "20秒" },
  { seconds: 30, label: "30秒" },
  { seconds: 45, label: "45秒" },
  { seconds: 60, label: "60秒" },
];

const STEPS = [
  { phase: "question", label: "出題・回答受付" },
  { phase: "closed", label: "締切" },
  { phase: "revealed", label: "正解発表" },
] as const;

export function ControlPanel({
  room,
  questions,
  keys,
  answers,
  participants,
}: {
  room: Room;
  questions: Question[];
  keys: Map<string, AnswerKey>;
  answers: Answer[];
  participants: Participant[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const index = questions.findIndex((q) => q.id === room.currentQuestionId);
  const current = index >= 0 ? questions[index] : undefined;
  const next = questions[index + 1];
  const answeredCount = answers.filter((a) => a.questionId === room.currentQuestionId).length;

  if (room.mode === "self") {
    return <SelfControl room={room} questions={questions} answers={answers} participants={participants} />;
  }

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

  const primary = (() => {
    if (room.phase === "lobby") {
      const first = questions[0];
      return first ? { label: "Q1 を表示する", action: () => showQuestion(room.id, questions, first.id) } : null;
    }
    if (room.phase === "question") return { label: "回答を締め切る", action: () => closeAnswers(room.id) };
    if (room.phase === "closed") return { label: "正解を発表する", action: () => revealAnswer(room.id, room.currentQuestionId!) };
    if (room.phase === "revealed" && !room.presentStandings) return { label: "途中順位を見る", action: () => showStandings(room.id) };
    if (room.phase === "revealed") {
      return next
        ? { label: `Q${index + 2} を表示する`, action: () => showQuestion(room.id, questions, next.id) }
        : { label: "最終結果を発表する", action: () => finishQuiz(room.id) };
    }
    return null;
  })();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <Card className="space-y-5">
          <a href={`/screen/${room.id}`} target="_blank" rel="noreferrer" className="block text-center text-sm font-bold text-blush-600 underline">
            スクリーンを開く（/screen/{room.id}）
          </a>
          {questions.some((q) => q.sample && q.text.includes("未定")) && (
            <p className="rounded-2xl bg-gold-100 px-4 py-3 text-sm">
              未定の問題が残っています。プロフィールムービーの問題が決まったら、問題タブで差し替えてください。
            </p>
          )}
          {questions.some((q) => q.sample && !q.text.includes("未定")) && (
            <p className="rounded-2xl bg-gold-100 px-4 py-3 text-sm">
              いま入っているのはサンプル問題です。問題タブで、二人のエピソードに差し替えてから当日を迎えてください。
            </p>
          )}

          <div className="space-y-2">
            <p className="text-center text-xs font-bold text-ink-soft">次の問題の制限時間（出題した瞬間から）</p>
            <div className="flex flex-wrap justify-center gap-2">
              {TIMER_OPTIONS.map((option) => (
                <button
                  key={option.seconds}
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => setAnswerSeconds(room.id, option.seconds))}
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    room.answerSeconds === option.seconds ? "bg-blush-500 text-white" : "bg-blush-50 text-ink-soft"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <ol className="flex gap-2 text-center text-xs font-bold">
            {STEPS.map((s) => (
              <li
                key={s.phase}
                className={`flex-1 rounded-full py-2 ${
                  room.phase === s.phase ? "bg-blush-500 text-white" : "bg-blush-50 text-ink-soft"
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>

          {room.phase === "lobby" && (
            <p className="py-6 text-center text-ink-soft">
              参加受付中です（{participants.length}人）。
              {questions.length ? "準備ができたら第1問を表示してください。" : "先に「問題」タブで問題を作成してください。"}
            </p>
          )}
          {room.phase === "finished" && (
            <p className="py-6 text-center font-bold text-gold-600">最終結果を発表中です 🎉</p>
          )}
          {room.presentStandings && room.phase === "revealed" && (
            <p className="text-center font-bold text-gold-600">スクリーンは途中順位を表示しています</p>
          )}
          {current && room.phase !== "lobby" && room.phase !== "finished" && (
            <>
              <QuestionBody question={current} number={index + 1} total={questions.length} />
              {room.phase === "question" && <Countdown endsAt={room.questionEndsAt} />}
              <div className="flex items-center justify-center gap-2 text-lg">
                回答済み
                <b className="text-3xl text-blush-600">{answeredCount}</b>/ {participants.length} 人
              </div>
              <AnswerStats question={current} answerKey={keys.get(current.id)} answers={answers} />
            </>
          )}

          <ErrorNote error={error} />
          {primary && (
            <Button
              variant={room.phase === "closed" ? "gold" : "primary"}
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={() => run(primary.action)}
            >
              {busy ? "処理中…" : primary.label}
            </Button>
          )}
          {room.phase === "revealed" && next && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={busy}
              onClick={() => run(() => finishQuiz(room.id), "残りの問題を出さずに最終結果を発表しますか？")}
            >
              ここで終了して最終結果へ
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
              onClick={() => run(() => resetRoom(room.id, false), "回答と得点を消してロビーに戻します。よろしいですか？")}
            >
              成績をリセット
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(() => resetRoom(room.id, true), "回答・得点・参加者をすべて削除します（リハーサル後用）。よろしいですか？")
              }
            >
              参加者ごと全てリセット
            </Button>
          </div>
          <p className="text-xs text-ink-soft">
            正解を後から直したときは「得点を再計算」を押すと、発表済みの問題すべてで採点し直します。
          </p>
        </Card>
      </div>

      <Card className="h-fit">
        <h3 className="mb-3 font-bold">ランキング（上位10名）</h3>
        <Ranking participants={participants} limit={10} />
      </Card>
    </div>
  );
}
