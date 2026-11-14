/** 一次会の景品。順位には使わない。未設定はまだ選んでいない */
export const PRIZES = [
  {
    id: "watch",
    name: "HUAWEI WATCH FIT 4 Pro",
    short: "ウォッチ",
    detail: "大画面のAMOLED。軽く、心拍や睡眠の見守りと、多くのワークアウトができます。替えバンド付き。",
  },
  {
    id: "pad",
    name: "REDMI Pad 2 9.7",
    short: "タブレット",
    detail: "9.7インチのコンパクトなタブレット。動画、電子書籍、普段使いに向きます。",
  },
  {
    id: "earbuds",
    name: "Bose QuietComfort Ultra Earbuds",
    short: "イヤホン",
    detail: "最高クラスのノイズキャンセリングと、空間オーディオを搭載しています。",
  },
  {
    id: "amazon",
    name: "Amazonギフト券 10,000円分",
    short: "ギフト券",
    detail: "Amazonで使える 10,000円分のギフト券です。",
  },
  {
    id: "dryer",
    name: "高級ヘアドライヤー",
    short: "ドライヤー",
    detail: "髪を整える、高級なヘアドライヤーです。",
  },
] as const;

export const ANY_PRIZE = { id: "any", name: "どれでもうれしい", short: "どれでも" } as const;

export type PrizeId = (typeof PRIZES)[number]["id"] | typeof ANY_PRIZE.id;

const IDS = new Set<string>([...PRIZES.map((prize) => prize.id), ANY_PRIZE.id]);

export function isPrizeId(value: unknown): value is PrizeId {
  return typeof value === "string" && IDS.has(value);
}

export function prizeShort(id: string | null | undefined): string {
  if (!id) return "未選択";
  if (id === ANY_PRIZE.id) return ANY_PRIZE.short;
  return PRIZES.find((prize) => prize.id === id)?.short ?? "未選択";
}
