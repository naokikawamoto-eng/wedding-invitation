import assert from "node:assert/strict";
import test from "node:test";
import type { Answer, AnswerKey, Participant, Question } from "./types";
import { hostSubmissions } from "./scoring";

const questions: Question[] = [
  { id: "q1", order: 1, type: "choice", text: "1", imageUrl: null, choices: ["a", "b"] },
  { id: "q2", order: 2, type: "choice", text: "2", imageUrl: null, choices: ["a", "b"] },
];
const keys = new Map<string, AnswerKey>([
  ["q1", { correctChoice: 1, correctTexts: [] }],
  ["q2", { correctChoice: 0, correctTexts: [] }],
]);

function person(id: string, nickname: string, extra: Partial<Participant> = {}): Participant {
  return { id, nickname, score: 0, totalTimeMs: 0, joinedAt: 1, ...extra };
}

function answer(uid: string, questionId: string, choice: number, answeredAt: number): Answer {
  return { id: `${questionId}_${uid}`, questionId, uid, nickname: uid, choice, text: null, startedAt: 1, answeredAt };
}

test("主催者の送信一覧は発表前でも正解数の多い順、同じなら送信が早い順", () => {
  const board = hostSubmissions(
    [
      person("late", "遅い", { submitted: true, submittedAt: 300, score: 0 }),
      person("early", "早い", { submitted: true, submittedAt: 100, score: 9 }),
      person("high", "多い", { submitted: true, submittedAt: 200, score: 0 }),
      person("wait", "未送信", { joinedAt: 50 }),
    ],
    questions,
    keys,
    [answer("early", "q1", 1, 90), answer("late", "q1", 1, 250), answer("high", "q1", 1, 150), answer("high", "q2", 0, 180), answer("wait", "q1", 1, 40)],
  );
  assert.deepEqual(
    board.submitted.map((row) => [row.person.nickname, row.correct]),
    [
      ["多い", 2],
      ["早い", 1],
      ["遅い", 1],
    ],
  );
  assert.deepEqual(
    board.pending.map((person) => person.nickname),
    ["未送信"],
  );
});
