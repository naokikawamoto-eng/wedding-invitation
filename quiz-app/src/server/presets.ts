import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "../lib/events";
import type { QuizEvent } from "../lib/types";

export interface PresetQuestion {
  id: string;
  type: "choice" | "text";
  text: string;
  choices: string[];
  correctChoice: number | null;
  correctTexts: string[];
  /** 未定・仮問題。主催者画面に印が出る */
  sample?: boolean;
}

export interface Preset {
  id: string;
  title: string;
  event: QuizEvent;
  answerSeconds: number;
  questions: PresetQuestion[];
}

/**
 * 一次会は招待状の事実だけの仮問題（あとから新郎新婦の問題に差し替える）。
 * 二次会は披露宴の振り返り10問。Q8だけ未定。
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
        sample: true,
      },
      {
        id: "ichie-2",
        type: "choice",
        text: "披露宴が始まる時刻は？",
        choices: ["11:30", "12:45", "15:00", "17:00"],
        correctChoice: 1,
        correctTexts: [],
        sample: true,
      },
      {
        id: "ichie-3",
        type: "choice",
        text: "披露宴が行われる部屋の名前は？",
        choices: ["ボールルーム", "メロディーライン", "スカイバンケット", "ガーデンテラス"],
        correctChoice: 0,
        correctTexts: [],
        sample: true,
      },
      {
        id: "ichie-4",
        type: "text",
        text: "新郎の氏名は？（姓と名）",
        choices: [],
        correctChoice: null,
        correctTexts: ["河本直樹", "河本 直樹"],
        sample: true,
      },
      {
        id: "ichie-5",
        type: "text",
        text: "新婦の氏名は？（姓と名）",
        choices: [],
        correctChoice: null,
        correctTexts: ["磯野有梨花", "磯野 有梨花"],
        sample: true,
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
        text: "受付横のウェルカムスペースに飾られていた、2人の思い出のアイテムは次のうちどれ？",
        choices: ["お揃いのスニーカー", "初デートで行った遊園地のチケット", "薔薇の額縁", "愛犬（愛猫）の写真立て"],
        correctChoice: 2,
        correctTexts: [],
      },
      {
        id: "nijie-2",
        type: "choice",
        text: "開宴前、皆さんが会場に入られた時に流れていたディズニーの曲は次のうちどれ？",
        choices: ["美女と野獣", "シンデレラ", "塔の上のラプンツェル", "眠れる森の美女"],
        correctChoice: 1,
        correctTexts: [],
      },
      {
        id: "nijie-3",
        type: "choice",
        text: "新婦が挙式で持っていたブーケ、何の花でしょう？",
        choices: ["バラ", "カサブランカ", "ガーベラ", "カスミソウ"],
        correctChoice: 1,
        correctTexts: [],
      },
      {
        id: "nijie-4",
        type: "choice",
        text: "入場前のオープニングムービーで使われていた曲はどれ？",
        choices: ["Don't Stop Me Now / Queen", "Marry You / Bruno Mars", "I Was Born To Love You / Queen", "115万キロのフィルム / Official髭男dism"],
        correctChoice: 2,
        correctTexts: [],
      },
      {
        id: "nijie-5",
        type: "choice",
        text: "新郎側の乾杯の挨拶をしてくださった方と、新婦側の友人代表スピーチをしてくださった方。おふたりと新郎新婦の関係性の組み合わせで正しいものはどれ？",
        choices: ["新郎：職場の先輩 ＆ 新婦：中学校の友人", "新郎：大学の同級生 ＆ 新婦：大学の友人", "新郎：大学の先輩 ＆ 新婦：小学校の友人", "新郎：高校の部活仲間 ＆ 新婦：職場の同期"],
        correctChoice: 2,
        correctTexts: [],
      },
      {
        id: "nijie-6",
        type: "choice",
        text: "ファーストバイトで登場したビッグスプーン。あのスプーンのサイズは何センチだったでしょう？",
        choices: ["60cm", "90cm", "120cm", "150cm"],
        correctChoice: 2,
        correctTexts: [],
      },
      {
        id: "nijie-7",
        type: "choice",
        text: "今日の披露宴のメインディッシュのお肉料理（国産牛フィレ肉のポワレ）に添えられていたのは次のうちどれ？",
        choices: ["アスパラガスのグリル", "オーガニック茸のソテー", "ブロッコリー", "ベビーキャロット"],
        correctChoice: 1,
        correctTexts: [],
      },
      {
        id: "nijie-8",
        type: "choice",
        text: "（プロフィールムービーからの問題・未定）",
        choices: ["未定", "未定", "未定", "未定"],
        correctChoice: 0,
        correctTexts: [],
        sample: true,
      },
      {
        id: "nijie-9",
        type: "choice",
        text: "お色直しで再入場した際の、2人の衣装の組み合わせで正解はどれ？",
        choices: ["新郎：グレー ＆ 新婦：赤", "新郎：ネイビー ＆ 新婦：赤", "新郎：ネイビー ＆ 新婦：黄色", "新郎：グレー ＆ 新婦：黄色"],
        correctChoice: 1,
        correctTexts: [],
      },
      {
        id: "nijie-10",
        type: "choice",
        text: "今日の結婚式で「使われていない」曲は次のうちどれ？",
        choices: ["LOVE SO SWEET / 嵐", "愛をこめて花束を / Superfly", "Butterfly / 木村カエラ", "ありがとう / いきものがかり"],
        correctChoice: 1,
        correctTexts: [],
      },
    ],
  },
];
