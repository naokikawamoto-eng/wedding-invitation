import type { QuizEvent } from "./types";

/** 当日の QR に印刷できる固定コード。一次会と二次会で回答も順位も混ざらない */
export const RECEPTION_ROOM_ID = "1122A";
export const AFTERPARTY_ROOM_ID = "1122B";

export const EVENT_LABEL: Record<QuizEvent, string> = {
  reception: "一次会（披露宴）",
  afterparty: "二次会",
};

export const PRESET_ROOMS = [
  { id: RECEPTION_ROOM_ID, event: "reception" as const, label: EVENT_LABEL.reception },
  { id: AFTERPARTY_ROOM_ID, event: "afterparty" as const, label: EVENT_LABEL.afterparty },
];
