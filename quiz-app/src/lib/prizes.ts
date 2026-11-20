/** 以前の希望景品ID。保存済みの回答を壊さないためだけに残す。画面には出さない */
const STORED_PRIZE_IDS = ["watch", "pad", "earbuds", "amazon", "dryer", "any"] as const;

export type PrizeId = (typeof STORED_PRIZE_IDS)[number];

const IDS = new Set<string>(STORED_PRIZE_IDS);

export function isPrizeId(value: unknown): value is PrizeId {
  return typeof value === "string" && IDS.has(value);
}

/** 主催者だけが見る順位景品。ゲスト画面とスクリーンには出さない */
export const RECEPTION_PLACE_PRIZES = [
  { place: "1位", name: "ドライヤー" },
  { place: "2位", name: "イヤホン" },
  { place: "3位", name: "タブレット" },
] as const;

export const AFTERPARTY_PLACE_PRIZES = [
  { place: "1位", name: "ファーウェイのスマートウォッチ" },
  { place: "2位", name: "商品券1万円分" },
  { place: "3位", name: "本日のG1の馬券" },
] as const;
