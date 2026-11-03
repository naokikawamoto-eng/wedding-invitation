"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Ornament, Title, inputClass } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="animate-float text-center text-5xl" aria-hidden>
        💐
      </div>
      <Title sub="二次会クイズ大会">Wedding Quiz</Title>
      <Ornament />
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) router.push(`/play/${code.trim().toUpperCase()}`);
          }}
        >
          <label className="block text-sm font-bold">
            ルームコード
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
      <p className="text-center text-xs text-ink-soft">会場の QR コードを読み取っても参加できます</p>
    </main>
  );
}
