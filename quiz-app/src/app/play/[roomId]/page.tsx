"use client";

import { useParams } from "next/navigation";
import { JoinForm } from "@/components/player/JoinForm";
import { GuestFlow } from "@/components/player/GuestFlow";
import { PlayerGame } from "@/components/player/PlayerGame";
import { ErrorNote, Spinner } from "@/components/ui";
import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "@/lib/events";
import { useGuestUser, useParticipant, useRoom } from "@/lib/hooks";

export default function PlayPage() {
  const roomId = useParams<{ roomId: string }>().roomId.toUpperCase();
  if (roomId === RECEPTION_ROOM_ID || roomId === AFTERPARTY_ROOM_ID) {
    return <GuestFlow initialRoom={roomId} />;
  }
  return <OtherRoom roomId={roomId} />;
}

function OtherRoom({ roomId }: { roomId: string }) {
  const { user, error: authError } = useGuestUser();
  const room = useRoom(user ? roomId : null);
  const me = useParticipant(user ? roomId : null, user?.uid);
  const error = authError ?? room.error ?? me.error;
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
      {error ? (
        <ErrorNote error={error} />
      ) : room.data === null ? (
        <p className="py-20 text-center text-ink-soft">ルーム「{roomId}」が見つかりません</p>
      ) : !user || !room.data || me.data === undefined ? (
        <Spinner />
      ) : !me.data ? (
        <JoinForm room={room.data} uid={user.uid} />
      ) : (
        <PlayerGame room={room.data} me={me.data} />
      )}
    </main>
  );
}
