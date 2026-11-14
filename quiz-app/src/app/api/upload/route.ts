import { isHost } from "@/server/auth";
import { saveImage } from "@/server/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isHost(req)) return Response.json({ error: "合言葉が違います" }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "画像を送れませんでした" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "画像を選んでください" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "画像ファイルを選んでください" }, { status: 400 });
  if (file.size > 6_000_000) return Response.json({ error: "画像が大きすぎます（6MBまで）" }, { status: 400 });
  try {
    const url = await saveImage(Buffer.from(await file.arrayBuffer()), file.type);
    return Response.json({ url });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "アップロードに失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
