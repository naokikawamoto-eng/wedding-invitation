"use client";

import { ANY_PRIZE, PRIZES, type PrizeId } from "@/lib/prizes";

export function PrizeIntro({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-center text-sm text-ink-soft sm:text-xl">
        正解数の上位5名に景品（ウォッチ、タブレット、イヤホン、ギフト券、ドライヤーなど）。当日のお楽しみです。
      </p>
    );
  }
  return (
    <section className="space-y-3 rounded-3xl bg-white/80 p-4 shadow-sm">
      <h2 className="text-center text-base font-bold leading-snug">正解数の上位5名様に景品をプレゼント！</h2>
      <ul className="space-y-2">
        {PRIZES.map((prize) => (
          <li key={prize.id} className="rounded-2xl bg-blush-50/80 px-3 py-2">
            <p className="text-sm font-bold">{prize.name}</p>
            <p className="text-xs leading-relaxed text-ink-soft">{prize.detail}</p>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs leading-relaxed text-ink-soft">など。どの景品になるかは、当日のお楽しみです。</p>
    </section>
  );
}

export function PrizeChoices({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: PrizeId) => void;
  disabled?: boolean;
}) {
  const options = [...PRIZES.map((prize) => ({ id: prize.id, name: prize.name })), ANY_PRIZE];
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-bold">欲しい景品を1つ</legend>
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2 text-sm ${
            value === option.id ? "border-blush-400 bg-blush-50" : "border-blush-100 bg-white"
          }`}
        >
          <input
            type="radio"
            name="prize"
            className="mt-1"
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          <span className="font-bold">{option.name}</span>
        </label>
      ))}
    </fieldset>
  );
}
