import assert from "node:assert/strict";
import { test } from "node:test";
import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "../lib/events";
import { RECEPTION_GUESTS } from "../lib/reception-guests";
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
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions.length, 11);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions[6].text, "新郎直樹が一番言われて嬉しい褒め言葉は？");
  assert.deepEqual(state.rooms[RECEPTION_ROOM_ID].questions[6].choices, ["奥さん綺麗ですね", "イケメンですね", "男らしいですね", "運動神経いいですね"]);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["groom-praise"].correctChoice, 3);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["groom-praise"].note, "あんまり言われないから。");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions[7].text, "新郎直樹が最もスベったのではないかと思っている場面は？");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["groom-flop"].correctChoice, 1);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions[8].text, "新婦 有梨花が生まれたときの体重は、何グラムだったでしょう？");
  assert.deepEqual(state.rooms[RECEPTION_ROOM_ID].questions[8].choices, ["2,970g", "3,180g", "3,490g", "4,020g"]);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["bride-weight"].correctChoice, 2);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["bride-weight"].note, undefined);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions[9].text, "新婦 有梨花が初めての海外旅行で訪れたのは、どこでしょう？");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["bride-abroad"].correctChoice, 1);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].questions[10].text, "生後10か月の新婦 有梨花に起きた、あわやのハプニングとは？");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["bride-chips"].correctChoice, 2);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].keys["bride-chips"].note, undefined);
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
  state = applyAction(state, { op: "setAnswerSeconds", roomId: AFTERPARTY_ROOM_ID, answerSeconds: 20 }, 0);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 1_000);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].answerSeconds, 30);
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
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 1 }, 5_000);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "b", questionId: "groom-sports", choice: 1 }, 1_300);
  const guest = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 5_100);
  assert.equal(guest.questions?.length, 11);
  assert.equal(JSON.stringify(guest).includes("あんまり言われない"), false);
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
  const hidden = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 9_200);
  const hiddenScreen = project(state, { view: "screen", roomId: RECEPTION_ROOM_ID }, 9_200);
  assert.equal(hidden.answerSheet, null);
  assert.equal(JSON.stringify(hidden).includes("correctChoice"), false);
  assert.equal(JSON.stringify(hiddenScreen).includes("correctChoice"), false);
  state = applyAction(state, { op: "advanceReveal", roomId: RECEPTION_ROOM_ID }, 9_300);
  const revealed = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 9_300);
  assert.equal(revealed.answerSheet?.find((s) => s.questionId === "groom-sports")?.correctChoice, 1);
  assert.equal(revealed.answerSheet?.length, 1);
  const screen = project(state, { view: "screen", roomId: RECEPTION_ROOM_ID }, 9_300);
  assert.equal(screen.choiceCounts?.[1], 2);
  state = applyAction(state, { op: "advanceReveal", roomId: RECEPTION_ROOM_ID }, 9_400);
  const nextQuestion = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 9_400);
  assert.equal(nextQuestion.answerSheet?.length, 1);
  assert.equal(nextQuestion.room?.presentAnswer, false);
});

test("保存済みの一次会1問目だけを差し替え、他の問題と進行は残す", () => {
  let state = room(1_000);
  const current = state.rooms[RECEPTION_ROOM_ID];
  const questions = current.questions.map((question) =>
    question.id === "groom-sports"
      ? { ...question, text: "次のうち、新郎が習ったことのないスポーツは？", choices: ["剣道", "サッカー", "野球", "テニス"] }
      : question,
  );
  state = {
    ...state,
    rooms: {
      ...state.rooms,
      [RECEPTION_ROOM_ID]: {
        ...current,
        phase: "lobby",
        questions,
        keys: { ...current.keys, "groom-sports": { correctChoice: 2, correctTexts: [] } },
      },
    },
  };
  const drink = current.questions.find((question) => question.id === "groom-drink")?.text;
  const next = normalize(state, 2_000);
  const roomAfter = next.rooms[RECEPTION_ROOM_ID];
  const opening = roomAfter.questions.find((question) => question.id === "groom-sports");
  assert.equal(opening?.text, "新郎が1番尖っていた時期は？");
  assert.deepEqual(opening?.choices, ["中学2年生", "高校2年生", "大学2年生", "社会人2年目"]);
  assert.equal(opening?.order, 1);
  assert.equal(roomAfter.keys["groom-sports"].correctChoice, 1);
  assert.equal(roomAfter.questions.find((question) => question.id === "groom-drink")?.text, drink);
  assert.equal(roomAfter.phase, "lobby");
  assert.equal(roomAfter.questions.length, current.questions.length);
  assert.equal(normalize(next, 3_000), next);
});

