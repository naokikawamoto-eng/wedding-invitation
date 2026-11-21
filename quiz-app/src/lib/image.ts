import { passcode } from "./transport";

/** 会場の回線でも軽く表示できるよう、長辺 1280px の JPEG に縮小する */
async function resize(file: File, maxSize = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像を変換できませんでした"))), "image/jpeg", quality),
  );
}

export async function uploadQuestionImage(_roomId: string, file: File): Promise<string> {
  const blob = file.type === "image/gif" ? file : await resize(file).catch(() => file);
  const form = new FormData();
  form.set("file", blob, file.name);
  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      headers: { "x-quiz-passcode": passcode() },
      body: form,
    });
  } catch {
    throw new Error("通信できませんでした");
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "アップロードに失敗しました");
  return data.url;
}
