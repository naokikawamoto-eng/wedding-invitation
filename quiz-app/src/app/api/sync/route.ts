import { NextRequest } from "next/server";
import { isHost } from "@/server/auth";
import { cleanRoomId, project } from "@/server/engine";
import { readState, withGuestBlobs } from "@/server/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEWS = new Set(["guest", "screen", "host", "list"]);

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view") ?? "guest";
  if (!VIEWS.has(view)) return Response.json({ error: "画面を確認してください" }, { status: 400 });
  if ((view === "host" || view === "list") && !isHost(req)) {
    return Response.json({ error: "合言葉が違います" }, { status: 401 });
  }

  let roomId = req.nextUrl.searchParams.get("roomId")?.trim() ?? "";
  if (roomId) {
    try {
      roomId = cleanRoomId(roomId);
    } catch {
      return Response.json({ serverNow: Date.now(), version: 0, room: null }, { headers: { "cache-control": "no-store" } });
    }
  }

  try {
    const now = Date.now();
    const loaded = await readState(now);
    const state = roomId
      ? await withGuestBlobs(loaded, roomId, { view: view as "guest" | "host" | "screen" | "list", uid: req.nextUrl.searchParams.get("uid") ?? "" })
      : loaded;
    const body = project(
      state,
      { view: view as "guest" | "screen" | "host" | "list", roomId: roomId || undefined, uid: req.nextUrl.searchParams.get("uid") ?? "" },
      now,
    );
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "読み込めませんでした";
    return Response.json({ error: message }, { status: 500 });
  }
}
