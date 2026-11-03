export const CHOICE_LETTERS = ["A", "B", "C", "D"] as const;
export const MAX_CHOICES = CHOICE_LETTERS.length;

/** 選択肢ごとの色。スマホ・管理画面・プロジェクターで同じ色を使い、口頭でも「ピンクのA」と伝えられるようにする */
export const CHOICE_STYLES = [
  { badge: "bg-blush-500", idle: "border-blush-300", picked: "bg-blush-500 border-blush-500", bar: "bg-blush-400" },
  { badge: "bg-gold-500", idle: "border-gold-300", picked: "bg-gold-500 border-gold-500", bar: "bg-gold-400" },
  { badge: "bg-sage-500", idle: "border-sage-500/50", picked: "bg-sage-500 border-sage-500", bar: "bg-sage-500" },
  { badge: "bg-lilac-500", idle: "border-lilac-500/50", picked: "bg-lilac-500 border-lilac-500", bar: "bg-lilac-500" },
] as const;
