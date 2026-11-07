"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Ornament, Title, inputClass } from "@/components/ui";
import { EVENT_LABEL, PRESET_ROOMS } from "@/lib/events";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="animate-float text-center text-5xl" aria-hidden>
        💐
      </div>
      <Title sub="河本直樹 & 磯野有梨花">Wedding Quiz</Title>
      <Ornament />
      <div className="space-y-3">
        {PRESET_ROOMS.map((room) => (
          <Link
            key={room.id}
            href={`/play/${room.id}`}
            className="block rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-blush-100/60 transition hover:shadow-xl"
          >
            <p className="text-xs font-bold text-blush-600">{EVENT_LABEL[room.event]}</p>
            <p className="mt-1 text-xl font-bold">クイズに参加する</p>
            <p className="mt-1 text-sm text-ink-soft">{room.hint}</p>
            <p className="mt-1 text-sm text-ink-soft">
              コード <span className="font-display text-lg tracking-widest text-gold-600">{room.id}</span>
            </p>
          </Link>
        ))}
      </div>
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) router.push(`/play/${code.trim().toUpperCase()}`);
          }}
        >
          <label className="block text-sm font-bold">
            別のルームコード
            <input
              className={`${inputClass} mt-2 text-center font-display text-3xl tracking-[0.3em] uppercase`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9a-z]/gi, ""))}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABCDE"
            />
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={!code.trim()}>
            参加する
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-ink-soft">
        会場の QR コードを読み取っても参加できます
        <br />
        <Link href="/admin" className="mt-2 inline-block underline">
          主催者の方はこちら
        </Link>
      </p>
    </main>
  );
}
