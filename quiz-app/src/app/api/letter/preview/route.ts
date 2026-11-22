import { isHost } from "@/server/auth";
import { letterForGuest } from "@/server/letters";
import { receptionGuest } from "@/lib/reception-guests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 主催者だけが、1人ぶんの手紙を読む。ゲストの参加状態は変えない */
export async function GET(req: Request) {
  if (!isHost(req)) return Response.json({ error: "合言葉が違います" }, { status: 401, headers: { "cache-control": "no-store" } });
  const guestId = new URL(req.url).searchParams.get("guestId") ?? "";
  const guest = receptionGuest(guestId);
  const letter = letterForGuest(guestId);
  if (!guest || !letter) return Response.json({ hasMessage: false }, { headers: { "cache-control": "no-store" } });
  return Response.json(
    { hasMessage: true, name: guest.name, callName: letter.callName, body: letter.body },
    { headers: { "cache-control": "no-store" } },
  );
}
