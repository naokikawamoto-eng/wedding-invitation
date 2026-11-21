"use client";

import { RACE_BOUGHT, RACE_NONE, RACE_RULE, RACE_TITLE, RACE_WHEN, RACE_WINNERS, oddsLabel, type RaceView } from "@/lib/race";
import { ErrorNote } from "../ui";
import { useRace } from "./useRace";

export function RaceScreen() {
  const { race, error } = useRace();
  if (error && !race) return <ErrorNote error={error} />;
  if (!race) return <p className="grid h-dvh place-items-center text-2xl">読み込み中…</p>;
  if (race.phase === "result") return <Result race={race} />;
  return <Board race={race} />;
}

function Board({ race }: { race: RaceView }) {
  const phase = race.phase === "open" ? "受付中" : race.phase === "locked" ? "締切" : "受付前";
  return (
    <main className="box-border flex h-dvh w-full flex-col overflow-hidden px-3 py-2 sm:px-5 sm:py-3">
      <header className="flex shrink-0 items-end justify-between gap-3 pb-2">
        <div>
          <p className="font-display text-[clamp(1.4rem,3vh,2.4rem)] italic leading-none text-gold-600">Mile CS</p>
          <h1 className="text-[clamp(1.1rem,2.4vh,1.8rem)] font-bold leading-tight">{RACE_TITLE}</h1>
          <p className="text-[clamp(0.75rem,1.6vh,1rem)] text-ink-soft">{RACE_WHEN}</p>
        </div>
        <div className="text-right">
          <p className="text-[clamp(0.8rem,1.7vh,1.05rem)] font-bold">{RACE_BOUGHT}</p>
          <p className="text-[clamp(0.8rem,1.7vh,1.05rem)] font-bold">{RACE_RULE}</p>
          <p className="mt-1 text-[clamp(0.9rem,2vh,1.3rem)] font-bold text-blush-600">{phase}</p>
        </div>
      </header>
      <ul className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2">
        {race.horses.map((horse) => {
          const names = race.picks.filter((pick) => pick.horseId === horse.id).map((pick) => pick.nickname);
          return (
            <li key={horse.id} className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white/95 px-3 py-2 shadow">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0">
                  <span className="mr-2 font-display text-[clamp(1.3rem,3vh,2.2rem)] font-semibold leading-none text-gold-600">{horse.popularity}</span>
                  <span className="text-[clamp(0.7rem,1.4vh,0.95rem)] font-bold text-ink-soft">番人気</span>
                  <span className="mt-0.5 block truncate text-[clamp(1rem,2.2vh,1.7rem)] font-bold leading-tight">
                    {horse.number} {horse.name}
                    <span className="ml-2 text-[0.62em] font-bold text-ink-soft">
                      {horse.sexAge}・{horse.jockey}
                    </span>
                  </span>
                </p>
                <p className="shrink-0 text-right">
                  <span className="block text-[clamp(1.1rem,2.4vh,1.8rem)] font-bold leading-none text-blush-600">{oddsLabel(horse.odds)}</span>
                  <span className="text-[clamp(0.85rem,1.8vh,1.2rem)] font-bold">{names.length}人</span>
                </p>
              </div>
              <ul className="mt-1 flex min-h-0 flex-1 flex-wrap content-start gap-1 overflow-y-auto">
                {names.map((name) => (
                  <li key={name} className="rounded-full bg-blush-50 px-2 py-0.5 text-[clamp(0.72rem,1.5vh,1rem)] font-bold">
                    {name}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Result({ race }: { race: RaceView }) {
  if (race.winnerId === "none") {
    return (
      <main className="grid h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-5xl italic text-gold-600 sm:text-7xl">Mile CS</p>
          <p className="mt-6 text-[clamp(3rem,10vh,7rem)] font-bold leading-none">{RACE_NONE}</p>
          <p className="mt-4 text-2xl font-bold text-ink-soft sm:text-4xl">1〜6番人気以外の勝ちです</p>
        </div>
      </main>
    );
  }
  const horse = race.horses.find((item) => item.id === race.winnerId);
  const names = horse ? race.picks.filter((pick) => pick.horseId === horse.id).map((pick) => pick.nickname) : [];
  return (
    <main className="box-border flex h-dvh flex-col overflow-hidden px-6 py-4 text-center">
      <p className="font-display text-[clamp(1.6rem,4vh,3rem)] italic text-gold-600">Mile CS</p>
      <h1 className="text-[clamp(1.8rem,5vh,3.5rem)] font-bold leading-tight">{RACE_WINNERS}</h1>
      {horse && (
        <p className="text-[clamp(1.2rem,3vh,2rem)] font-bold">
          {horse.number}番 {horse.name}
          <span className="ml-3 text-ink-soft">
            {horse.sexAge}・{horse.jockey}　{oddsLabel(horse.odds)}
          </span>
        </p>
      )}
      {names.length ? (
        <ul className="mt-4 flex min-h-0 flex-1 flex-wrap content-center justify-center gap-3 overflow-y-auto">
          {names.map((name) => (
            <li key={name} className="rounded-full bg-white/90 px-5 py-2 text-[clamp(1.4rem,4vh,3rem)] font-bold shadow">
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-3xl font-bold text-ink-soft">選んだ人はいません</p>
      )}
    </main>
  );
}
