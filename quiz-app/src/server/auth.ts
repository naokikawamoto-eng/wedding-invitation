import { timingSafeEqual } from "node:crypto";

/** 本番は Vercel の QUIZ_HOST_PASSCODE 必須。ローカルだけ初期の合言葉で入れる */
export function expectedPasscode(): string {
  if (process.env.QUIZ_HOST_PASSCODE) return process.env.QUIZ_HOST_PASSCODE;
  if (process.env.VERCEL) return "";
  return "wedding2026";
}

/** true のあいだだけ主催者の合言葉を見ない。外すと元の確認に戻る */
export function hostGateOpen(): boolean {
  return process.env.QUIZ_HOST_OPEN === "true";
}

export function isHost(req: Request): boolean {
  if (hostGateOpen()) return true;
  const expected = expectedPasscode();
  const given = req.headers.get("x-quiz-passcode") ?? "";
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
