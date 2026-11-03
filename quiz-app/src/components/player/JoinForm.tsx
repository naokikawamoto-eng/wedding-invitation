"use client";

import { useState } from "react";
import { joinRoom } from "@/lib/quiz";
import type { Room } from "@/lib/types";
import { Button, Card, ErrorNote, Ornament, Title, inputClass } from "../ui";

export function JoinForm({ room, uid }: { room: Room; uid: string }) {
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const name = nickname.trim();

  return (
    <div className="flex min-h-[85dvh] flex-col justify-center gap-6">
      <Title sub={room.title}>Welcome</Title>
      <Ornament />
      <Card>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            try {
              await joinRoom(room.id, uid, name);
            } catch (err) {
              setError(err);
              setBusy(false);
            }
          }}
        >
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
          <p className="text-xs text-ink-soft">ランキングに表示されます（20文字まで）</p>
          <ErrorNote error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={!name || busy}>
            {busy ? "入室中…" : "入室する"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
