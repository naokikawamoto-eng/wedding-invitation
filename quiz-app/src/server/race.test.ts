import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_RACE_HORSES } from "../lib/race";
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

test("受付中は選び直せ、締切後の勝ち馬と該当なしを出せる", () => {
  let state = normalize(emptyState(), 1_000);
  state = applyAction(state, { op: "raceOpen" }, 1_000);
  state = applyAction(state, { op: "racePick", uid: "a", nickname: "テストユーザー1", horseId: "pop1" }, 1_100);
  state = applyAction(state, { op: "racePick", uid: "b", nickname: "テストユーザー2", horseId: "pop6" }, 1_200);
  state = applyAction(state, { op: "racePick", uid: "c", nickname: "テストユーザー3", horseId: "pop1" }, 1_300);
  state = applyAction(state, { op: "racePick", uid: "b", nickname: "テストユーザー2", horseId: "pop1" }, 1_400);
  const open = project(state, { view: "race" }, 1_400);
  assert.equal(open.race?.picks.filter((pick) => pick.horseId === "pop1").length, 3);
  assert.equal(open.race?.picks.some((pick) => pick.horseId === "pop6"), false);
  state = applyAction(state, { op: "raceClose" }, 2_000);
  assert.throws(() => applyAction(state, { op: "racePick", uid: "a", nickname: "テストユーザー1", horseId: "pop2" }, 2_100), /選べません/);
  state = applyAction(state, { op: "raceSetWinner", winnerId: "pop1" }, 2_200);
  const won = project(state, { view: "race" }, 2_200);
  assert.equal(won.race?.phase, "result");
  assert.deepEqual(
    won.race?.picks.filter((pick) => pick.horseId === "pop1").map((pick) => pick.nickname).sort(),
    ["テストユーザー1", "テストユーザー2", "テストユーザー3"],
  );
  state = applyAction(state, { op: "raceSetWinner", winnerId: "none" }, 2_300);
  assert.equal(project(state, { view: "race" }, 2_300).race?.winnerId, "none");
});
