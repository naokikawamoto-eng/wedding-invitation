import assert from "node:assert/strict";
import test from "node:test";
import { afterpartyBadge, receptionBadge } from "./quiz-status";

test("一次会の回答済みは送信した人だけで、締め切っただけの人は受付終了", () => {
  assert.equal(receptionBadge("question", false), null);
  assert.equal(receptionBadge("question", true), "submitted");
  assert.equal(receptionBadge("finished", false), "closed");
  assert.equal(receptionBadge("closed", false), "closed");
  assert.equal(receptionBadge("revealed", false), "closed");
  assert.equal(receptionBadge("finished", true), "submitted");
});

test("二次会は終了後に自分の回答があるときだけ回答済み", () => {
  assert.equal(afterpartyBadge("question", true), null);
  assert.equal(afterpartyBadge("finished", false), "closed");
  assert.equal(afterpartyBadge("finished", true), "submitted");
});
