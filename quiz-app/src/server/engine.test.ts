import assert from "node:assert/strict";
import { test } from "node:test";
import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "../lib/events";
import { applyAction, emptyState, normalize, project, type QuizState, type RoomRecord } from "./engine";

function room(now = 1_000_000): QuizState {
  return normalize(emptyState(), now);
}

test("一次会と二次会の固定ルームを分けて用意する", () => {
  const state = room();
  assert.equal(state.rooms[RECEPTION_ROOM_ID].event, "reception");
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].event, "afterparty");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions.length, 5);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].answerSeconds, 30);
  assert.ok(state.rooms[RECEPTION_ROOM_ID].questions.every((q) => q.sample));
});

test("ゲストには未発表の正解を渡さない", () => {
  const secret = "ひみつの正解";
  const record = {
    id: "TEST",
    title: "t",
    event: "afterparty",
    hostUid: "host",
    phase: "question",
    currentQuestionId: "q1",
    currentNumber: 1,
    totalQuestions: 1,
    questionStartedAt: 1_000,
    questionEndsAt: 2_000,
    answerSeconds: 30,
    revealedQuestionIds: [],
    reveal: null,
    createdAt: 1,
    questions: [{ id: "q1", order: 1, type: "text", text: "なに？", imageUrl: null, choices: [] }],
    keys: { q1: { correctChoice: null, correctTexts: [secret] } },
    participants: { u: { id: "u", nickname: "たろう", score: 0, totalTimeMs: 0, joinedAt: 1 } },
    answers: {},
  } satisfies RoomRecord;
  const state: QuizState = { version: 1, rooms: { TEST: record } };
  const guest = project(state, { view: "guest", roomId: "TEST", uid: "u" }, 1_100);
  const screen = project(state, { view: "screen", roomId: "TEST" }, 1_100);
  assert.equal(JSON.stringify(guest).includes(secret), false);
  assert.equal(JSON.stringify(screen).includes(secret), false);
  assert.equal(guest.question?.text, "なに？");

  const revealed = applyAction(state, { op: "revealAnswer", roomId: "TEST", questionId: "q1" }, 1_500);
  const after = project(revealed, { view: "guest", roomId: "TEST", uid: "u" }, 1_500);
  assert.equal(after.room?.reveal?.correctTexts[0], secret);
});

test("回答は1問1回、締め切り後は拒否、速く正解した人が同点で上", () => {
  let state = room(10_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "fast", nickname: "速い" }, 10_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "slow", nickname: "遅い" }, 10_100);
  state = applyAction(state, { op: "showQuestion", roomId: RECEPTION_ROOM_ID, questionId: "ichie-1" }, 11_000);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "fast", choice: 0 }, 12_000);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "slow", choice: 0 }, 14_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "fast", choice: 1 }, 15_000),
    /すでに回答済み/,
  );
  state = applyAction(state, { op: "closeAnswers", roomId: RECEPTION_ROOM_ID }, 20_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "late", choice: 0 }, 21_000),
    /締め切/,
  );
  state = applyAction(state, { op: "revealAnswer", roomId: RECEPTION_ROOM_ID, questionId: "ichie-1" }, 22_000);
  const ranked = Object.values(state.rooms[RECEPTION_ROOM_ID].participants).sort((a, b) => b.score - a.score || a.totalTimeMs - b.totalTimeMs);
  assert.equal(ranked[0].id, "fast");
  assert.equal(ranked[0].score, 1);
  assert.equal(ranked[0].totalTimeMs, 1_000);
  assert.equal(ranked[1].totalTimeMs, 3_000);
});

test("制限時間を過ぎるとサーバーが締め切る", () => {
  let state = room(0);
  state = applyAction(state, { op: "setAnswerSeconds", roomId: AFTERPARTY_ROOM_ID, answerSeconds: 30 }, 0);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 1_000);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].questionEndsAt, 31_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "u", choice: 1 }, 31_000),
    /締め切/,
  );
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].phase, "question");
  const closed = applyAction(state, { op: "recalculateScores", roomId: AFTERPARTY_ROOM_ID }, 31_000);
  assert.equal(closed.rooms[AFTERPARTY_ROOM_ID].phase, "closed");
});

test("表記ゆれを吸収して記述式を採点し、保存し直すとサンプルが外れる", () => {
  let state = room(0);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "showQuestion", roomId: RECEPTION_ROOM_ID, questionId: "ichie-4" }, 0);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "u", text: "河本　直樹" }, 100);
  state = applyAction(state, { op: "revealAnswer", roomId: RECEPTION_ROOM_ID, questionId: "ichie-4" }, 200);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.u.score, 1);

  state = applyAction(
    state,
    {
      op: "saveQuestion",
      roomId: RECEPTION_ROOM_ID,
      questionId: "ichie-4",
      order: 4,
      draft: { type: "text", text: "新郎の愛称は？", imageUrl: null, choices: [], correctChoice: null, correctTexts: ["なおき"] },
    },
    300,
  );
  const edited = state.rooms[RECEPTION_ROOM_ID].questions.find((q) => q.id === "ichie-4");
  assert.equal(edited?.sample, undefined);
  assert.equal(edited?.text, "新郎の愛称は？");
});

test("二次会の回答は一次会の得点に入らない", () => {
  let state = room(0);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 0);
  state = applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "u", choice: 1 }, 10);
  state = applyAction(state, { op: "revealAnswer", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 20);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].participants.u.score, 1);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.u.score, 0);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "lobby");
});
