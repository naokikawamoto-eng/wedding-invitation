import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_RACE_HORSES, RACE_GUEST_OPENS_AT } from "../lib/race";
import { applyAction, emptyState, normalize, project } from "./engine";

test("競馬企画は6頭で、6頭目は7番人気のワールズエンド", () => {
  const state = normalize(emptyState(), 1_000);
  assert.equal(state.race, undefined);
  const view = project(state, { view: "race" }, 1_000);
  assert.equal(view.race?.phase, "waiting");
  assert.deepEqual(
    view.race?.horses.map((horse) => [horse.popularity, horse.number, horse.name, horse.jockey, horse.odds]),
    DEFAULT_RACE_HORSES.map((horse) => [horse.popularity, horse.number, horse.name, horse.jockey, horse.odds]),
  );
  assert.equal(view.race?.horses[5].name, "ワールズエンド");
  assert.equal(view.race?.horses[5].popularity, 7);
  assert.equal(view.race?.horses[5].odds, "12.5");
  assert.equal(state.race, undefined);
});

test("ゲストへの競馬は2026-11-22 16:00 JSTまで閉じ、その後はサーバー時刻で開く", () => {
  const before = RACE_GUEST_OPENS_AT - 1;
  const closed = project(normalize(emptyState(), before), { view: "guest", roomId: "1122A" }, before);
  assert.equal(closed.raceGuestOpen, false);
  assert.equal(closed.raceOpensAt, Date.parse("2026-11-22T07:00:00.000Z"));
  let state = applyAction(normalize(emptyState(), before), { op: "raceOpen" }, before);
  assert.throws(() => applyAction(state, { op: "racePick", uid: "a", nickname: "一郎", horseId: "pop1" }, before), /16:00/);
  assert.equal(state.race?.picks["a"], undefined);
  const open = project(state, { view: "race" }, RACE_GUEST_OPENS_AT);
  assert.equal(open.raceGuestOpen, true);
  assert.equal(open.race?.guestOpen, true);
  assert.equal(open.race?.phase, "open");
});

test("受付中は選び直せ、締切後の勝ち馬と該当なしを出せる", () => {
  const start = RACE_GUEST_OPENS_AT;
  let state = normalize(emptyState(), start);
  state = applyAction(state, { op: "raceOpen" }, start);
  state = applyAction(state, { op: "racePick", uid: "a", nickname: "一郎", horseId: "pop1" }, start + 100);
  state = applyAction(state, { op: "racePick", uid: "b", nickname: "二郎", horseId: "pop6" }, start + 200);
  state = applyAction(state, { op: "racePick", uid: "c", nickname: "三郎", horseId: "pop1" }, start + 300);
  state = applyAction(state, { op: "racePick", uid: "b", nickname: "二郎", horseId: "pop1" }, start + 400);
  const open = project(state, { view: "race" }, start + 400);
  assert.equal(open.race?.picks.filter((pick) => pick.horseId === "pop1").length, 3);
  assert.equal(open.race?.picks.some((pick) => pick.horseId === "pop6"), false);
  state = applyAction(state, { op: "raceClose" }, start + 1_000);
  assert.throws(() => applyAction(state, { op: "racePick", uid: "a", nickname: "一郎", horseId: "pop2" }, start + 1_100), /選べません/);
  state = applyAction(state, { op: "raceSetWinner", winnerId: "pop1" }, start + 1_200);
  const won = project(state, { view: "race" }, start + 1_200);
  assert.equal(won.race?.phase, "result");
  assert.deepEqual(
    won.race?.picks.filter((pick) => pick.horseId === "pop1").map((pick) => pick.nickname).sort(),
    ["一郎", "三郎", "二郎"],
  );
  state = applyAction(state, { op: "raceSetWinner", winnerId: "none" }, start + 1_300);
  assert.equal(project(state, { view: "race" }, start + 1_300).race?.winnerId, "none");
});
