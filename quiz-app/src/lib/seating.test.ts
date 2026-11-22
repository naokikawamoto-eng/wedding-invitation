import assert from "node:assert/strict";
import { test } from "node:test";
import { RECEPTION_GUESTS } from "./reception-guests";
import { findSeat, SEAT_TABLES, seatKey } from "./seating";

test("席次表は最新の卓順で、手紙や試し参加を含まない", () => {
  const guests = SEAT_TABLES.flatMap((table) => table.guests.map((guest) => ({ ...guest, tableId: table.id })));
  assert.equal(guests.length, 83);
  assert.deepEqual(
    SEAT_TABLES.map((table) => [table.id, table.guests.length]),
    [
      ["A", 6],
      ["B", 6],
      ["C", 7],
      ["D", 6],
      ["E", 6],
      ["F", 6],
      ["G", 6],
      ["H", 10],
      ["I", 10],
      ["J", 5],
      ["K", 9],
      ["L", 6],
    ],
  );
  const raw = JSON.stringify(SEAT_TABLES);
  for (const banned of ["episode", "respect", "tone", "slug", "draft", "final", "テストユーザー"]) {
    assert.equal(raw.includes(banned), false, banned);
  }
  const chartNames = new Set(guests.map((guest) => seatKey(guest.name)));
  assert.equal(chartNames.has(seatKey("井上真穂")), false);
  assert.equal(guests.find((guest) => guest.name === "山下昌幸")?.relation, "新婦大学先輩");
  assert.equal(guests.find((guest) => guest.name === "和田秀哉")?.relation, "新婦大学先輩");
  const roster = RECEPTION_GUESTS.filter((guest) => !guest.test);
  const missingFromChart = roster.filter((guest) => !chartNames.has(seatKey(guest.name))).map((guest) => guest.name);
  assert.deepEqual(missingFromChart, ["井上真穂"]);
  for (const guest of roster) {
    if (guest.name === "井上真穂") continue;
    const seated = guests.find((item) => seatKey(item.name) === seatKey(guest.name));
    assert.ok(seated, guest.name);
    assert.equal(seated?.tableId, guest.table, guest.name);
    if (guest.name === "山下昌幸" || guest.name === "和田秀哉") {
      assert.notEqual(seated?.relation, guest.relation);
    } else {
      assert.equal(seated?.relation, guest.relation, guest.name);
    }
  }
  assert.deepEqual(findSeat("清水"), [{ tableId: "A", name: "清水忠朗" }, { tableId: "C", name: "清水優海" }]);
  assert.deepEqual(findSeat("金崎"), [{ tableId: "C", name: "金﨑あや" }]);
  assert.deepEqual(findSeat(""), []);
});
