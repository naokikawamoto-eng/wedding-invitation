"use client";

import { jankenStepLabel, myJankenRank, prizeHostScript, prizePlanFor, type JankenGroup } from "@/lib/prize-places";
import type { Participant } from "@/lib/types";

export function PrizeHostNote({ participants, byTime }: { participants: Participant[]; byTime: boolean }) {
  const plan = prizePlanFor(participants, byTime);
  if (!plan.confirmed.length && !plan.janken.length) return null;
  const script = prizeHostScript(plan);
  return (
    <div className="mb-3 space-y-2 rounded-2xl bg-gold-100 px-3 py-3 text-sm">
      {plan.confirmed.map((row) => (
        <p key={row.person.id}>
          確定 <b>{row.place}位</b> {row.person.nickname}
        </p>
      ))}
      {plan.janken.map((group, index) => (
        <p key={group.rank}>
          {jankenStepLabel(index, plan.janken.length)}
          ジャンケン対象（{group.rank}位　{group.people.length}名で{group.places.length}枠）
        </p>
      ))}
      {script && <p className="font-bold">{script}</p>}
    </div>
  );
}

export function GuestJankenNote({ participants, byTime, uid }: { participants: Participant[]; byTime: boolean; uid: string }) {
  const rank = myJankenRank(prizePlanFor(participants, byTime), uid);
  if (!rank) return null;
  return <p className="rounded-2xl bg-gold-100 px-4 py-3 text-center text-sm font-bold">同率{rank}位！前へお越しください</p>;
}

export function jankenSummary(group: JankenGroup): string {
  return `対象：${group.people.length}名で${group.places.length}つの景品`;
}
