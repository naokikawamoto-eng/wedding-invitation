import { isPrizeId } from "../lib/prizes";
import type { Answer, Participant } from "../lib/types";
import type { QuizState } from "./engine";

/** 部屋ファイルとは別に置いた、参加者1人分の入室と回答 */
export interface GuestRecord {
  participant: Participant;
  answers: Answer[];
}

/**
 * 個人ファイルの参加者を部屋の参加者一覧へ重ねる。
 * 得点は部屋側を残す（発表時に回答から計算し直す）。ニックネームは個人ファイルを優先する。
 */
export function overlayParticipants(state: QuizState, roomId: string, people: Participant[]): QuizState {
  const room = state.rooms[roomId];
  if (!room || people.length === 0) return state;
  let participants = room.participants;
  let changed = false;
  for (const person of people) {
    if (!person || typeof person.id !== "string" || !person.id || person.id.length > 80) continue;
    const nickname = typeof person.nickname === "string" ? person.nickname.trim() : "";
    if (!nickname || nickname.length > 20) continue;
    const prev = participants[person.id];
    const prizeWish = isPrizeId(person.prizeWish) ? person.prizeWish : prev?.prizeWish;
    const merged: Participant = prev
      ? { ...prev, nickname, ...(prizeWish ? { prizeWish } : {}) }
      : { id: person.id, nickname, score: 0, totalTimeMs: 0, joinedAt: person.joinedAt ?? null, ...(prizeWish ? { prizeWish } : {}) };
    if (
      prev &&
      prev.nickname === merged.nickname &&
      (prev.prizeWish ?? null) === (merged.prizeWish ?? null) &&
      prev.score === merged.score
    ) {
      continue;
    }
    if (!changed) participants = { ...participants };
    participants[person.id] = merged;
    changed = true;
  }
  if (!changed) return state;
  return { ...state, rooms: { ...state.rooms, [roomId]: { ...room, participants } } };
}

/**
 * 個人ファイルの回答を部屋の回答へ重ねる。
 * 同じ問題は answeredAt が新しい方だけを残す。古い応答で新しい選択を戻さない。
 * 参加者一覧にいない uid は無視する（退室後のファイルが復活しないようにする）。
 */
export function overlayAnswers(state: QuizState, roomId: string, incoming: Answer[]): QuizState {
  const room = state.rooms[roomId];
  if (!room || incoming.length === 0) return state;
  let answers = room.answers;
  let changed = false;
  for (const raw of incoming) {
    if (!raw || typeof raw.uid !== "string" || typeof raw.questionId !== "string") continue;
    if (!room.participants[raw.uid]) continue;
    const id = `${raw.questionId}_${raw.uid}`;
    const prev = answers[id];
    const at = typeof raw.answeredAt === "number" ? raw.answeredAt : 0;
    if (prev && (prev.answeredAt ?? 0) >= at) continue;
    const choice = typeof raw.choice === "number" ? raw.choice : null;
    const text = typeof raw.text === "string" ? raw.text : null;
    if (!changed) answers = { ...answers };
    answers[id] = {
      id,
      questionId: raw.questionId,
      uid: raw.uid,
      nickname: raw.nickname || room.participants[raw.uid].nickname,
      choice,
      text,
      startedAt: typeof raw.startedAt === "number" ? raw.startedAt : (prev?.startedAt ?? at),
      answeredAt: at,
    };
    changed = true;
  }
  if (!changed) return state;
  return { ...state, rooms: { ...state.rooms, [roomId]: { ...room, answers } } };
}

export function overlayGuests(state: QuizState, roomId: string, guests: GuestRecord[]): QuizState {
  if (!state.rooms[roomId] || guests.length === 0) return state;
  const withPeople = overlayParticipants(
    state,
    roomId,
    guests.map((guest) => guest.participant),
  );
  return overlayAnswers(
    withPeople,
    roomId,
    guests.flatMap((guest) => guest.answers),
  );
}
