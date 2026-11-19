"use client";

import { useMemo, useState } from "react";
import { PrizeChoices, PrizeIntro } from "@/components/player/Prizes";
import { joinRoom } from "@/lib/quiz";
import type { PrizeId } from "@/lib/prizes";
import { RECEPTION_GUESTS } from "@/lib/reception-guests";
import type { Room } from "@/lib/types";
import { Button, Card, ErrorNote, Ornament, Title, inputClass } from "../ui";

export function JoinForm({ room, uid }: { room: Room; uid: string }) {
  const [nickname, setNickname] = useState("");
  const [guestId, setGuestId] = useState("");
  const [query, setQuery] = useState("");
  const [prize, setPrize] = useState<PrizeId | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const name = nickname.trim();
  const reception = room.event === "reception";
  const ready = reception ? !!guestId && !!prize : !!name;
  const matches = useMemo(() => {
    const q = query.replace(/\s+/g, "");
    if (!q) return RECEPTION_GUESTS;
    return RECEPTION_GUESTS.filter((guest) => guest.name.includes(q));
  }, [query]);

  return (
    <div className="flex min-h-[85dvh] flex-col justify-center gap-6">
      <Title sub={room.title}>Welcome</Title>
      <Ornament />
      {reception && <PrizeIntro />}
      <Card>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            try {
              if (reception) {
                const guest = RECEPTION_GUESTS.find((item) => item.id === guestId);
                if (!guest) throw new Error("名簿からお名前を選んでください");
                await joinRoom(room.id, uid, guest.name, prize, guest.id);
              } else {
                await joinRoom(room.id, uid, name);
              }
            } catch (err) {
              setError(err);
              setBusy(false);
            }
          }}
        >
          {reception ? (
            <div className="space-y-2">
              <label className="block text-sm font-bold">
                お名前
                <input
                  className={`${inputClass} mt-2 text-lg`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="名前で探す"
                  autoFocus
                />
              </label>
              <ul className="max-h-52 space-y-1 overflow-y-auto">
                {matches.map((guest) => (
                  <li key={guest.id}>
                    <button
                      type="button"
                      onClick={() => setGuestId(guest.id)}
                      className={`w-full rounded-2xl px-3 py-2 text-left font-bold ${
                        guestId === guest.id ? "bg-blush-500 text-white" : "bg-white"
                      }`}
                    >
                      {guest.name}
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">見つかりません</li>}
              </ul>
            </div>
          ) : (
            <label className="block text-sm font-bold">
              ニックネーム
              <input
                className={`${inputClass} mt-2 text-lg`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="例：新郎友人 たろう"
                autoFocus
              />
            </label>
          )}
          {!reception && <p className="text-xs text-ink-soft">ランキングに表示されます（20文字まで）</p>}
          {reception && <PrizeChoices value={prize} onChange={setPrize} disabled={busy} />}
          <ErrorNote error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={!ready || busy}>
            {busy ? "入室中…" : "入室する"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
