import assert from "node:assert/strict";
import { test } from "node:test";
import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "../lib/events";
import { rankParticipants } from "../lib/scoring";
import { applyAction, emptyState, normalize, project, type QuizState, type RoomRecord } from "./engine";

function room(now = 1_000_000): QuizState {
  return normalize(emptyState(), now);
}

test("一次会と二次会の固定ルームを分けて用意する", () => {
  const state = room();
  assert.equal(state.rooms[RECEPTION_ROOM_ID].event, "reception");
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].event, "afterparty");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].mode, "self");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions.length, 6);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].answerSeconds, 0);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions.some((q) => q.sample), false);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].mode, "paced");
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].questions.length, 10);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].answerSeconds, 30);
  assert.deepEqual(
    state.rooms[AFTERPARTY_ROOM_ID].questions.filter((q) => q.sample).map((q) => q.id),
    ["nijie-8"],
  );
});

test("ゲストには未発表の正解を渡さない", () => {
  const secret = "ひみつの正解";
  const record = {
    id: "TEST",
    title: "t",
    event: "afterparty",
    hostUid: "host",
    mode: "paced",
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
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "fast", nickname: "速い" }, 10_000);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "slow", nickname: "遅い" }, 10_100);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 11_000);
  state = applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "fast", choice: 2 }, 12_000);
  state = applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "slow", choice: 2 }, 14_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "fast", choice: 1 }, 15_000),
    /すでに回答済み/,
  );
  state = applyAction(state, { op: "closeAnswers", roomId: AFTERPARTY_ROOM_ID }, 20_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "late", choice: 0 }, 21_000),
    /締め切/,
  );
  state = applyAction(state, { op: "revealAnswer", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 22_000);
  const ranked = Object.values(state.rooms[AFTERPARTY_ROOM_ID].participants).sort((a, b) => b.score - a.score || a.totalTimeMs - b.totalTimeMs);
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
  state = applyAction(state, { op: "createRoom", title: "記述テスト", event: "afterparty", hostUid: "host" }, 0);
  const roomId = Object.keys(state.rooms).find((id) => id !== RECEPTION_ROOM_ID && id !== AFTERPARTY_ROOM_ID)!;
  state = applyAction(
    state,
    {
      op: "saveQuestion",
      roomId,
      order: 1,
      draft: { type: "text", text: "苗字は？", imageUrl: null, choices: [], correctChoice: null, correctTexts: ["河本"], sample: true },
    },
    1,
  );
  const questionId = state.rooms[roomId].questions[0].id;
  state = applyAction(state, { op: "join", roomId, uid: "u", nickname: "ゲスト" }, 2);
  state = applyAction(state, { op: "showQuestion", roomId, questionId }, 3);
  state = applyAction(state, { op: "answer", roomId, uid: "u", text: "河 本" }, 4);
  state = applyAction(state, { op: "revealAnswer", roomId, questionId }, 5);
  assert.equal(state.rooms[roomId].participants.u.score, 1);
  state = applyAction(
    state,
    {
      op: "saveQuestion",
      roomId,
      questionId,
      order: 1,
      draft: { type: "text", text: "新郎の愛称は？", imageUrl: null, choices: [], correctChoice: null, correctTexts: ["なおき"] },
    },
    6,
  );
  const edited = state.rooms[roomId].questions.find((q) => q.id === questionId);
  assert.equal(edited?.sample, undefined);
  assert.equal(edited?.text, "新郎の愛称は？");
});

test("一次会は締切まで回答を変えられ、同点は同順位", () => {
  let state = room(0);
  state = applyAction(state, { op: "openQuiz", roomId: RECEPTION_ROOM_ID }, 1_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "a", nickname: "A" }, 1_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "b", nickname: "B" }, 1_100);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 0 }, 1_200);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 2 }, 5_000);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "b", questionId: "groom-sports", choice: 2 }, 1_300);
  const guest = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 5_100);
  assert.equal(guest.questions?.length, 6);
  assert.equal(guest.answerSheet, null);
  assert.equal(JSON.stringify(guest).includes("correctChoice"), false);
  state = applyAction(state, { op: "closeAnswers", roomId: RECEPTION_ROOM_ID }, 9_000);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 1 }, 9_100),
    /締め切/,
  );
  state = applyAction(state, { op: "revealAll", roomId: RECEPTION_ROOM_ID }, 9_200);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.a.score, 1);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.b.score, 1);
  const ranked = rankParticipants(Object.values(state.rooms[RECEPTION_ROOM_ID].participants), false);
  assert.equal(ranked.find((p) => p.id === "a")?.rank, ranked.find((p) => p.id === "b")?.rank);
  const revealed = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 9_200);
  assert.equal(revealed.answerSheet?.find((s) => s.questionId === "groom-sports")?.correctChoice, 2);
});

test("二次会の回答は一次会の得点に入らない", () => {
  let state = room(0);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 0);
  state = applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "u", choice: 2 }, 10);
  state = applyAction(state, { op: "revealAnswer", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 20);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].participants.u.score, 1);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.u.score, 0);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "lobby");
});
