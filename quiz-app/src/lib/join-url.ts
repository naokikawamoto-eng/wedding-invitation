import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "./events";

/** 会場のQRが指す公開入口。プレビューや保護付きの配信URLにはしない */
export const PUBLIC_QUIZ_ORIGIN = "https://wedding-quiz-flame-alpha.vercel.app";

/**
 * 一次会・二次会は名前選択から始まる /play。
 * それ以外のルームだけ /play/コード。
 * 手元の開発以外は、画面を開いたホスト名に関わらず公開URLにする。
 */
export function quizEntryUrl(input: { hostname: string; origin: string; roomId: string; lanOrigin?: string }): string {
  const local = input.hostname === "localhost" || input.hostname === "127.0.0.1";
  const origin = (local ? input.lanOrigin || input.origin : PUBLIC_QUIZ_ORIGIN).replace(/\/$/, "");
  const path = input.roomId === RECEPTION_ROOM_ID || input.roomId === AFTERPARTY_ROOM_ID ? "/play" : `/play/${input.roomId}`;
  return `${origin}${path}`;
}
