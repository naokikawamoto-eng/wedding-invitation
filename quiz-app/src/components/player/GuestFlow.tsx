"use client";

import { useEffect, useState } from "react";
import { PrizeChoices, PrizeIntro } from "@/components/player/Prizes";
import { AFTERPARTY_ROOM_ID, RECEPTION_ROOM_ID } from "@/lib/events";
import { guestById, readSeat, resetGuestSession, resolveGuestSession, writeSeat } from "@/lib/guest-session";
import { useGuestId, useGuestSeat, useParticipant, useRoom } from "@/lib/hooks";
import type { PrizeId } from "@/lib/prizes";
import { joinRoom } from "@/lib/quiz";
import { RECEPTION_GUESTS } from "@/lib/reception-guests";
import { AnswerReview } from "./AnswerReview";
import { PlayerGame } from "./PlayerGame";
import { SelfPlay } from "./SelfPlay";
import { Button, Card, ErrorNote, Ornament, Spinner, Title, inputClass } from "../ui";

type Step = "name" | "select" | "prize" | "reception" | "afterparty" | "review-reception" | "review-afterparty" | "accepted";

export function GuestFlow({ initialRoom }: { initialRoom?: typeof RECEPTION_ROOM_ID | typeof AFTERPARTY_ROOM_ID }) {
  const uid = useGuestId();
  const seatId = useGuestSeat();
  const seat = guestById(seatId);
  const reception = useRoom(uid ? RECEPTION_ROOM_ID : null);
  const afterparty = useRoom(uid ? AFTERPARTY_ROOM_ID : null);
  const meReception = useParticipant(uid ? RECEPTION_ROOM_ID : null, uid ?? undefined);
  const meAfter = useParticipant(uid ? AFTERPARTY_ROOM_ID : null, uid ?? undefined);
  const [checkedUid, setCheckedUid] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("name");
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<unknown>();
  const [prize, setPrize] = useState<PrizeId | "">("");
  const [joining, setJoining] = useState(false);
  const [query, setQuery] = useState("");

  const loaded =
    !!uid &&
    reception.data !== undefined &&
    afterparty.data !== undefined &&
    meReception.data !== undefined &&
    meAfter.data !== undefined &&
    reception.data !== null &&
    afterparty.data !== null;
  const receptionDone =
    !!meReception.data?.submitted ||
    (reception.data != null && reception.data.phase !== "lobby" && reception.data.phase !== "question");
  const afterpartyDone = afterparty.data?.phase === "finished";
  const ready = checkedUid === uid && !!seat;

  useEffect(() => {
    if (!loaded || !uid || !reception.data || !afterparty.data) return;
    const decision = resolveGuestSession({
      storedSeatId: readSeat(),
      reception: meReception.data,
      afterparty: meAfter.data,
    });
    if (!decision.keepUid) {
      writeSeat(null);
      resetGuestSession();
      setCheckedUid(null);
      setOpened(false);
      setStep("name");
      return;
    }
    if (decision.seatId !== readSeat()) writeSeat(decision.seatId);
    setCheckedUid(uid);
  }, [loaded, uid, reception.data, afterparty.data, meReception.data, meAfter.data]);

  function open(room: typeof RECEPTION_ROOM_ID | typeof AFTERPARTY_ROOM_ID) {
    setError(undefined);
    if (room === RECEPTION_ROOM_ID) {
      if (receptionDone) setStep("review-reception");
      else if (!meReception.data) setStep("prize");
      else setStep("reception");
      return;
    }
    if (afterpartyDone) setStep("review-afterparty");
    else setStep("afterparty");
  }

  useEffect(() => {
    if (!ready || opened) return;
    setOpened(true);
    if (!initialRoom) {
      setStep("select");
      return;
    }
    if (initialRoom === RECEPTION_ROOM_ID) {
      if (receptionDone) setStep("review-reception");
      else if (!meReception.data) setStep("prize");
      else setStep("reception");
      return;
    }
    if (afterpartyDone) setStep("review-afterparty");
    else setStep("afterparty");
  }, [ready, opened, initialRoom, receptionDone, afterpartyDone, meReception.data]);

  useEffect(() => {
    if (step !== "afterparty" || !uid || !seat || meAfter.data === undefined || meAfter.data || afterpartyDone) return;
    let cancel = false;
    setJoining(true);
    void joinRoom(AFTERPARTY_ROOM_ID, uid, seat.name)
      .catch((err) => {
        if (!cancel) setError(err);
      })
      .finally(() => {
        if (!cancel) setJoining(false);
      });
    return () => {
      cancel = true;
    };
  }, [step, uid, seat, meAfter.data, afterpartyDone]);

  useEffect(() => {
    if (step === "afterparty" && afterpartyDone) setStep("review-afterparty");
  }, [step, afterpartyDone]);

  useEffect(() => {
    if (step !== "accepted") return;
    const timer = window.setTimeout(() => setStep("select"), 2000);
    return () => window.clearTimeout(timer);
  }, [step]);

  function pick(guestId: string) {
    if (!uid) return;
    const first = !seatId;
    if (seatId && seatId !== guestId) resetGuestSession();
    writeSeat(guestId);
    setError(undefined);
    setOpened(true);
    if (first && initialRoom) {
      if (initialRoom === RECEPTION_ROOM_ID) setStep(receptionDone ? "review-reception" : "prize");
      else setStep(afterpartyDone ? "review-afterparty" : "afterparty");
      return;
    }
    setStep("select");
  }

  if (reception.error || afterparty.error || meReception.error || meAfter.error) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
        <ErrorNote error={reception.error || afterparty.error || meReception.error || meAfter.error} />
      </main>
    );
  }
  if (!loaded || checkedUid !== uid) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
        <Spinner />
      </main>
    );
  }

  const nameBar = seat ? <GuestNameBar name={seat.name} onChange={() => setStep("name")} /> : null;
  const matches = RECEPTION_GUESTS.filter((guest) => guest.name.includes(query.replace(/\s+/g, "")));

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 py-6">
      {step !== "name" && nameBar}
      {step === "name" && (
        <div className="space-y-4">
          {seat && (
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-bold">{seat.name}</p>
              <button type="button" className="shrink-0 text-sm font-bold text-blush-600 underline" onClick={() => setStep("select")}>
                クイズの選択に戻る
              </button>
            </div>
          )}
          <Title sub="河本直樹 & 磯野有梨花">Welcome</Title>
          <Ornament />
          <Card>
            <label className="block text-sm font-bold">
              お名前
              <input className={`${inputClass} mt-2 text-lg`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前で探す" autoFocus />
            </label>
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {matches.map((guest) => (
                <li key={guest.id}>
                  <button
                    type="button"
                    onClick={() => pick(guest.id)}
                    className={`w-full rounded-2xl px-3 py-2 text-left font-bold ${seatId === guest.id ? "bg-blush-500 text-white" : "bg-white"}`}
                  >
                    {guest.name}
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">見つかりません</li>}
            </ul>
          </Card>
        </div>
      )}

      {step === "select" && seat && (
        <div className="space-y-3">
          <Title sub={seat.name}>Quiz</Title>
          <QuizChoice label="一次会のクイズ" done={receptionDone} onClick={() => open(RECEPTION_ROOM_ID)} />
          <QuizChoice label="二次会のクイズ" done={afterpartyDone} onClick={() => open(AFTERPARTY_ROOM_ID)} />
        </div>
      )}

      {step === "prize" && seat && uid && (
        <Card className="space-y-4">
          <PrizeIntro />
          <PrizeChoices value={prize} onChange={setPrize} disabled={joining} />
          <ErrorNote error={error} />
          <Button
            className="w-full"
            disabled={!prize || joining}
            onClick={() => {
              setJoining(true);
              setError(undefined);
              void joinRoom(RECEPTION_ROOM_ID, uid, seat.name, prize, seat.id)
                .then(() => setStep("reception"))
                .catch((err) => setError(err))
                .finally(() => setJoining(false));
            }}
          >
            {joining ? "入室中…" : "この景品で始める"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
            クイズの選択に戻る
          </Button>
        </Card>
      )}

      {step === "accepted" && (
        <Card className="py-16 text-center">
          <p className="text-lg font-bold" aria-live="polite">
            回答を受け付けました
          </p>
        </Card>
      )}

      {step === "reception" && reception.data && meReception.data && (
        <div className="space-y-3">
          <SelfPlay room={reception.data} me={meReception.data} onSubmitted={() => setStep("accepted")} />
          <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
            クイズの選択に戻る
          </Button>
        </div>
      )}

      {step === "afterparty" && afterparty.data && (
        <div className="space-y-3">
          {error ? <ErrorNote error={error} /> : null}
          {!meAfter.data || joining ? (
            <Spinner />
          ) : (
            <PlayerGame room={afterparty.data} me={meAfter.data} />
          )}
          <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
            クイズの選択に戻る
          </Button>
        </div>
      )}

      {step === "review-reception" && (
        <div className="space-y-3">
          <AnswerReview roomId={RECEPTION_ROOM_ID} />
          <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
            クイズの選択に戻る
          </Button>
        </div>
      )}

      {step === "review-afterparty" && (
        <div className="space-y-3">
          <AnswerReview roomId={AFTERPARTY_ROOM_ID} />
          <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
            クイズの選択に戻る
          </Button>
        </div>
      )}
    </main>
  );
}

function GuestNameBar({ name, onChange }: { name: string; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-white/80 px-4 py-2 text-sm shadow-sm">
      <span className="min-w-0 truncate font-bold">{name}</span>
      <button type="button" className="shrink-0 font-bold text-blush-600 underline" onClick={onChange}>
        名前を変える
      </button>
    </div>
  );
}

function QuizChoice({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-3xl border border-white/80 bg-white/85 p-5 text-left shadow-lg">
      <span className="text-xl font-bold">{label}</span>
      {done && <span className="mt-1 block text-sm font-bold text-blush-600">回答済み</span>}
    </button>
  );
}
