import { createHmac, timingSafeEqual } from "node:crypto";
import letters from "./guest-letters.json";
import { receptionGuest } from "../lib/reception-guests";

const COOKIE = "wedding-quiz-letter";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

type StoredLetter = { callName: string; body: string };
const BY_GUEST = letters as Record<string, StoredLetter>;

export type OwnLetter = { callName: string; body: string };

/** 空白と「様」を除いて氏名をそろえる */
export function normalizeGuestName(name: string): string {
  return name.replace(/[\s\u3000]/g, "").replace(/様/g, "");
}

function secret(): string {
  return process.env.QUIZ_MESSAGE_SECRET || process.env.QUIZ_HOST_PASSCODE || "wedding-quiz-letter-dev";
}

export function signLetterSession(guestId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ guestId, exp: now + MAX_AGE_SEC * 1000 }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readLetterSession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { guestId?: string; exp?: number };
    if (!data.guestId || typeof data.exp !== "number" || data.exp < now) return null;
    return data.guestId;
  } catch {
    return null;
  }
}

export function cookieName(): string {
  return COOKIE;
}

export function sessionCookie(token: string): string {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SEC}${secure}`;
}

/** 名簿IDから、その人の手紙だけを返す。新婦側・テスト・手紙のない人は null */
export function letterForGuest(guestId: string): OwnLetter | null {
  const guest = receptionGuest(guestId);
  if (!guest || guest.test || guest.side !== "groom") return null;
  const found = BY_GUEST[guest.id];
  if (!found?.body) return null;
  return { callName: found.callName, body: found.body };
}

export function letterGuestIds(): string[] {
  return Object.keys(BY_GUEST);
}
