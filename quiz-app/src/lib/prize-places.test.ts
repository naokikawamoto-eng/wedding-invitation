import assert from "node:assert/strict";
import { test } from "node:test";
import { prizeHostScript, prizePlan, myJankenRank } from "./prize-places";
import { rankParticipants } from "./scoring";
import type { Participant } from "./types";

function person(id: string, score: number, time = 0): Participant {
  return { id, nickname: id, score, totalTimeMs: time, joinedAt: 0 };
}

function ranks(rows: Participant[], byTime = false) {
  return rankParticipants(rows, byTime);
}

test("1位が4人なら4人で3つの景品をジャンケン", () => {
  const plan = prizePlan(ranks([person("a", 5), person("b", 5), person("c", 5), person("d", 5), person("e", 1)]));
  assert.equal(plan.confirmed.length, 0);
  assert.equal(plan.janken.length, 1);
  assert.equal(plan.janken[0].rank, 1);
  assert.equal(plan.janken[0].people.length, 4);
  assert.deepEqual(plan.janken[0].places, [1, 2, 3]);
  assert.deepEqual(plan.podium.map((p) => p.id), ["a", "b", "c", "d"]);
  assert.equal(myJankenRank(plan, "e"), null);
  assert.equal(myJankenRank(plan, "a"), 1);
});

test("1位1人と2位3人なら、2位の3人で2位と3位の景品", () => {
  const plan = prizePlan(ranks([person("top", 4), person("x", 3), person("y", 3), person("z", 3), person("low", 1)]));
  assert.deepEqual(
    plan.confirmed.map((row) => [row.place, row.person.id]),
    [[1, "top"]],
  );
  assert.equal(plan.janken[0].rank, 2);
  assert.equal(plan.janken[0].people.length, 3);
  assert.deepEqual(plan.janken[0].places, [2, 3]);
  assert.deepEqual(plan.podium.map((p) => p.id), ["top", "x", "y", "z"]);
});

test("1位2人はジャンケンで1位と2位の景品を分け、3位は別の人", () => {
  const plan = prizePlan(ranks([person("a", 5), person("b", 5), person("c", 4)]));
  assert.equal(plan.confirmed.length, 1);
  assert.equal(plan.confirmed[0].place, 3);
  assert.equal(plan.janken[0].rank, 1);
  assert.deepEqual(plan.janken[0].places, [1, 2]);
  assert.equal(plan.janken[0].people.length, plan.janken[0].places.length);
  assert.equal(prizeHostScript(plan).includes("ジャンケンで1位・2位の景品"), true);
  assert.equal(prizeHostScript(plan).includes("3位はc様"), true);
});

test("3位が2人なら3位の景品1つをジャンケンし、4位以下の同率は対象外", () => {
  const plan = prizePlan(
    ranks([person("a", 5), person("b", 4), person("c", 3), person("d", 3), person("e", 1), person("f", 1)]),
  );
  assert.deepEqual(
    plan.confirmed.map((row) => row.place),
    [1, 2],
  );
  assert.equal(plan.janken.length, 1);
  assert.equal(plan.janken[0].rank, 3);
  assert.deepEqual(plan.janken[0].places, [3]);
  assert.deepEqual(plan.janken[0].people.map((p) => p.id), ["c", "d"]);
  assert.equal(plan.podium.some((p) => p.id === "e"), false);
});

test("同率が4位以下だけならジャンケンしない", () => {
  const plan = prizePlan(ranks([person("a", 5), person("b", 4), person("c", 3), person("d", 1), person("e", 1)]));
  assert.equal(plan.janken.length, 0);
  assert.deepEqual(
    plan.confirmed.map((row) => row.place),
    [1, 2, 3],
  );
  assert.equal(plan.podium.length, 3);
});

test("同率3位が5人なら、1位と2位は確定し3位の5人で景品1つ", () => {
  const plan = prizePlan(
    ranks([
      person("一位", 5),
      person("二位", 4),
      person("三a", 3),
      person("三b", 3),
      person("三c", 3),
      person("三d", 3),
      person("三e", 3),
    ]),
  );
  assert.deepEqual(
    plan.confirmed.map((row) => [row.place, row.person.id]),
    [
      [1, "一位"],
      [2, "二位"],
    ],
  );
  assert.equal(plan.janken.length, 1);
  assert.equal(plan.janken[0].rank, 3);
  assert.equal(plan.janken[0].people.length, 5);
  assert.deepEqual(plan.janken[0].places, [3]);
  assert.equal(plan.podium.length, 7);
  assert.equal(prizeHostScript(plan).includes("3位が5名です"), true);
  assert.equal(prizeHostScript(plan).includes("1つの景品"), true);
});

test("1位2人と3位4人は、先に1位の2人、つぎに3位の4人", () => {
  const plan = prizePlan(
    ranks([person("あ", 5), person("い", 5), person("う", 3), person("え", 3), person("お", 3), person("か", 3)]),
  );
  assert.equal(plan.confirmed.length, 0);
  assert.equal(plan.janken.length, 2);
  assert.equal(plan.janken[0].rank, 1);
  assert.deepEqual(plan.janken[0].places, [1, 2]);
  assert.equal(plan.janken[1].rank, 3);
  assert.equal(plan.janken[1].people.length, 4);
  assert.deepEqual(plan.janken[1].places, [3]);
  assert.equal(plan.podium.length, 6);
  const script = prizeHostScript(plan);
  assert.equal(script.indexOf("まず、") < script.indexOf("つぎに、"), true);
  assert.equal(script.includes("まず、1位が2名です"), true);
  assert.equal(script.includes("つぎに、3位が4名です"), true);
});

test("二次会は時間まで同じときだけ同順位", () => {
  const plan = prizePlan(ranks([person("fast", 3, 1000), person("slow", 3, 2000), person("low", 1, 100)], true));
  assert.equal(plan.janken.length, 0);
  assert.deepEqual(
    plan.confirmed.map((row) => [row.place, row.person.id]),
    [
      [1, "fast"],
      [2, "slow"],
      [3, "low"],
    ],
  );
  const tied = prizePlan(ranks([person("a", 3, 1000), person("b", 3, 1000)], true));
  assert.equal(tied.janken[0].people.length, 2);
  assert.deepEqual(tied.janken[0].places, [1, 2]);
});
