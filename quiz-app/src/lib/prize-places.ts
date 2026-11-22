import { rankParticipants, type Ranked } from "./scoring";
import type { Participant } from "./types";

/** 1位・2位・3位で、景品は3つ */
export const PRIZE_SLOT_COUNT = 3;

export interface ConfirmedPrize {
  person: Ranked;
  place: number;
}

export interface JankenGroup {
  rank: number;
  people: Ranked[];
  /** この同率グループが争う景品の順位。1〜3 */
  places: number[];
}

export interface PrizePlan {
  confirmed: ConfirmedPrize[];
  janken: JankenGroup[];
  /** 景品に関わる人。確定と、ジャンケン対象の同率者 */
  podium: Ranked[];
}

/**
 * 順位の上から景品枠を埋める。
 * 同順位の人数が、そのグループに残った枠の数と違う、または複数枠にまたがるときはジャンケン。
 * 4位以下だけが同率なら何もしない。
 */
export function prizePlan(ranked: Ranked[], slotCount = PRIZE_SLOT_COUNT): PrizePlan {
  const confirmed: ConfirmedPrize[] = [];
  const janken: JankenGroup[] = [];
  const podiumIds = new Set<string>();
  let index = 0;
  while (index < ranked.length) {
    const rank = ranked[index].rank;
    const people: Ranked[] = [];
    while (index < ranked.length && ranked[index].rank === rank) {
      people.push(ranked[index]);
      index += 1;
    }
    const places: number[] = [];
    for (let place = rank; place < rank + people.length; place += 1) {
      if (place >= 1 && place <= slotCount) places.push(place);
    }
    if (!places.length) break;
    if (people.length === 1) {
      confirmed.push({ person: people[0], place: places[0] });
    } else {
      janken.push({ rank, people, places });
    }
    for (const person of people) podiumIds.add(person.id);
  }
  return {
    confirmed,
    janken,
    podium: ranked.filter((person) => podiumIds.has(person.id)),
  };
}

export function prizePlanFor(participants: Participant[], byTime: boolean): PrizePlan {
  return prizePlan(rankParticipants(participants, byTime));
}

/** 自分がジャンケン対象なら、その順位 */
export function myJankenRank(plan: PrizePlan, uid: string): number | null {
  const group = plan.janken.find((item) => item.people.some((person) => person.id === uid));
  return group?.rank ?? null;
}

function placeList(places: number[]): string {
  return places.map((place) => `${place}位`).join("・");
}

/** ジャンケンが複数あるとき、上の順位から先に行う */
export function jankenStepLabel(index: number, total: number): string {
  if (total <= 1) return "";
  if (index === 0) return "まず、";
  if (index === 1) return "つぎに、";
  return `${index + 1}番目に、`;
}

export function jankenGroupLine(group: JankenGroup): string {
  const places = placeList(group.places);
  if (group.people.length === group.places.length) {
    return `${group.rank}位が${group.people.length}名です。ジャンケンで${places}の景品を決めてください。`;
  }
  return `${group.rank}位が${group.people.length}名です。ジャンケンで${places}の景品を決めます。対象は${group.people.length}名で${group.places.length}つの景品です。`;
}

/** 司会が読める一文。景品の品名は入れない。複数のジャンケンは上の順位から */
export function prizeHostScript(plan: PrizePlan): string {
  const lines: { order: number; text: string }[] = [];
  for (const row of plan.confirmed) {
    lines.push({ order: row.place, text: `${row.place}位は${row.person.nickname}様です。` });
  }
  plan.janken.forEach((group, index) => {
    lines.push({ order: group.rank, text: `${jankenStepLabel(index, plan.janken.length)}${jankenGroupLine(group)}` });
  });
  return lines
    .sort((a, b) => a.order - b.order)
    .map((line) => line.text)
    .join("");
}
