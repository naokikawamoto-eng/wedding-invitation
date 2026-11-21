/**
 * 第43回マイルチャンピオンシップ（2026-11-22 15:40 京都・芝1600m）。
 * 1〜5番人気は 2026-11-21 20:36 時点。6頭目は7番人気のワールズエンド（12.5倍）。当日の数字は主催者画面で直す。
 */
export interface RaceHorse {
  id: string;
  popularity: number;
  number: number;
  name: string;
  /** 牝3 など */
  sexAge: string;
  jockey: string;
  /** 単勝オッズ。「5.0」のように倍を除いた数字 */
  odds: string;
}

export interface RacePick {
  uid: string;
  nickname: string;
  horseId: string;
  pickedAt: number;
}

export interface RaceBoard {
  horses: RaceHorse[];
  /** open = 受付中 / locked = 締切 / result = 勝ち馬を出している */
  phase: "open" | "locked" | "result";
  /** 馬のID、または誰も当たらない「none」。未発表は null */
  winnerId: string | null;
  picks: Record<string, RacePick>;
}

export interface RaceView {
  phase: "waiting" | RaceBoard["phase"];
  horses: RaceHorse[];
  picks: RacePick[];
  winnerId: string | null;
}

export const RACE_TITLE = "マイルチャンピオンシップ";
export const RACE_WHEN = "11月22日（日）15:40　京都　芝1600m　G1";
export const RACE_BOUGHT = "各馬の単勝を5,000円ずつ購入済み";
export const RACE_RULE = "当たった人の中からジャンケンで総取り";
export const RACE_WINNERS = "当たった人（前に来てジャンケン！）";
export const RACE_NONE = "該当なし";

export const DEFAULT_RACE_HORSES: RaceHorse[] = [
  { id: "pop1", popularity: 1, number: 14, name: "スターアニス", sexAge: "牝3", jockey: "松山", odds: "5.0" },
  { id: "pop2", popularity: 2, number: 2, name: "エンブロイダリー", sexAge: "牝4", jockey: "ルメール", odds: "6.1" },
  { id: "pop3", popularity: 3, number: 1, name: "エルデナリ", sexAge: "セ3", jockey: "バルザロー", odds: "6.2" },
  { id: "pop4", popularity: 4, number: 8, name: "ロデオドライブ", sexAge: "牡3", jockey: "モレイラ", odds: "6.4" },
  { id: "pop5", popularity: 5, number: 11, name: "ガイアフォース", sexAge: "牡7", jockey: "西村淳", odds: "7.5" },
  { id: "pop6", popularity: 7, number: 12, name: "ワールズエンド", sexAge: "牡5", jockey: "Cデムーロ", odds: "12.5" },
];

export function oddsLabel(odds: string): string {
  return `${odds}倍`;
}
