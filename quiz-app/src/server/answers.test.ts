import assert from "node:assert/strict";
import test from "node:test";
import type { Answer, Participant } from "../lib/types";
import { overlayAnswers, overlayGuests } from "./answers";
import { applyAction, emptyState, normalize, project, rescoreIfPublished } from "./engine";

function person(id: string, nickname: string): Participant {
  return { id, nickname, score: 0, totalTimeMs: 0, joinedAt: 1_000 };
}

function answer(uid: string, questionId: string, choice: number, answeredAt: number): Answer {
  return {
    id: `${questionId}_${uid}`,
    questionId,
    uid,
    nickname: uid,
    choice,
    text: null,
    startedAt: 1_000,
    answeredAt,
  };
}

function opened() {
  let state = normalize(emptyState(), 1);
  state = applyAction(state, { op: "openQuiz", roomId: "1122A" }, 1_000);
  state = applyAction(state, { op: "join", roomId: "1122A", uid: "a", nickname: "A" }, 1_000);
  state = applyAction(state, { op: "join", roomId: "1122A", uid: "b", nickname: "B" }, 1_100);
  state = applyAction(state, { op: "answer", roomId: "1122A", uid: "a", questionId: "groom-sports", choice: 2 }, 2_000);
  state = applyAction(state, { op: "answer", roomId: "1122A", uid: "a", questionId: "couple-photo", choice: 1 }, 2_100);
  state = applyAction(state, { op: "answer", roomId: "1122A", uid: "b", questionId: "groom-sports", choice: 0 }, 2_200);
  return state;
}

test("古い個人回答は新しい選択を戻さず、別の問題と別の人は残る", () => {
  const state = overlayGuests(opened(), "1122A", [
    {
      participant: { ...person("a", "エー"), prizeWish: "earbuds" },
      answers: [
        answer("a", "groom-sports", 0, 1_500),
        answer("a", "couple-golf", 1, 3_000),
      ],
    },
    {
      participant: { ...person("c", "C"), score: 9 },
      answers: [answer("c", "groom-sports", 2, 3_000)],
    },
  ]);
  const room = state.rooms["1122A"];
  assert.equal(room.answers["groom-sports_a"].choice, 2);
  assert.equal(room.answers["couple-photo_a"].choice, 1);
  assert.equal(room.answers["couple-golf_a"].choice, 1);
  assert.equal(room.answers["groom-sports_b"].choice, 0);
  assert.equal(room.participants.a.nickname, "エー");
  assert.equal(room.participants.a.prizeWish, "earbuds");
  assert.equal(room.participants.c.score, 0);
  assert.equal(room.answers["groom-sports_c"].choice, 2);
});

test("参加者一覧にいない回答は復活させない", () => {
  const state = overlayAnswers(opened(), "1122A", [answer("ghost", "groom-sports", 2, 9_000)]);
  assert.equal(state.rooms["1122A"].answers["groom-sports_ghost"], undefined);
  assert.equal(state.rooms["1122A"].participants.ghost, undefined);
});

test("発表スナップショットより新しい回答も表示時の得点に入り、締切後の変更は拒否する", () => {
  let state = opened();
  state = overlayGuests(state, "1122A", [
    {
      participant: person("a", "A"),
      answers: [answer("a", "couple-photo", 0, 4_000)],
    },
  ]);
  state = applyAction(state, { op: "closeAnswers", roomId: "1122A" }, 5_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: "1122A", uid: "a", questionId: "couple-golf", choice: 1 }, 5_100),
    /締め切/,
  );
  const missed = applyAction(opened(), { op: "revealAll", roomId: "1122A" }, 5_200);
  assert.equal(missed.rooms["1122A"].participants.a.score, 1);
  const scored = rescoreIfPublished(overlayGuests(missed, "1122A", [
    {
      participant: person("a", "A"),
      answers: [answer("a", "couple-photo", 0, 4_000)],
    },
  ]), "1122A");
  assert.equal(scored.rooms["1122A"].participants.a.score, 2);
  assert.equal(scored.rooms["1122A"].participants.b.score, 0);
  const guest = project(state, { view: "guest", roomId: "1122A", uid: "a" }, 5_000);
  assert.equal(guest.answerSheet, null);
  assert.equal(JSON.stringify(guest).includes("correctChoice"), false);
});