test("一次会は締め切り後に全問の正解をまとめて出せる", () => {
  let state = room(1_000);
  state = applyAction(state, { op: "openQuiz", roomId: RECEPTION_ROOM_ID }, 1_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "a", nickname: "A" }, 1_000);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 0 }, 1_200);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "bride-weight", choice: 2 }, 1_300);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "bride-abroad", choice: 1 }, 1_400);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "bride-chips", choice: 2 }, 1_500);
  state = applyAction(state, { op: "closeAnswers", roomId: RECEPTION_ROOM_ID }, 2_000);
  const closed = project(state, { view: "screen", roomId: RECEPTION_ROOM_ID }, 2_000);
  assert.equal(JSON.stringify(closed).includes("correctChoice"), false);
  state = applyAction(state, { op: "revealBoard", roomId: RECEPTION_ROOM_ID }, 2_100);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].answers["groom-sports_a"].choice, 0);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.a.score, 3);
  const guest = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 2_100);
  assert.equal(guest.answerSheet?.length, 11);
  assert.equal(guest.answerSheet?.find((item) => item.questionId === "groom-praise")?.note, "あんまり言われないから。");
  assert.equal(guest.answerSheet?.find((item) => item.questionId === "groom-sports")?.correctChoice, 1);
  assert.equal(guest.answerSheet?.find((item) => item.questionId === "bride-weight")?.correctChoice, 2);
  assert.equal(guest.answerSheet?.find((item) => item.questionId === "bride-abroad")?.correctChoice, 1);
  assert.equal(guest.answerSheet?.find((item) => item.questionId === "bride-chips")?.correctChoice, 2);
  assert.equal(guest.answerSheet?.find((item) => item.questionId === "bride-chips")?.note, undefined);
  const screen = project(state, { view: "screen", roomId: RECEPTION_ROOM_ID }, 2_100);
  assert.equal(screen.room?.presentAll, true);
  assert.equal(screen.choiceBoards?.length, 11);
  assert.equal(closed.correctRates, undefined);
  assert.equal(screen.correctRates?.length, 11);
  assert.equal(screen.correctRates?.every((item) => item.submitted === 0 && item.correct === 0), true);
  assert.equal(screen.room?.screenMode, "board");
  state = applyAction(state, { op: "setScreenMode", roomId: RECEPTION_ROOM_ID, mode: "ranking" }, 2_200);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].screenMode, "ranking");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].presentAll, true);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "revealed");
  state = applyAction(state, { op: "setScreenMode", roomId: RECEPTION_ROOM_ID, mode: "board" }, 2_300);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].screenMode, "board");
  state = applyAction(state, { op: "setScreenMode", roomId: RECEPTION_ROOM_ID, mode: "ranking" }, 2_400);
  state = applyAction(state, { op: "setRankingVisible", roomId: RECEPTION_ROOM_ID, visible: false }, 2_500);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].presentAll, true);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].answers["groom-sports_a"].choice, 0);
  state = applyAction(state, { op: "finishQuiz", roomId: RECEPTION_ROOM_ID }, 2_600);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "finished");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].screenMode, "ranking");
  state = applyAction(state, { op: "setScreenMode", roomId: RECEPTION_ROOM_ID, mode: "board" }, 2_700);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "finished");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].screenMode, "board");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].presentAll, true);
  assert.throws(() => applyAction(state, { op: "setScreenMode", roomId: AFTERPARTY_ROOM_ID, mode: "ranking" }, 2_800), /一次会/);
  assert.throws(() => applyAction(state, { op: "revealBoard", roomId: AFTERPARTY_ROOM_ID }, 2_200), /1問ずつ/);
});

