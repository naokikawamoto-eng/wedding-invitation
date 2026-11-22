import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { RECEPTION_GUESTS } from "../lib/reception-guests";
import { GET as readLetter } from "../app/api/letter/route";
import { POST as openSession } from "../app/api/letter/session/route";
import { letterForGuest, letterGuestIds, normalizeGuestName, readLetterSession, signLetterSession, cookieName } from "./letters";

test("手紙は空白と様を除いた氏名で新郎55人にだけ結び、本文以外は持たない", () => {
  const raw = readFileSync(new URL("./guest-letters.json", import.meta.url), "utf8");
  for (const banned of ["episode", "respect", "tone", "slug", "\"url\""]) {
    assert.equal(raw.includes(banned), false, banned);
  }
  const ids = letterGuestIds();
  assert.equal(ids.length, 55);
  const groom = RECEPTION_GUESTS.filter((guest) => guest.side === "groom" && !guest.test);
  assert.equal(groom.length, 55);
  for (const guest of groom) {
    const letter = letterForGuest(guest.id);
    assert.ok(letter?.body, guest.name);
  }
  assert.equal(normalizeGuestName("清水 忠朗 様"), "清水忠朗");
  const shimizu = RECEPTION_GUESTS.find((guest) => guest.name === "清水忠朗")!;
  assert.equal(letterForGuest(shimizu.id)?.callName, "清水さん");
  assert.equal(letterForGuest(shimizu.id)?.body.includes("竜泉寺の湯"), true);
  const draft = letterForGuest("a6");
  assert.equal(draft?.body.includes("畠さん"), true);
  assert.equal(draft?.body.includes("竜泉寺"), false);
  const akaba = letterForGuest("b6");
  assert.equal(akaba?.callName, "赤羽さん");
  assert.equal(akaba?.body.endsWith("NAOKIより"), true);
  assert.equal(raw.includes("直樹より"), false);
  for (const guest of RECEPTION_GUESTS.filter((item) => item.side === "bride" || item.test)) {
    assert.equal(letterForGuest(guest.id), null, guest.name);
  }
});

test("セッションは確定した名簿IDだけを通し、改ざんと期限切れは捨てる", async () => {
  const guest = RECEPTION_GUESTS.find((item) => item.name === "清水忠朗")!;
  const other = RECEPTION_GUESTS.find((item) => item.side === "bride")!;
  const token = signLetterSession(guest.id, 1_000);
  assert.equal(readLetterSession(token, 1_000), guest.id);
  assert.equal(readLetterSession(token, 1_000 + 31 * 24 * 60 * 60 * 1000), null);
  assert.equal(readLetterSession(`${token}x`, 1_000), null);
  assert.notEqual(readLetterSession(token, 1_000), other.id);
  const liveToken = signLetterSession(guest.id);
  assert.equal(letterForGuest(other.id), null);

  const mismatch = await readLetter(new Request(`http://localhost/api/letter?guestId=${other.id}&name=金崎あや`, {
    headers: { cookie: `${cookieName()}=${liveToken}` },
  }));
  const mismatchBody = await mismatch.text();
  assert.equal(mismatch.status, 403);
  assert.equal(mismatchBody.includes("竜泉寺"), false);
  const res = await readLetter(new Request(`http://localhost/api/letter?guestId=${guest.id}`, {
    headers: { cookie: `${cookieName()}=${liveToken}` },
  }));
  const data = (await res.json()) as { callName?: string; body?: string };
  assert.equal(data.callName, "清水さん");
  assert.equal(data.body?.includes("竜泉寺の湯"), true);
  const bride = letterForGuest(RECEPTION_GUESTS.find((item) => item.name === "金崎あや")?.id ?? "");
  assert.equal(bride, null);

  const session = await openSession(new Request("http://localhost/api/letter/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestId: other.id, name: "清水忠朗" }),
  }));
  const sessionBody = await session.text();
  assert.equal(sessionBody.includes("竜泉寺"), false);
  assert.equal(sessionBody.includes("hasMessage"), true);
  const locked = await openSession(new Request("http://localhost/api/letter/session", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `${cookieName()}=${liveToken}` },
    body: JSON.stringify({ guestId: other.id }),
  }));
  const lockedData = await locked.json();
  assert.equal(lockedData.hasMessage, false);
  assert.equal(JSON.stringify(lockedData).includes("竜泉寺"), false);
  const draft = await openSession(new Request("http://localhost/api/letter/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestId: "a6" }),
  }));
  const draftData = await draft.json();
  assert.equal(draftData.hasMessage, true);
  assert.equal(JSON.stringify(draftData).includes("畠さん"), false);
});
