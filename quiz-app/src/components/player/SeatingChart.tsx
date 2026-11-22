"use client";

import { useEffect, useMemo, useState } from "react";
import { findSeat, SEAT_TABLES, SEATING_ROWS, TAKASAGO, type SeatTable } from "@/lib/seating";
import { inputClass } from "../ui";

const BY_ID = new Map(SEAT_TABLES.map((table) => [table.id, table]));

/** 席次表。手紙や内部メモは出さない */
export function SeatingChart() {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => findSeat(query), [query]);
  const hitNames = new Set(hits.map((hit) => hit.name));
  const hitTables = new Set(hits.map((hit) => hit.tableId));

  useEffect(() => {
    const tableId = hits[0]?.tableId;
    if (!tableId) return;
    document.getElementById(`seat-table-${tableId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [hits]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-display text-3xl italic text-gold-600">Seating</p>
        <h2 className="mt-1 text-lg font-bold">席次表</h2>
        <p className="text-sm text-ink-soft">ボールルーム 2部屋</p>
      </div>
      <label className="block text-sm font-bold">
        名前で探す
        <input
          className={`${inputClass} mt-2`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="氏名の一部"
        />
      </label>
      {query.trim() && hits.length === 0 && <p className="text-sm text-ink-soft">見つかりません</p>}
      <div className="rounded-3xl border border-gold-200 bg-gold-100/70 px-4 py-3 text-center">
        <p className="text-xs font-bold tracking-widest text-gold-600">高砂</p>
        <p className="mt-1 font-bold">
          {TAKASAGO.map((person) => person.name).join("・")}
        </p>
        <p className="text-xs text-ink-soft">新郎・新婦</p>
      </div>
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="min-w-[640px] space-y-2 px-1">
          {SEATING_ROWS.map((row) => (
            <div key={row.join("-")} className="grid grid-cols-4 gap-2">
              {row.map((id) => (
                <TableCard
                  key={id}
                  table={BY_ID.get(id)!}
                  span={row.length === 4 ? 1 : row.length === 3 && id === row[2] ? 2 : row.length === 2 ? 2 : 1}
                  hot={hitTables.has(id)}
                  hitNames={hitNames}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableCard({
  table,
  span,
  hot,
  hitNames,
}: {
  table: SeatTable;
  span: 1 | 2;
  hot: boolean;
  hitNames: Set<string>;
}) {
  return (
    <section
      id={`seat-table-${table.id}`}
      className={`rounded-2xl border bg-white/90 p-2 shadow-sm ${span === 2 ? "col-span-2" : ""} ${hot ? "border-gold-400 ring-2 ring-gold-300" : "border-blush-100"}`}
    >
      <p className="text-center font-display text-xl font-semibold text-gold-600">
        {table.id}
        <span className="ml-1 text-[10px] font-bold text-ink-soft">{table.guests.length}名</span>
      </p>
      <ul className="mt-1 space-y-1">
        {table.guests.map((guest) => {
          const marked = hitNames.has(guest.name);
          return (
            <li key={guest.name} className={`rounded-lg px-1 py-0.5 ${marked ? "bg-gold-100" : ""}`}>
              <p className="text-[13px] font-bold leading-tight">{guest.name}</p>
              <p className="text-[10px] leading-tight text-ink-soft">{guest.relation}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