test("二次会は正解のあとだけ途中順位に進める", () => {
  let state = room(10_000);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "u", nickname: "ゲスト" }, 10_000);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 11_000);
  const before = project(state, { view: "screen", roomId: AFTERPARTY_ROOM_ID }, 11_000);
  assert.equal(before.answerKey ?? null, null);
  assert.equal(JSON.stringify(before).includes("correctChoice"), false);
  assert.throws(() => applyAction(state, { op: "showStandings", roomId: AFTERPARTY_ROOM_ID }, 12_000), /正解を発表してから/);
  state = applyAction(state, { op: "closeAnswers", roomId: AFTERPARTY_ROOM_ID }, 20_000);
  state = applyAction(state, { op: "revealAnswer", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 21_000);
  state = applyAction(state, { op: "showStandings", roomId: AFTERPARTY_ROOM_ID }, 22_000);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].presentStandings, true);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-2" }, 23_000);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].presentStandings, false);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].phase, "question");
  const playing = project(state, { view: "screen", roomId: AFTERPARTY_ROOM_ID }, 23_000);
  assert.equal(playing.answerKey ?? null, null);
});

test("一次会の景品希望は順位を変えず、二次会には残さない", () => {
  let state = room(1_000);
  state = applyAction(state, { op: "openQuiz", roomId: RECEPTION_ROOM_ID }, 1_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "old", nickname: "既存" }, 1_000);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.old.prizeWish, undefined);
  state = applyAction(
    state,
    { op: "join", roomId: RECEPTION_ROOM_ID, uid: "a", nickname: "A", prizeWish: "watch" },
    1_100,
  );
  state = applyAction(
    state,
    { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 2 },
    1_200,
  );
  const before = state.rooms[RECEPTION_ROOM_ID].participants.a.score;
  state = applyAction(state, { op: "setPrizeWish", roomId: RECEPTION_ROOM_ID, uid: "a", prizeWish: "pad" }, 1_300);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.a.prizeWish, "pad");
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.a.score, before);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.old.score, 0);
  state = applyAction(state, { op: "setPrizeWish", roomId: RECEPTION_ROOM_ID, uid: "old", prizeWish: "any" }, 1_400);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.old.prizeWish, "any");
  assert.throws(
    () => applyAction(state, { op: "setPrizeWish", roomId: RECEPTION_ROOM_ID, uid: "a", prizeWish: "unknown" }, 1_500),
    /景品/,
  );
  state = applyAction(
    state,
    { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "a", nickname: "A", prizeWish: "watch" },
    1_600,
  );
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].participants.a.prizeWish, undefined);
  const guest = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 1_700);
  assert.equal(guest.me?.prizeWish, undefined);
  assert.equal(guest.participants?.find((person) => person.id === "a")?.prizeWish, undefined);
  assert.equal(JSON.stringify(guest).includes("ドライヤー"), false);
  assert.equal(JSON.stringify(guest).includes("スマートウォッチ"), false);
  const host = project(state, { view: "host", roomId: RECEPTION_ROOM_ID }, 1_700);
  assert.equal(host.participants?.find((person) => person.id === "old")?.prizeWish, "any");
});

test("順位の表示切替は回答と得点を変えない", () => {
  let state = room(1_000);
  const screen = project(state, { view: "screen", roomId: RECEPTION_ROOM_ID }, 1_000);
  assert.equal(screen.room?.rankingVisible, true);
  assert.equal(JSON.stringify(screen).includes("ドライヤー"), false);
  assert.equal(JSON.stringify(screen).includes("馬券"), false);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "a", nickname: "A" }, 1_000);
  state = applyAction(state, { op: "openQuiz", roomId: RECEPTION_ROOM_ID }, 1_100);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "a", questionId: "groom-sports", choice: 2 }, 1_200);
  state = applyAction(state, { op: "setRankingVisible", roomId: RECEPTION_ROOM_ID, visible: false }, 1_300);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].rankingVisible, false);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].answers["groom-sports_a"].choice, 2);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "question");
  const hidden = project(state, { view: "guest", roomId: RECEPTION_ROOM_ID, uid: "a" }, 1_400);
  assert.equal(hidden.room?.rankingVisible, false);
  state = applyAction(state, { op: "setRankingVisible", roomId: AFTERPARTY_ROOM_ID, visible: false }, 1_500);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].rankingVisible, false);
  assert.equal(state.rooms[AFTERPARTY_ROOM_ID].phase, "lobby");
});

