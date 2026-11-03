import { requestRefresh } from "./refresh";

const PASS_KEY = "wedding-quiz-host-passcode";

export function passcode(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PASS_KEY) ?? "";
}

export function setPasscode(value: string) {
  localStorage.setItem(PASS_KEY, value);
}

export function clearPasscode() {
  localStorage.removeItem(PASS_KEY);
}

export async function verifyPasscode(value: string) {
  setPasscode(value);
  let res: Response;
  try {
    res = await fetch("/api/sync?view=list", {
      headers: { "x-quiz-passcode": value },
      cache: "no-store",
    });
  } catch {
    clearPasscode();
    throw new Error("通信できませんでした");
  }
  if (!res.ok) {
    clearPasscode();
    throw new Error("合言葉が違います");
  }
}

export async function postAction(body: unknown, host = false): Promise<{ roomId?: string }> {
  let res: Response;
  try {
    res = await fetch("/api/action", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(host ? { "x-quiz-passcode": passcode() } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("通信できませんでした。電波のよい場所でもう一度お試しください");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; roomId?: string };
  if (!res.ok) throw new Error(data.error || "失敗しました");
  await requestRefresh();
  return data;
}
