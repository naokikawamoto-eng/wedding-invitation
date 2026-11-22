"use client";

import { AFTERPARTY_PLACE_PRIZES, RECEPTION_PLACE_PRIZES } from "@/lib/prizes";
import type { QuizEvent } from "@/lib/types";
import { Card } from "../ui";

/** 主催者メモ。ゲスト画面とスクリーンには出さない */
export function HostPrizes({ event }: { event: QuizEvent }) {
  const prizes = event === "reception" ? RECEPTION_PLACE_PRIZES : AFTERPARTY_PLACE_PRIZES;
  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-bold text-ink-soft">主催者メモ（会場には出しません）</h3>
      <ul className="space-y-1 text-sm">
        {prizes.map((prize) => (
          <li key={prize.place}>
            <b>{prize.place}</b> {prize.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}
