/** 画面表示だけ。保存する名前には付けない */
export function withHonorific(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.endsWith("様")) return trimmed;
  return `${trimmed} 様`;
}
