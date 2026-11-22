import { NextRequest } from "next/server";
import { readImage } from "@/server/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 非公開 Blob に置いた問題画像を、正解データとは別に配信する */
export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.searchParams.get("path") ?? "";
  try {
    const image = await readImage(pathname);
    if (!image) return new Response("not found", { status: 404 });
    return new Response(image.stream, {
      headers: {
        "content-type": image.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("not found", { status: 404 });
  }
}
