import assert from "node:assert/strict";
import test from "node:test";
import type { SyncBody } from "./types";
import { enqueueForUser, syncStamp, visibleChoice } from "./answer-ui";

test("受付中は保存前の選択を出し、古いサーバー応答では戻さない", () => {
  assert.equal(visibleChoice(null, { choice: 2, status: "saving" }, true), 2);
  assert.equal(visibleChoice(0, { choice: 2, status: "saving" }, true), 2);
  assert.equal(visibleChoice(0, { choice: 2, status: "saved" }, true), 2);
  assert.equal(visibleChoice(0, { choice: 2, status: "error" }, true), 2);
  assert.equal(visibleChoice(2, { choice: 2, status: "saved" }, true), 2);
  assert.equal(visibleChoice(0, { choice: 2, status: "saved" }, false), 0);
  assert.equal(visibleChoice(1, null, true), 1);
});

test("版番号が同じでも自分の回答が変われば更新する", () => {
  const base = { serverNow: 1, version: 7, room: null } satisfies SyncBody;
  const first: SyncBody = { ...base, myAnswers: [{ id: "q_a", questionId: "q", uid: "a", nickname: "A", choice: 0, text: null, startedAt: 1, answeredAt: 2 }] };
  const second: SyncBody = { ...base, myAnswers: [{ id: "q_a", questionId: "q", uid: "a", nickname: "A", choice: 1, text: null, startedAt: 1, answeredAt: 3 }] };
  assert.notEqual(syncStamp(first), syncStamp(second));
  assert.equal(syncStamp(first), syncStamp({ ...first, serverNow: 99 }));
});

test("同じ人の保存は順番に実行し、失敗しても次を止めない", async () => {
  const seen: string[] = [];
  const first = enqueueForUser("room:user", async () => {
    seen.push("first");
    throw new Error("fail");
  });
  const second = enqueueForUser("room:user", async () => {
    seen.push("second");
    return "ok";
  });
  await assert.rejects(first, /fail/);
  assert.equal(await second, "ok");
  assert.deepEqual(seen, ["first", "second"]);
});
