"use client";

import { useState } from "react";
import { setRankingVisible } from "@/lib/quiz";
import type { Room } from "@/lib/types";
import { ErrorNote } from "../ui";

/** ゲストとスクリーンへの順位表示。主催者画面の順位は常に残す */
export function RankingToggle({ room }: { room: Room }) {
  const shown = room.rankingVisible !== false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  async function choose(visible: boolean) {
    if (visible === shown || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await setRankingVisible(room.id, visible);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white/70 px-3 py-3">
      <p className="text-sm font-bold">ランキングを表示する／表示しない</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void choose(true)}
          className={`flex-1 rounded-full py-2 text-sm font-bold ${shown ? "bg-blush-500 text-white" : "bg-blush-50 text-ink-soft"}`}
        >
          表示する
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void choose(false)}
          className={`flex-1 rounded-full py-2 text-sm font-bold ${shown ? "bg-blush-50 text-ink-soft" : "bg-ink text-white"}`}
        >
          表示しない
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        {shown ? "いま、ゲストとスクリーンに順位が出ます。" : "いま非表示です。順位は主催者画面だけです。"}
      </p>
      <ErrorNote error={error} />
    </div>
  );
}

export function RankingHiddenNote() {
  return <p className="rounded-2xl bg-white/80 px-4 py-6 text-center text-sm font-bold">順位は後ほど発表します</p>;
}
