import { letterForGuest, readLetterSession, sessionCookie, signLetterSession, cookieName } from "@/server/letters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenFrom(req: Request): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  const prefix = `${cookieName()}=`;
  const part = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : undefined;
}

/** 確定済みの名簿IDをクッキーに固定する。本文は返さない */
export async function POST(req: Request) {
  const requested = await readGuestId(req);
  const existing = readLetterSession(tokenFrom(req));
  const headers = new Headers({ "cache-control": "no-store" });
  if (!requested) return Response.json({ hasMessage: false }, { headers });
  if (existing && existing !== requested) return Response.json({ hasMessage: false }, { headers });
  const hasMessage = letterForGuest(requested) != null;
  if (!existing) headers.set("set-cookie", sessionCookie(signLetterSession(requested)));
  return Response.json({ hasMessage }, { headers });
}

async function readGuestId(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { guestId?: unknown };
    return typeof body.guestId === "string" ? body.guestId : null;
  } catch {
    return null;
  }
}
