"use client";

const TEASER = "上位3名に豪華商品が当たります！";

/** ゲストとスクリーン向け。品名は出さない */
export function PrizeIntro({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <p className="text-center text-sm font-bold text-ink-soft sm:text-xl">{TEASER}</p>;
  }
  return (
    <section className="rounded-3xl bg-white/80 p-4 text-center shadow-sm">
      <h2 className="text-base font-bold leading-snug">{TEASER}</h2>
      <p className="mt-1 text-sm text-ink-soft">正解数の上位3名に、豪華な景品をご用意しています。</p>
    </section>
  );
}
