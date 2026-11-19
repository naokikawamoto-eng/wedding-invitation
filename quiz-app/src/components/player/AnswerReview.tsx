"use client";

import { useGuestPacket, useRoom } from "@/lib/hooks";
import type { Reveal } from "@/lib/types";
import { QuestionBody } from "../QuestionBody";
import { Card, ErrorNote, Spinner } from "../ui";

/** 送信済みのクイズ。自分の回答だけを出し、主催者が発表した問題だけ正解を足す */
export function AnswerReview({ roomId }: { roomId: string }) {
  const room = useRoom(roomId);
  const packet = useGuestPacket(roomId);
  if (room.error || packet.error) return <ErrorNote error={room.error || packet.error} />;
  if (!room.data) return <Spinner />;
  if (!packet.questions.length) return <p className="text-center text-sm text-ink-soft">回答はありません</p>;
  return (
    <div className="space-y-4">
      <p className="text-center text-sm font-bold text-blush-600">回答済み</p>
      {packet.questions.map((question, index) => {
        const mine = packet.myAnswers.find((answer) => answer.questionId === question.id);
        const sheet = packet.answerSheet?.find((item) => item.questionId === question.id) ?? null;
        const own = question.type === "choice" ? (mine?.choice != null ? question.choices[mine.choice] : "") : (mine?.text ?? "");
        return (
          <Card key={question.id} className="space-y-2">
            <QuestionBody question={{ text: question.text, imageUrl: question.imageUrl, type: question.type }} number={index + 1} total={packet.questions.length} />
            <p className="text-sm">
              あなたの回答：<b>{own || "未回答"}</b>
            </p>
            {sheet && <Announced sheet={sheet} choices={question.choices} mine={mine?.choice ?? null} />}
          </Card>
        );
      })}
    </div>
  );
}

function Announced({ sheet, choices, mine }: { sheet: Reveal; choices: string[]; mine: number | null }) {
  if (sheet.type === "choice" && sheet.correctChoice != null) {
    const right = mine === sheet.correctChoice;
    return (
      <p className="text-sm font-bold">
        {right ? "正解" : "不正解"}
        <span className="ml-2 font-normal text-ink-soft">発表された正解：{choices[sheet.correctChoice]}</span>
      </p>
    );
  }
  if (sheet.type === "text" && sheet.correctTexts.length) {
    return <p className="text-sm text-ink-soft">発表された正解：{sheet.correctTexts.join(" / ")}</p>;
  }
  return null;
}
