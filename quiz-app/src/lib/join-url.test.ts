import assert from "node:assert/strict";
import test from "node:test";
import { quizEntryUrl } from "./join-url";

test("会場のQRは公開の参加入口を指し、配信URLやローカルアドレスにはしない", () => {
  assert.equal(
    quizEntryUrl({ hostname: "wedding-quiz-flame-alpha.vercel.app", origin: "https://wedding-quiz-flame-alpha.vercel.app", roomId: "1122A" }),
    "https://wedding-quiz-flame-alpha.vercel.app/play",
  );
  assert.equal(
    quizEntryUrl({
      hostname: "wedding-quiz-1vxdcvxzv-naokikawamoto-engs-projects.vercel.app",
      origin: "https://wedding-quiz-1vxdcvxzv-naokikawamoto-engs-projects.vercel.app",
      roomId: "1122B",
    }),
    "https://wedding-quiz-flame-alpha.vercel.app/play",
  );
  assert.equal(
    quizEntryUrl({ hostname: "127.0.0.1", origin: "http://127.0.0.1:3456", roomId: "1122A", lanOrigin: "http://172.30.0.2:3456" }),
    "http://172.30.0.2:3456/play",
  );
  assert.equal(
    quizEntryUrl({ hostname: "localhost", origin: "http://localhost:3000", roomId: "EXTRA" }),
    "http://localhost:3000/play/EXTRA",
  );
});
