"use client";

import { signOut, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useGuestUser } from "@/lib/hooks";
import { Button, Card, ErrorNote, Ornament, Spinner, Title, inputClass } from "../ui";

/** 主催者（合言葉を入力した端末）のときだけ中身を表示する */
export function AdminGate({ children }: { children: (user: User) => React.ReactNode }) {
  const { user, error } = useGuestUser(); // 先に匿名ログインしておき、合言葉で主催者に昇格する
  const [isAdmin, setIsAdmin] = useState<{ uid: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    // 合言葉の書き込みはサーバーで判定されるので、手元だけの未確定の書き込みは数えない
    return onSnapshot(
      doc(db(), "admins", user.uid),
      { includeMetadataChanges: true },
      (s) => setIsAdmin({ uid: user.uid, ok: s.exists() && !s.metadata.hasPendingWrites }),
      () => setIsAdmin({ uid: user.uid, ok: false }),
    );
  }, [user]);

  if (error) return <ErrorNote error={error} />;
  if (!user || isAdmin?.uid !== user.uid) return <Spinner />;
  if (isAdmin.ok) return <>{children(user)}</>;
  return <PasscodeForm />;
}

function PasscodeForm() {
  const [passcode, setPasscode] = useState("");
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
              await setDoc(doc(db(), "admins", auth().currentUser!.uid), { passcode: passcode.trim() });
            } catch {
              setError(new Error("合言葉が違います"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm font-bold">
            合言葉
            <input
              className={`${inputClass} mt-2 text-lg`}
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </label>
          <ErrorNote error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={!passcode.trim() || busy}>
            {busy ? "確認中…" : "主催者として入る"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-ink-soft">一度入ると、この端末では次回から入力不要です</p>
    </main>
  );
}

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut(auth())}>
      ログアウト
    </Button>
  );
}
