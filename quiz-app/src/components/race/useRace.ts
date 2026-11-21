"use client";

import { useEffect, useState } from "react";
import type { RaceView } from "@/lib/race";

export function useRace() {
  const [race, setRace] = useState<RaceView | null | undefined>(undefined);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let stop = false;
    let timer = 0;
    async function pull() {
      try {
        const res = await fetch("/api/sync?view=race", { cache: "no-store" });
        const body = (await res.json()) as { race?: RaceView | null; error?: string };
        if (!res.ok) throw new Error(body.error || "読み込めませんでした");
        if (!stop) {
          setRace(body.race ?? null);
          setError(undefined);
        }
      } catch (err) {
        if (!stop) setError(err);
      } finally {
        if (!stop) timer = window.setTimeout(() => void pull(), document.visibilityState === "hidden" ? 2000 : 800);
      }
    }
    void pull();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { race, error };
}
