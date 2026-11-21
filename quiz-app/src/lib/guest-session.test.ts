import assert from "node:assert/strict";
import test from "node:test";
import { RECEPTION_GUESTS } from "./reception-guests";
import { readOrCreateGuestId, readSeat, resetGuestSession, resolveGuestSession, subscribeGuestId, writeSeat } from "./guest-session";

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

test("端末の参加者を切り替えると、次の画面は別の人として始まる", () => {
  const storage = memory();
  const seen: string[] = [];
  const stop = subscribeGuestId((id) => seen.push(id));
  const first = readOrCreateGuestId(storage);
  assert.equal(readOrCreateGuestId(storage), first);
  const next = resetGuestSession(storage);
  assert.notEqual(next, first);
  assert.equal(readOrCreateGuestId(storage), next);
  assert.deepEqual(seen, [next]);
  stop();
  resetGuestSession(storage);
  assert.deepEqual(seen, [next]);
});

test("名簿に無い保存済み参加は名前選択に戻し、名簿の人は残す", () => {
  const guest = RECEPTION_GUESTS[0];
  assert.deepEqual(
    resolveGuestSession({ storedSeatId: null, reception: { nickname: "ジョンソン" } }),
    { keepUid: false, seatId: null },
  );
  assert.deepEqual(
    resolveGuestSession({ storedSeatId: "missing", reception: null, afterparty: { nickname: "たろう" } }),
    { keepUid: false, seatId: null },
  );
  assert.deepEqual(
    resolveGuestSession({
      storedSeatId: null,
      reception: { guestId: guest.id, nickname: guest.name },
    }),
    { keepUid: true, seatId: guest.id },
  );
  assert.deepEqual(
    resolveGuestSession({ storedSeatId: guest.id, reception: null, afterparty: null }),
    { keepUid: true, seatId: guest.id },
  );
  assert.equal(readSeat(memory()), null);
  const storage = memory();
  writeSeat(guest.id, storage);
  assert.equal(readSeat(storage), guest.id);
  writeSeat("not-a-guest", storage);
  assert.equal(readSeat(storage), null);
});
