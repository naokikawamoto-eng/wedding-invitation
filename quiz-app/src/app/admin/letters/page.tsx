"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { Button, Card, ErrorNote } from "@/components/ui";
import { RECEPTION_GUESTS } from "@/lib/reception-guests";
import { passcode } from "@/lib/transport";

type Letter = { name: string; callName: string; body: string };

/** 主催者の読み取り確認。1人ずつだけ受け取り、参加状態は変えない */
export default function HostLettersPage() {
  return (
    <AdminGate>
      {() => <HostLetters />}
    </AdminGate>
  );
}

function HostLetters() {
  const groom = RECEPTION_GUESTS.filter((guest) => guest.side === "groom" && !guest.test);
  const [guestId, setGuestId] = useState(groom[0]?.id ?? "");
  const [letter, setLetter] = useState<Letter | null>(null);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  async function readOne() {
    setBusy(true);
    setError(undefined);
    setLetter(null);
    try {
      const res = await fetch(`/api/letter/preview?guestId=${encodeURIComponent(guestId)}`, {
        headers: { "x-quiz-passcode": passcode() },
        cache: "no-store",
      });
      const data = (await res.json()) as { hasMessage?: boolean; name?: string; callName?: string; body?: string; error?: string };
      if (!res.ok || !data.hasMessage || !data.body) {
        setError(new Error(data.error || "この人への手紙はありません"));
        return;
      }
      setLetter({ name: data.name ?? "", callName: data.callName ?? "", body: data.body });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link href="/admin" className="text-sm text-ink-soft">
        ← ルーム一覧
      </Link>
      <h1 className="text-xl font-bold">手紙の確認</h1>
      <p className="text-sm text-ink-soft">1人ずつ読みます。クイズの参加や回答は変わりません。</p>
      <Card className="space-y-3">
        <select className="w-full rounded-2xl border border-blush-200 bg-white px-3 py-3" value={guestId} onChange={(e) => setGuestId(e.target.value)}>
          {groom.map((guest) => (
            <option key={guest.id} value={guest.id}>
              {guest.name}
            </option>
          ))}
        </select>
        <Button className="w-full" disabled={busy || !guestId} onClick={() => void readOne()}>
          {busy ? "開いています…" : "この人の手紙を見る"}
        </Button>
        <ErrorNote error={error} />
      </Card>
      {letter && (
        <Card className="space-y-3 bg-[#fffdf8]">
          <h2 className="text-center font-bold">{letter.name}</h2>
          {letter.callName && <p className="text-center text-sm text-ink-soft">{letter.callName}</p>}
          <p className="whitespace-pre-wrap text-[15px] leading-8">{letter.body}</p>
        </Card>
      )}
    </main>
  );
}
