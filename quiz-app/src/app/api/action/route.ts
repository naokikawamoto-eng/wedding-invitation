import { isHost } from "@/server/auth";
import type { Action } from "@/server/engine";
import { runAction } from "@/server/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOST_OPS = new Set([
  "createRoom",
  "saveQuestion",
  "deleteQuestion",
  "swapQuestionOrder",
  "showQuestion",
  "openQuiz",
  "closeAnswers",
  "revealAnswer",
  "revealAll",
  "advanceReveal",
  "showStandings",
  "recalculateScores",
  "finishQuiz",
  "resetRoom",
  "removeParticipant",
  "setAnswerSeconds",
]);

export async function POST(req: Request) {
  let body: { op?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "形式を確認してください" }, { status: 400 });
  }
  const op = body?.op;
  if (op !== "join" && op !== "answer" && op !== "setPrizeWish" && !HOST_OPS.has(op ?? "")) {
    return Response.json({ error: "操作を確認してください" }, { status: 400 });
  }
  if (HOST_OPS.has(op ?? "") && !isHost(req)) {
    return Response.json({ error: "合言葉が違います" }, { status: 401 });
  }
  try {
    const { createdRoomId } = await runAction(body as Action, Date.now());
    return Response.json({ ok: true, roomId: createdRoomId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "失敗しました";
    console.error(error);
    return Response.json({ error: message }, { status: message.includes("混み合って") ? 503 : 400 });
  }
}
