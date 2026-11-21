"use client";

import { useState } from "react";
import { RACE_BOUGHT, RACE_RULE, RACE_TITLE, RACE_WHEN, RACE_WINNERS, RACE_NONE, oddsLabel, type RaceHorse, type RaceView } from "@/lib/race";
import { pickRaceHorse } from "@/lib/quiz";
import { Card, ErrorNote } from "../ui";
import { useRace } from "./useRace";

export function RaceGuest({ uid, nickname }: { uid: string; nickname: string }) {
  const { race, error } = useRace();
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<unknown>();
  if (error && !race) return <ErrorNote error={error} />;
  if (!race) return <p className="py-16 text-center text-sm text-ink-soft">読み込み中…</p>;
  const mine = race.picks.find((pick) => pick.uid === uid);
  const open = race.phase === "open";

  async function choose(horseId: string) {
    if (!open || busy) return;
    setBusy(true);
    setPickError(undefined);
    try {
      await pickRaceHorse(uid, nickname, horseId);
    } catch (err) {
      setPickError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2 text-center">
        <p className="font-display text-3xl italic text-gold-600">Mile CS</p>
        <h2 className="text-xl font-bold">{RACE_TITLE}</h2>
        <p className="text-sm text-ink-soft">{RACE_WHEN}</p>
        <p className="text-sm font-bold">{RACE_BOUGHT}</p>
        <p className="text-sm font-bold">{RACE_RULE}</p>
      </Card>
      <ResultNote race={race} mine={mine?.horseId} />
      <ul className="space-y-2">
        {race.horses.map((horse) => {
          const selected = mine?.horseId === horse.id;
          return (
            <li key={horse.id}>
              <button
                type="button"
                disabled={!open || busy}
                onClick={() => void choose(horse.id)}
                className={`flex w-full items-center gap-3 rounded-3xl border-2 px-4 py-3 text-left ${
                  selected ? "border-gold-400 bg-gold-100" : "border-white bg-white/85"
                }`}
              >
                <span className="w-14 shrink-0 text-center">
                  <span className="block font-display text-2xl font-semibold text-gold-600">{horse.popularity}</span>
                  <span className="text-[10px] font-bold text-ink-soft">番人気</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {horse.number}番 {horse.name}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {horse.sexAge}・{horse.jockey}
                  </span>
                </span>
                <span className="shrink-0 text-right font-bold text-blush-600">{oddsLabel(horse.odds)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ErrorNote error={pickError} />
      {open ? (
        <p className="text-center text-xs text-ink-soft">{mine ? "締め切りまでは、別の馬を押すと選び直せます" : "勝ち馬だと思う1頭を押してください"}</p>
      ) : (
        <p className="text-center text-sm font-bold text-ink-soft">{race.phase === "waiting" ? "まだ受付前です" : "締め切りました"}</p>
      )}
    </div>
  );
}

function ResultNote({ race, mine }: { race: RaceView; mine?: string }) {
  if (race.phase !== "result") return null;
  if (race.winnerId === "none") return <p className="rounded-3xl bg-white/80 py-4 text-center text-lg font-bold">{RACE_NONE}</p>;
  const horse = race.horses.find((item) => item.id === race.winnerId);
  if (!horse) return null;
  const hit = mine === horse.id;
  return (
    <p className={`rounded-3xl py-4 text-center font-bold text-white ${hit ? "bg-gold-500" : "bg-ink-soft"}`}>
      {hit ? RACE_WINNERS : `${horse.name}の勝ちです`}
    </p>
  );
}

export function horseNames(race: RaceView, horse: RaceHorse): string[] {
  return race.picks.filter((pick) => pick.horseId === horse.id).map((pick) => pick.nickname);
}
