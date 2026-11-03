"use client";

import { useEffect, useState } from "react";
import { clearPasscode, passcode, verifyPasscode } from "@/lib/transport";
import { Button, Card, ErrorNote, Ornament, Spinner, Title, inputClass } from "../ui";

/** 合言葉を通ったブラウザだけ、進行画面を出す */
export function AdminGate({ children }: { children: (user: { uid: string }) => React.ReactNode }) {
  const [ready, setReady] = useState<"unknown" | "in" | "out">("unknown");
  useEffect(() => {
    setReady(passcode() ? "in" : "out");
  }, []);
  if (ready === "unknown") return <Spinner />;
  if (ready === "out") return <PasscodeForm onOk={() => setReady("in")} />;
  return <>{children({ uid: "host" })}</>;
}

function PasscodeForm({ onOk }: { onOk: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <Title sub="主催者ページ">Wedding Quiz</Title>
      <Ornament />
      <Card>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            try {
              await verifyPasscode(value.trim());
              onOk();
            } catch (err) {
              setError(err);
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm font-bold">
            合言葉
            <input
              className={`${inputClass} mt-2 text-lg`}
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </label>
          <ErrorNote error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={!value.trim() || busy}>
            {busy ? "確認中…" : "主催者として入る"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-ink-soft">このブラウザでは、次回から入力不要です</p>
    </main>
  );
}

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        clearPasscode();
        location.href = "/admin";
      }}
    >
      ログアウト
    </Button>
  );
}