test("席次表は84名で、取った名前は二度目を拒み、未送信の回答も締切時に数える", () => {
  const seated = RECEPTION_GUESTS.filter((guest) => !guest.test);
  assert.equal(seated.length, 84);
  assert.equal(seated.filter((guest) => guest.side === "groom").length, 55);
  assert.equal(seated.filter((guest) => guest.side === "bride").length, 29);
  assert.equal(RECEPTION_GUESTS.filter((guest) => guest.test).length, 0);
  assert.equal(RECEPTION_GUESTS.some((guest) => guest.name.startsWith("テストユーザー")), false);
  assert.equal(new Set(RECEPTION_GUESTS.map((guest) => guest.name)).size, 84);
  const first = RECEPTION_GUESTS[0];
  let state = room(1_000);
  state = applyAction(state, { op: "openQuiz", roomId: RECEPTION_ROOM_ID }, 1_000);
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "old", nickname: "ジョンソン" }, 1_000);
  state = applyAction(
    state,
    { op: "join", roomId: RECEPTION_ROOM_ID, uid: "phone-a", nickname: first.name, guestId: first.id, prizeWish: "watch" },
    1_100,
  );
  assert.throws(
    () =>
      applyAction(
        state,
        { op: "join", roomId: RECEPTION_ROOM_ID, uid: "phone-b", nickname: first.name, guestId: first.id, prizeWish: "pad" },
        1_200,
      ),
    /回答は受付済みです/,
  );
  state = applyAction(
    state,
    { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "phone-a", questionId: "groom-sports", choice: 2 },
    1_300,
  );
  state = applyAction(state, { op: "releaseGuest", roomId: RECEPTION_ROOM_ID, guestId: first.id }, 1_400);
  state = applyAction(
    state,
    { op: "join", roomId: RECEPTION_ROOM_ID, uid: "phone-b", nickname: first.name, guestId: first.id, prizeWish: "pad" },
    1_500,
  );
  assert.equal(state.rooms[RECEPTION_ROOM_ID].answers[`groom-sports_phone-b`].choice, 2);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants["phone-a"], undefined);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.old.nickname, "ジョンソン");
  for (const question of state.rooms[RECEPTION_ROOM_ID].questions) {
    const choice = question.id === "groom-sports" ? 1 : 0;
    state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "phone-b", questionId: question.id, choice }, 1_600);
  }
  state = applyAction(state, { op: "submitAnswers", roomId: RECEPTION_ROOM_ID, uid: "phone-b" }, 1_700);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants["phone-b"].submittedAt, 1_700);
  assert.throws(
    () => applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "phone-b", questionId: "groom-sports", choice: 1 }, 1_800),
    /受け付けました/,
  );
  state = applyAction(state, { op: "join", roomId: RECEPTION_ROOM_ID, uid: "partial", nickname: "ゆりか" }, 1_900);
  state = applyAction(state, { op: "answer", roomId: RECEPTION_ROOM_ID, uid: "partial", questionId: "groom-sports", choice: 1 }, 1_950);
  state = applyAction(state, { op: "closeAnswers", roomId: RECEPTION_ROOM_ID }, 2_000);
  state = applyAction(state, { op: "revealBoard", roomId: RECEPTION_ROOM_ID }, 2_100);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants["phone-b"].score >= 1, true);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.partial.score, 1);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].participants.old.nickname, "ジョンソン");
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

test("二次会が終わったあとは自分の回答だけ見え、未発表の正解は渡さない", () => {
  let state = room(0);
  state = applyAction(state, { op: "join", roomId: AFTERPARTY_ROOM_ID, uid: "u", nickname: "ゲスト" }, 0);
  state = applyAction(state, { op: "showQuestion", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 0);
  state = applyAction(state, { op: "answer", roomId: AFTERPARTY_ROOM_ID, uid: "u", choice: 0 }, 10);
  state = applyAction(state, { op: "revealAnswer", roomId: AFTERPARTY_ROOM_ID, questionId: "nijie-1" }, 20);
  state = applyAction(state, { op: "finishQuiz", roomId: AFTERPARTY_ROOM_ID }, 30);
  const guest = project(state, { view: "guest", roomId: AFTERPARTY_ROOM_ID, uid: "u" }, 40);
  assert.equal(guest.questions?.length, 10);
  assert.equal(guest.myAnswers?.length, 1);
  assert.equal(guest.myAnswers?.[0].choice, 0);
  assert.deepEqual(
    guest.answerSheet?.map((item) => item.questionId),
    ["nijie-1"],
  );
  assert.equal(guest.answerSheet?.[0].correctChoice, 2);
  assert.equal(guest.answerSheet?.some((item) => item.questionId === "nijie-2"), false);
});
