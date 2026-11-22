"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RACE_TITLE, RACE_WHEN, type RaceHorse } from "@/lib/race";
import { clearRaceResult, closeRace, openRace, saveRaceHorses, setRaceWinner } from "@/lib/quiz";
import { Button, Card, ErrorNote } from "../ui";
import { useRace } from "./useRace";

export function RaceAdmin() {
  const { race, error } = useRace();
  const [horses, setHorses] = useState<RaceHorse[]>([]);
  const [winner, setWinner] = useState("pop1");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<unknown>();

  useEffect(() => {
    if (race?.horses) setHorses(race.horses.map((horse) => ({ ...horse })));
  }, [race]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setNote(undefined);
    try {
      await action();
    } catch (err) {
      setNote(err);
    } finally {
      setBusy(false);
    }
  }

  if (error && !race) return <ErrorNote error={error} />;
  if (!race) return <p className="py-16 text-center text-sm text-ink-soft">読み込み中…</p>;
  const phase = race.phase === "open" ? "受付中" : race.phase === "locked" ? "締切" : race.phase === "result" ? "結果発表中" : "受付前";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
          ← ルーム一覧
        </Link>
        <h1 className="min-w-0 flex-1 text-xl font-bold">{RACE_TITLE}</h1>
        <a href="/screen/race" target="_blank" rel="noreferrer">
          <Button variant="gold" size="sm">
            スクリーン表示 ↗
          </Button>
        </a>
      </header>
      <p className="text-sm text-ink-soft">
        {RACE_WHEN}　いまは <b>{phase}</b>　{race.picks.length}人
      </p>
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {race.phase !== "open" && (
            <Button disabled={busy} onClick={() => run(() => openRace())}>
              受付を開始する
            </Button>
          )}
          {race.phase === "open" && (
            <Button variant="gold" disabled={busy} onClick={() => run(() => closeRace())}>
              締め切る
            </Button>
          )}
          {race.phase === "result" && (
            <Button variant="outline" disabled={busy} onClick={() => run(() => clearRaceResult())}>
              結果をしまう
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-full border border-blush-200 bg-white px-4 py-2 text-sm font-bold" value={winner} onChange={(e) => setWinner(e.target.value)}>
            {race.horses.map((horse) => (
              <option key={horse.id} value={horse.id}>
                {horse.popularity}番人気 {horse.number} {horse.name}
              </option>
            ))}
            <option value="none">該当なし</option>
          </select>
          <Button variant="gold" disabled={busy || race.phase === "waiting"} onClick={() => run(() => setRaceWinner(winner))}>
            結果を出す
          </Button>
        </div>
      </Card>
      <Card className="space-y-3 overflow-x-auto">
        <h2 className="font-bold">6頭（馬番・馬名・騎手・オッズ）</h2>
        <ul className="space-y-2">
          {horses.map((horse, index) => (
            <li key={horse.id} className="grid grid-cols-[4.5rem_4rem_1fr_4.5rem_6rem_5rem] items-center gap-2">
              <span className="text-sm font-bold">{horse.popularity}番人気</span>
              <input className="rounded-xl border border-blush-200 px-2 py-2 text-center" inputMode="numeric" value={horse.number} onChange={(e) => patch(index, { number: Number(e.target.value) })} />
              <input className="rounded-xl border border-blush-200 px-3 py-2" value={horse.name} onChange={(e) => patch(index, { name: e.target.value })} />
              <input className="rounded-xl border border-blush-200 px-2 py-2 text-center" value={horse.sexAge} onChange={(e) => patch(index, { sexAge: e.target.value })} />
              <input className="rounded-xl border border-blush-200 px-2 py-2" value={horse.jockey} onChange={(e) => patch(index, { jockey: e.target.value })} />
              <input className="rounded-xl border border-blush-200 px-2 py-2 text-center" value={horse.odds} onChange={(e) => patch(index, { odds: e.target.value })} />
            </li>
          ))}
        </ul>
        <Button disabled={busy || !horses.length} onClick={() => run(() => saveRaceHorses(horses))}>
          馬の情報を保存する
        </Button>
      </Card>
      <ErrorNote error={note} />
    </div>
  );

  function patch(index: number, next: Partial<RaceHorse>) {
    setHorses((prev) => prev.map((horse, i) => (i === index ? { ...horse, ...next } : horse)));
  }
}
