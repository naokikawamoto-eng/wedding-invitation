import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import { randomCode } from "./quiz";

/** 会場の回線でも軽く表示できるよう、長辺 1280px の JPEG に縮小する */
async function resize(file: File, maxSize = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // 透過 PNG の背景が黒くならないように
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像を変換できませんでした"))), "image/jpeg", quality),
  );
}

export async function uploadQuestionImage(roomId: string, file: File): Promise<string> {
  // GIF はアニメーションを残すためそのまま。縮小に失敗した形式（HEIC など）も原本を送る
  const blob = file.type === "image/gif" ? file : await resize(file).catch(() => file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "img");
  const imageRef = ref(storage(), `rooms/${roomId}/images/${Date.now()}-${randomCode(6)}.${ext}`);
  await uploadBytes(imageRef, blob, {
    contentType: blob.type || "image/jpeg",
    cacheControl: "public, max-age=31536000",
  });
  return getDownloadURL(imageRef);
}
