import { DEFAULT_RACE_HORSES, raceGuestOpen, type RaceBoard, type RaceHorse, type RacePick, type RaceView } from "../lib/race";
import type { QuizState } from "./engine";

export type RaceAction =
  | { op: "raceOpen" }
  | { op: "raceClose" }
  | { op: "raceSaveHorses"; horses: { id: string; number: number; name: string; sexAge: string; jockey: string; odds: string }[] }
  | { op: "raceSetWinner"; winnerId: string }
  | { op: "raceClearResult" }
  | { op: "racePick"; uid: string; nickname: string; horseId: string };

const NONE = "none";

export function isRaceAction(action: { op: string }): action is RaceAction {
  return action.op.startsWith("race");
}

export function raceView(state: QuizState, now = Date.now()): RaceView {
  const guestOpen = raceGuestOpen(now);
  const board = state.race;
  if (!board) {
    return { phase: "waiting", horses: DEFAULT_RACE_HORSES, picks: [], winnerId: null, guestOpen };
  }
  return {
    phase: board.phase,
    horses: [...board.horses].sort((a, b) => a.popularity - b.popularity || a.number - b.number),
    picks: Object.values(board.picks).sort((a, b) => a.nickname.localeCompare(b.nickname, "ja") || a.uid.localeCompare(b.uid)),
    winnerId: board.winnerId,
    guestOpen,
  };
}

export function applyRace(state: QuizState, action: RaceAction, now: number): QuizState {
  switch (action.op) {
    case "raceOpen": {
      const current = state.race;
      const next: RaceBoard = current
        ? { ...current, phase: "open", winnerId: null }
        : { horses: DEFAULT_RACE_HORSES.map((horse) => ({ ...horse })), phase: "open", winnerId: null, picks: {} };
      return { ...state, race: next };
    }
    case "raceClose": {
      const current = mustBoard(state);
      return { ...state, race: { ...current, phase: "locked", winnerId: null } };
    }
    case "raceSaveHorses": {
      const horses = cleanHorses(action.horses, state.race?.horses ?? DEFAULT_RACE_HORSES);
      const current = state.race;
      const next: RaceBoard = current
        ? { ...current, horses }
        : { horses, phase: "locked", winnerId: null, picks: {} };
      return { ...state, race: next };
    }
    case "raceSetWinner": {
      const current = mustBoard(state);
      const winnerId = action.winnerId === NONE ? NONE : action.winnerId;
      if (winnerId !== NONE && !current.horses.some((horse) => horse.id === winnerId)) {
        throw new Error("勝ち馬を選んでください");
      }
      return { ...state, race: { ...current, phase: "result", winnerId } };
    }
    case "raceClearResult": {
      const current = mustBoard(state);
      return { ...state, race: { ...current, phase: "locked", winnerId: null } };
    }
    case "racePick": {
      if (!raceGuestOpen(now)) throw new Error("競馬企画は16:00から始まります");
      const current = state.race;
      if (!current || current.phase !== "open") throw new Error("いまは選べません");
      if (!current.horses.some((horse) => horse.id === action.horseId)) throw new Error("馬を選んでください");
      const uid = action.uid.trim();
      if (!uid || uid.length > 80) throw new Error("参加者を確認できません");
      const nickname = cleanName(action.nickname);
      const prev = current.picks[uid];
      if (prev && prev.horseId === action.horseId && prev.nickname === nickname) return state;
      const pick: RacePick = { uid, nickname, horseId: action.horseId, pickedAt: now };
      return { ...state, race: { ...current, picks: { ...current.picks, [uid]: pick } } };
    }
  }
}

function mustBoard(state: QuizState): RaceBoard {
  if (!state.race) throw new Error("先に受付を開始してください");
  return state.race;
}

function cleanName(input: string): string {
  const nickname = input.replace(/\s+/g, " ").trim();
  if (nickname.length < 1 || nickname.length > 20) throw new Error("名前を確認してください");
  return nickname;
}

function cleanHorses(
  input: { id: string; number: number; name: string; sexAge: string; jockey: string; odds: string }[],
  current: RaceHorse[],
): RaceHorse[] {
  if (input.length !== current.length) throw new Error("6頭ぶん入力してください");
  return current.map((horse) => {
    const draft = input.find((item) => item.id === horse.id);
    if (!draft) throw new Error("6頭ぶん入力してください");
    const number = Math.round(draft.number);
    if (!Number.isInteger(number) || number < 1 || number > 18) throw new Error("馬番は1〜18にしてください");
    const name = draft.name.replace(/\s+/g, " ").trim();
    if (name.length < 1 || name.length > 20) throw new Error("馬名は1〜20文字にしてください");
    const sexAge = draft.sexAge.replace(/\s+/g, "").trim();
    if (sexAge.length > 6) throw new Error("性齢を確認してください");
    const jockey = draft.jockey.replace(/\s+/g, " ").trim();
    if (jockey.length < 1 || jockey.length > 12) throw new Error("騎手名は1〜12文字にしてください");
    const odds = draft.odds.replace(/倍/g, "").trim();
    if (!/^\d{1,3}(\.\d)?$/.test(odds)) throw new Error("オッズは 5.0 のように入れてください");
    return { ...horse, number, name, sexAge, jockey, odds };
  });
}
