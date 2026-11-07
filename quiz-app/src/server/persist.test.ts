import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { RECEPTION_ROOM_ID } from "../lib/events";
import { __resetStoreForTests, readState, runAction } from "./persist";

let dir = "";

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "wedding-quiz-"));
  process.env.QUIZ_STATE_FILE = path.join(dir, "state.json");
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
  __resetStoreForTests();
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("同時に届いた回答を取りこぼさない", async () => {
  const now = Date.now();
  await runAction({ op: "openQuiz", roomId: RECEPTION_ROOM_ID }, now);
  const ids = Array.from({ length: 40 }, (_, i) => `guest-${i}`);
  await Promise.all(ids.map((uid, i) => runAction({ op: "join", roomId: RECEPTION_ROOM_ID, uid, nickname: `客${i}` }, now + i)));
  await Promise.all(
    ids.map((uid, i) => runAction({ op: "answer", roomId: RECEPTION_ROOM_ID, uid, questionId: "groom-sports", choice: i % 4 }, now + 100 + i)),
  );
  const state = await readState(now + 1_000);
  assert.equal(Object.keys(state.rooms[RECEPTION_ROOM_ID].participants).length, 40);
  assert.equal(Object.keys(state.rooms[RECEPTION_ROOM_ID].answers).length, 40);
  assert.equal(state.rooms[RECEPTION_ROOM_ID].phase, "question");
});
