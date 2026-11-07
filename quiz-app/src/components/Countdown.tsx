"use client";

import { useServerClock } from "@/lib/hooks";

export function Countdown({ endsAt, large = false }: { endsAt: number | null; large?: boolean }) {
  const now = useServerClock();
  if (!endsAt) return null;
  const remain = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const urgent = remain <= 5;
  return (
    <p className={`text-center font-bold tabular-nums ${urgent ? "text-blush-600" : "text-gold-600"} ${large ? "text-6xl" : "text-lg"}`}>
      {remain <= 0 ? "まもなく締め切り" : `残り ${remain} 秒`}
    </p>
  );
}
