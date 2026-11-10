"use client";

import { useParams } from "next/navigation";
import { Projector } from "@/components/screen/Projector";
import { ErrorNote, Spinner } from "@/components/ui";
import { useScreen } from "@/lib/hooks";

/** 会場のプロジェクター用。合言葉は不要。未発表の正解はサーバーが渡さない */
export default function ScreenPage() {
  const roomId = useParams<{ roomId: string }>().roomId.toUpperCase();
  const screen = useScreen(roomId);
  if (screen.error) return <ErrorNote error={screen.error} />;
  if (screen.room === undefined) return <Spinner />;
  if (!screen.room) return <p className="py-20 text-center text-2xl">ルーム「{roomId}」が見つかりません</p>;

  return (
    <Projector
      room={screen.room}
      participants={screen.participants}
      questions={screen.questions}
      question={screen.question}
      progress={screen.progress}
      answerSheet={screen.answerSheet}
      choiceCounts={screen.choiceCounts}
      answeredCount={screen.answeredCount}
      answerKey={screen.answerKey}
      answers={screen.answers}
    />
  );
}
