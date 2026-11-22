"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "../ui";

type Letter = { callName: string; body: string };

/** 名前確定後の本人だけ。他の人の本文は受け取らない */
export function PersonalLetter({ guestId }: { guestId: string }) {
  const [hasMessage, setHasMessage] = useState(false);
  const [open, setOpen] = useState(false);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    setHasMessage(false);
    setOpen(false);
    setLetter(null);
    void fetch("/api/letter/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guestId }),
      credentials: "same-origin",
    })
      .then((res) => res.json())
      .then((data: { hasMessage?: boolean }) => {
        if (!cancel) setHasMessage(data.hasMessage === true);
      })
      .catch(() => {
        if (!cancel) setHasMessage(false);
      });
    return () => {
      cancel = true;
    };
  }, [guestId]);

  async function openLetter() {
    setError("");
    setOpen(true);
    if (letter) return;
    try {
      const res = await fetch(`/api/letter?guestId=${encodeURIComponent(guestId)}`, { credentials: "same-origin", cache: "no-store" });
      const data = (await res.json()) as { hasMessage?: boolean; callName?: string; body?: string; error?: string };
      if (!res.ok || !data.hasMessage || !data.body) {
        setError(data.error || "メッセージを開けませんでした");
        return;
      }
      setLetter({ callName: data.callName ?? "", body: data.body });
    } catch {
      setError("メッセージを開けませんでした");
    }
  }

  if (!hasMessage && !open) return null;
  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => void openLetter()}>
        あなたへのメッセージ
      </Button>
    );
  }
  return (
    <Card className="space-y-4 bg-[#fffdf8]">
      <div className="text-center">
        <p className="font-display text-3xl italic text-gold-600">For you</p>
        <h2 className="mt-1 text-lg font-bold">あなたへのメッセージ</h2>
        {letter?.callName && <p className="mt-3 text-sm text-ink-soft">{letter.callName}</p>}
      </div>
      {letter ? (
        <p className="whitespace-pre-wrap text-[15px] leading-8">{letter.body}</p>
      ) : (
        <p className="text-center text-sm text-ink-soft">{error || "開いています…"}</p>
      )}
      <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
        閉じる
      </Button>
    </Card>
  );
}
