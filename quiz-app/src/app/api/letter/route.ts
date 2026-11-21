import { letterForGuest, readLetterSession, cookieName } from "@/server/letters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenFrom(req: Request): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  const prefix = `${cookieName()}=`;
  const part = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : undefined;
}

/** クッキーと一致する名簿IDの手紙だけを返す。別のIDでは本文を返さない */
export async function GET(req: Request) {
  const guestId = readLetterSession(tokenFrom(req));
  const requested = new URL(req.url).searchParams.get("guestId");
  const headers = { "cache-control": "no-store" };
  if (!guestId) return Response.json({ error: "名前を確認してください" }, { status: 401, headers });
  if (!requested || requested !== guestId) return Response.json({ hasMessage: false }, { status: 403, headers });
  const letter = letterForGuest(guestId);
  if (!letter) return Response.json({ hasMessage: false }, { headers });
  return Response.json({ hasMessage: true, callName: letter.callName, body: letter.body }, { headers });
}
