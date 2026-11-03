import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "../lib/events";
import type { QuizEvent } from "../lib/types";

export interface PresetQuestion {
  id: string;
  type: "choice" | "text";
  text: string;
  choices: string[];
  correctChoice: number | null;
  correctTexts: string[];
}

export interface Preset {
  id: string;
  title: string;
  event: QuizEvent;
  answerSeconds: number;
  questions: PresetQuestion[];
}

/**
 * 招待状に書いてある事実だけを使った仮問題。
 * 二人のエピソードは当日までに差し替える前提で、sample フラグを付ける。
 */
export const PRESETS: Preset[] = [
  {
    id: RECEPTION_ROOM_ID,
    title: "一次会クイズ（披露宴）",
    event: "reception",
    answerSeconds: 45,
    questions: [
      {
        id: "ichie-1",
        type: "choice",
        text: "本日の結婚式の会場は、どのホテルでしょう？",
        choices: ["ザ・プリンス パークタワー東京", "パレスホテル東京", "ホテルニューオータニ", "帝国ホテル"],
        correctChoice: 0,
        correctTexts: [],
      },
      {
        id: "ichie-2",
        type: "choice",
        text: "披露宴が始まる時刻は？",
        choices: ["11:30", "12:45", "15:00", "17:00"],
        correctChoice: 1,
        correctTexts: [],
      },
      {
        id: "ichie-3",
        type: "choice",
        text: "披露宴が行われる部屋の名前は？",
        choices: ["ボールルーム", "メロディーライン", "スカイバンケット", "ガーデンテラス"],
        correctChoice: 0,
        correctTexts: [],
      },
      {
        id: "ichie-4",
        type: "text",
        text: "新郎の氏名は？（姓と名）",
        choices: [],
        correctChoice: null,
        correctTexts: ["河本直樹", "河本 直樹"],
      },
      {
        id: "ichie-5",
        type: "text",
        text: "新婦の氏名は？（姓と名）",
        choices: [],
        correctChoice: null,
        correctTexts: ["磯野有梨花", "磯野 有梨花"],
      },
    ],
  },
  {
    id: AFTERPARTY_ROOM_ID,
    title: "二次会クイズ",
    event: "afterparty",
    answerSeconds: 30,
    questions: [
      {
        id: "nijie-1",
        type: "choice",
        text: "二次会のスタートは何時？",
        choices: ["16:00", "17:00", "18:30", "19:00"],
        correctChoice: 1,
        correctTexts: [],
      },
      {
        id: "nijie-2",
        type: "choice",
        text: "二次会の会場名は？",
        choices: ["メロディーライン", "ボールルーム", "オーロラ", "スカイラウンジ"],
        correctChoice: 0,
        correctTexts: [],
      },
      {
        id: "nijie-3",
        type: "choice",
        text: "今日は何年何月何日？",
        choices: ["2026年11月22日", "2026年11月23日", "2025年11月22日", "2026年12月22日"],
        correctChoice: 0,
        correctTexts: [],
      },
      {
        id: "nijie-4",
        type: "text",
        text: "新郎の苗字は？",
        choices: [],
        correctChoice: null,
        correctTexts: ["河本"],
      },
      {
        id: "nijie-5",
        type: "text",
        text: "新婦の苗字は？",
        choices: [],
        correctChoice: null,
        correctTexts: ["磯野"],
      },
    ],
  },
];
