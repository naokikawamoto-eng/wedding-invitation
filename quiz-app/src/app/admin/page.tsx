"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminGate, SignOutButton } from "@/components/admin/AdminGate";
import { Button, Card, ErrorNote, Spinner, Title, inputClass } from "@/components/ui";
import { EVENT_LABEL, PRESET_ROOMS } from "@/lib/events";
import { useRooms } from "@/lib/hooks";
import { createRoom } from "@/lib/quiz";
import type { QuizEvent } from "@/lib/types";

const PHASE_LABEL = { lobby: "受付中", question: "出題中", closed: "締切", revealed: "発表済", finished: "終了" };

export default function AdminHome() {
  return <AdminGate>{(user) => <RoomList uid={user.uid} />}</AdminGate>;
}

function RoomList({ uid }: { uid: string }) {
  const router = useRouter();
  const rooms = useRooms(true);
  const [title, setTitle] = useState("");
  const [event, setEvent] = useState<QuizEvent>("afterparty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <Title sub="一次会と二次会は別ルームです">Quiz Rooms</Title>
        <SignOutButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PRESET_ROOMS.map((preset) => (
          <Link
            key={preset.id}
            href={`/admin/${preset.id}`}
            className="rounded-3xl bg-white/85 p-5 shadow-md shadow-blush-100 transition hover:shadow-lg"
          >
            <p className="text-xs font-bold text-blush-600">{preset.label}</p>
            <p className="mt-1 font-bold">当日の進行を開く</p>
            <p className="font-display text-2xl tracking-widest text-gold-600">{preset.id}</p>
          </Link>
        ))}
      </div>

      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              router.push(`/admin/${await createRoom(title.trim(), uid, event)}`);
            } catch (err) {
              setError(err);
              setBusy(false);
            }
          }}
        >
          <p className="text-sm font-bold">リハーサル用など、別ルームを作る</p>
          <div className="flex gap-2">
            {(["reception", "afterparty"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEvent(value)}
                className={`flex-1 rounded-full py-2 text-sm font-bold ${
                  event === value ? "bg-blush-500 text-white" : "bg-blush-50 text-ink-soft"
                }`}
              >
                {EVENT_LABEL[value]}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：リハーサル"
              maxLength={40}
            />
            <Button type="submit" disabled={!title.trim() || busy} className="shrink-0">
              ルームを作成
            </Button>
          </div>
        </form>
        <ErrorNote error={error ?? rooms.error} />
      </Card>

      {!rooms.data && !rooms.error ? (
        <Spinner />
      ) : (
        <ul className="space-y-3">
          {rooms.data?.map((room) => (
            <li key={room.id}>
              <Link
                href={`/admin/${room.id}`}
                className="flex items-center gap-4 rounded-3xl bg-white/85 p-5 shadow-md shadow-blush-100 transition hover:shadow-lg"
              >
                <span className="font-display text-2xl font-semibold tracking-widest text-gold-600">{room.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{room.title}</span>
                  <span className="text-xs text-ink-soft">{EVENT_LABEL[room.event]}</span>
                </span>
                <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-bold text-blush-600">
                  {PHASE_LABEL[room.phase]}
                </span>
              </Link>
            </li>
          ))}
          {!rooms.data?.length && !rooms.error && <p className="text-center text-sm text-ink-soft">まだルームがありません</p>}
        </ul>
      )}
    </main>
  );
}
