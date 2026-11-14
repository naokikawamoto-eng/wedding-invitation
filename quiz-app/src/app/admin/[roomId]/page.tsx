"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { ControlPanel } from "@/components/admin/ControlPanel";
import { QuestionManager } from "@/components/admin/QuestionManager";
import { JoinQR } from "@/components/JoinQR";
import { Ranking } from "@/components/Ranking";
import { Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { EVENT_LABEL } from "@/lib/events";
import { useHostData, useRoom } from "@/lib/hooks";
import { removeParticipant } from "@/lib/quiz";
import type { Room } from "@/lib/types";

const TABS = [
  { id: "control", label: "進行" },
  { id: "questions", label: "問題" },
  { id: "ranking", label: "ランキング" },
  { id: "analytics", label: "分析" },
] as const;

export default function AdminRoomPage() {
  const roomId = useParams<{ roomId: string }>().roomId.toUpperCase();
  return (
    <AdminGate>
      {() => <RoomGuard roomId={roomId} />}
    </AdminGate>
  );
}

function RoomGuard({ roomId }: { roomId: string }) {
  const room = useRoom(roomId, "host");
  if (room.error) return <ErrorNote error={room.error} />;
  if (room.data === undefined) return <Spinner />;
  if (!room.data) return <p className="py-20 text-center">ルーム「{roomId}」が見つかりません</p>;
  return <AdminRoom room={room.data} />;
}

function AdminRoom({ room }: { room: Room }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("control");
  const [showQR, setShowQR] = useState(false);
  const { questions, keys, answers, participants, loading, error } = useHostData(room.id);

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
          ← ルーム一覧
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">
          {room.title}
          <span className="ml-2 text-sm font-bold text-ink-soft">{EVENT_LABEL[room.event]}</span>
        </h1>
        <span className="text-sm text-ink-soft">
          コード <b className="font-display text-2xl tracking-widest text-gold-600">{room.id}</b>
        </span>
        <span className="text-sm text-ink-soft">
          参加者 <b className="text-xl text-blush-600">{participants.length}</b> 人
        </span>
        <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)}>
          参加用QR
        </Button>
        <a href={`/screen/${room.id}`} target="_blank" rel="noreferrer">
          <Button variant="gold" size="sm">
            スクリーン表示 ↗
          </Button>
        </a>
      </header>

      {showQR && (
        <Card className="flex justify-center">
          <JoinQR roomId={room.id} size={220} />
        </Card>
      )}

      <nav className="flex gap-1 rounded-full bg-white/70 p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
              tab === t.id ? "bg-blush-500 text-white shadow" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            {t.id === "questions" && ` (${questions.length})`}
          </button>
        ))}
      </nav>

      <ErrorNote error={error} />
      {loading ? (
        <Spinner />
      ) : tab === "control" ? (
        <ControlPanel room={room} questions={questions} keys={keys} answers={answers} participants={participants} />
      ) : tab === "questions" ? (
        <QuestionManager room={room} questions={questions} keys={keys} />
      ) : tab === "ranking" ? (
        <Card>
          <Ranking
            participants={participants}
            showPrize={room.event === "reception"}
            byTime={room.event !== "reception"}
            showTime={room.event !== "reception"}
            onRemove={(p) => {
              if (confirm(`「${p.nickname}」を削除しますか？`)) removeParticipant(room.id, p.id);
            }}
          />
        </Card>
      ) : (
        <AnalyticsPanel room={room} questions={questions} keys={keys} answers={answers} />
      )}
    </main>
  );
}
