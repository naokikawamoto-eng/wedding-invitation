import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-blush-500 text-white shadow-md shadow-blush-200 hover:bg-blush-600",
  gold: "bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-md shadow-gold-200 hover:from-gold-500 hover:to-gold-600",
  outline: "border border-blush-300 bg-white text-blush-600 hover:bg-blush-50",
  ghost: "text-ink-soft hover:bg-blush-50 hover:text-ink",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5", lg: "px-6 py-4 text-lg" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-blush-100/60 backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold-400 ${className}`} aria-hidden>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold-300" />
      <span className="text-sm">❦</span>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold-300" />
    </div>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="font-display text-4xl font-semibold italic tracking-wide text-gold-600">{children}</h1>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

export function Spinner({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-ink-soft">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-blush-200 border-t-blush-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}

export const inputClass =
  "w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-ink-soft/60 focus:border-blush-400 focus:ring-4 focus:ring-blush-100";
