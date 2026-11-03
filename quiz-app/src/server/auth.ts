import { timingSafeEqual } from "node:crypto";

/** 本番は Vercel の QUIZ_HOST_PASSCODE 必須。ローカルだけ初期の合言葉で入れる */
export function expectedPasscode(): string {
  if (process.env.QUIZ_HOST_PASSCODE) return process.env.QUIZ_HOST_PASSCODE;
  if (process.env.VERCEL) return "";
  return "wedding2026";
}

export function isHost(req: Request): boolean {
  const expected = expectedPasscode();
  const given = req.headers.get("x-quiz-passcode") ?? "";
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
