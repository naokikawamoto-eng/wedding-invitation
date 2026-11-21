import type { Phase } from "./types";

/** 回答済みは、この人が送信したときだけ。締め切っただけの部屋は受付終了 */
export function receptionBadge(phase: Phase, submitted: boolean): "submitted" | "closed" | null {
  if (submitted) return "submitted";
  if (phase !== "lobby" && phase !== "question") return "closed";
  return null;
}

/** 二次会は、終了後に自分の回答があるときだけ回答済み */
export function afterpartyBadge(phase: Phase, answered: boolean): "submitted" | "closed" | null {
  if (phase !== "finished") return null;
  return answered ? "submitted" : "closed";
}
