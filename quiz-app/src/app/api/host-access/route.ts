import { hostGateOpen } from "@/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 合言葉そのものは返さない。確認を一時的に外しているかどうかだけ */
export async function GET() {
  return Response.json({ open: hostGateOpen() }, { headers: { "cache-control": "no-store" } });
}
