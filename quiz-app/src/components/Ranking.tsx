import { formatSeconds, rankParticipants } from "@/lib/scoring";
import type { Participant } from "@/lib/types";

const MEDALS = ["", "🥇", "🥈", "🥉"];

export function Ranking({
  participants,
  highlightUid,
  limit,
  large = false,
  showTime = true,
  byTime = true,
  onRemove,
}: {
  participants: Participant[];
  highlightUid?: string;
  limit?: number;
  large?: boolean;
  showTime?: boolean;
  /** false のとき、正解数が同じなら同順位 */
  byTime?: boolean;
  onRemove?: (p: Participant) => void;
}) {
  const ranked = rankParticipants(participants, byTime);
  const rows = limit ? ranked.slice(0, limit) : ranked;
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-soft">まだ参加者がいません</p>;
  return (
    <ol className="space-y-2">
      {rows.map((p) => (
        <li
          key={p.id}
          className={`flex items-center gap-3 rounded-2xl px-4 transition-all ${large ? "py-3 text-2xl" : "py-2"} ${
            p.id === highlightUid
              ? "bg-blush-100 ring-2 ring-blush-300"
              : p.rank <= 3
                ? "bg-gold-100/70"
                : "bg-white/70"
          }`}
        >
          <span className={`w-12 shrink-0 text-center font-display font-semibold ${large ? "text-3xl" : "text-xl"} text-gold-600`}>
            {MEDALS[p.rank] || p.rank}
          </span>
          <span className="min-w-0 flex-1 truncate font-bold">{p.nickname}</span>
          {showTime && p.score > 0 && (
            <span className="hidden text-xs text-ink-soft sm:inline">{formatSeconds(p.totalTimeMs)}</span>
          )}
          <span className="shrink-0 font-bold text-blush-600">
            {p.score}
            <span className="text-[0.7em]"> 問</span>
          </span>
          {onRemove && (
            <button
              onClick={() => onRemove(p)}
              className="shrink-0 rounded-full px-2 text-xs text-ink-soft hover:bg-red-50 hover:text-red-600"
              title="参加者を削除"
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
