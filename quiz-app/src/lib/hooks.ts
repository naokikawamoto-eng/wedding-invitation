"use client";

import { useEffect, useState } from "react";
import { syncStamp } from "./answer-ui";
import type { Answer, AnswerKey, Participant, Question, SyncBody } from "./types";
import { passcode } from "./transport";
import { registerPuller } from "./refresh";

type View = "guest" | "host" | "screen" | "list";

interface Entry {
  view: View;
  roomId: string;
  uid: string;
  data?: SyncBody;
  error?: Error;
  listeners: Set<() => void>;
  refs: number;
  seq: number;
  timer?: ReturnType<typeof setTimeout>;
  stopped: boolean;
}

const entries = new Map<string, Entry>();

const UID_KEY = "wedding-quiz-guest-id";

let serverNow = 0;
let receivedAt = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function ensureClock() {
  if (clockTimer || clockListeners.size === 0) return;
  clockTimer = setInterval(() => {
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
      return;
    }
    clockListeners.forEach((listener) => listener());
  }, 200);
}

export function noteServerNow(value: number) {
  if (!value) return;
  serverNow = value;
  receivedAt = Date.now();
  ensureClock();
}

/** サーバー時刻に合わせた「今」。制限時間の表示に使う */
export function useServerClock() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    clockListeners.add(listener);
    ensureClock();
    return () => {
      clockListeners.delete(listener);
    };
  }, []);
  if (!serverNow) return Date.now();
  return serverNow + (Date.now() - receivedAt);
}

export function useGuestId() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    let id = localStorage.getItem(UID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(UID_KEY, id);
    }
    setUid(id);
  }, []);
  return uid;
}

export function useGuestUser() {
  const uid = useGuestId();
  return { user: uid ? { uid } : null, error: undefined as Error | undefined };
}

async function pull(key: string): Promise<void> {
  const entry = entries.get(key);
  if (!entry || entry.stopped) return;
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = undefined;
  }
  const seq = ++entry.seq;
  try {
    const url = new URL("/api/sync", window.location.origin);
    url.searchParams.set("view", entry.view);
    if (entry.roomId) url.searchParams.set("roomId", entry.roomId);
    if (entry.uid) url.searchParams.set("uid", entry.uid);
    const headers: Record<string, string> = {};
    if (entry.view === "host" || entry.view === "list") headers["x-quiz-passcode"] = passcode();
    const res = await fetch(url, { headers, cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as SyncBody & { error?: string };
    if (entries.get(key) !== entry || entry.seq !== seq) return;
    if (!res.ok) throw new Error(body.error || "読み込めませんでした");
    noteServerNow(body.serverNow);
    if (entry.data && syncStamp(entry.data) === syncStamp(body) && !entry.error) return;
    entry.data = body;
    entry.error = undefined;
    entry.listeners.forEach((listener) => listener());
  } catch (error) {
    if (entries.get(key) !== entry || entry.seq !== seq) return;
    entry.error = error instanceof Error ? error : new Error("通信できませんでした");
    entry.listeners.forEach((listener) => listener());
  } finally {
    const current = entries.get(key);
    if (!current || current !== entry || current.stopped || current.seq !== seq) return;
    const delay = document.visibilityState === "hidden" ? 2000 : 800;
    current.timer = setTimeout(() => void pull(key), delay);
  }
}

function subscribe(key: string, params: { view: View; roomId: string; uid: string }, listener: () => void) {
  let entry = entries.get(key);
  if (!entry) {
    entry = { ...params, listeners: new Set(), refs: 0, seq: 0, stopped: false };
    entries.set(key, entry);
    void pull(key);
  }
  entry.refs += 1;
  entry.listeners.add(listener);
  listener();
  return () => {
    const current = entries.get(key);
    if (!current) return;
    current.refs -= 1;
    current.listeners.delete(listener);
    if (current.refs <= 0) {
      current.stopped = true;
      if (current.timer) clearTimeout(current.timer);
      entries.delete(key);
    }
  };
}

registerPuller(async () => {
  await Promise.all([...entries.keys()].map((key) => pull(key)));
});

const vis = globalThis as { __quizVis?: boolean };
if (typeof document !== "undefined" && !vis.__quizVis) {
  vis.__quizVis = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void pullAll();
  });
}

function pullAll() {
  return Promise.all([...entries.keys()].map((key) => pull(key)));
}

function useSync(view: View, roomId: string | null, enabled = true) {
  const uid = useGuestId();
  const active = enabled && (view === "list" || !!roomId) && (view !== "guest" || !!uid);
  const key = !active ? null : view === "list" ? "list" : `${view}:${roomId}:${view === "guest" ? uid : ""}`;
  const [state, setState] = useState<{ key: string | null; data?: SyncBody; error?: Error }>({ key: null });

  useEffect(() => {
    if (!key) return;
    return subscribe(key, { view, roomId: roomId ?? "", uid: uid ?? "" }, () => {
      const entry = entries.get(key);
      setState({ key, data: entry?.data, error: entry?.error });
    });
  }, [key, view, roomId, uid]);

  return state.key === key ? { data: state.data, error: state.error } : { data: undefined, error: undefined };
}

export function useRoom(roomId: string | null, view: "guest" | "host" | "screen" = "guest") {
  const sync = useSync(view, roomId);
  if (sync.error && !sync.data) return { data: undefined, error: sync.error };
  if (!sync.data) return { data: undefined, error: sync.error };
  return { data: sync.data.room ?? null, error: sync.error };
}

export function useParticipants(roomId: string | null) {
  const sync = useSync("guest", roomId);
  return { data: sync.data?.participants, error: sync.error };
}

export function useParticipant(roomId: string | null, uid: string | undefined) {
  const sync = useSync("guest", uid ? roomId : null);
  if (!sync.data) return { data: undefined as Participant | null | undefined, error: sync.error };
  return { data: sync.data.me ?? null, error: sync.error };
}

export function useQuestion(roomId: string | null, questionId: string | null) {
  const sync = useSync("guest", roomId);
  if (!sync.data) return { data: undefined as Question | null | undefined, error: sync.error };
  if (!questionId) return { data: null, error: sync.error };
  const question = sync.data.question;
  return { data: question && question.id === questionId ? question : null, error: sync.error };
}

export function useMyAnswer(roomId: string | null, questionId: string | null, uid: string | undefined) {
  const sync = useSync("guest", uid ? roomId : null);
  if (!sync.data) return { data: undefined as Answer | null | undefined, error: sync.error };
  return { data: sync.data.myAnswer ?? null, error: sync.error };
}

export function useQuestions(roomId: string | null) {
  const sync = useSync("host", roomId);
  return { data: sync.data?.questions, error: sync.error };
}

export function useAnswerKeys(roomId: string | null) {
  const sync = useSync("host", roomId);
  return {
    data: sync.data?.keys ? new Map(Object.entries(sync.data.keys)) : undefined,
    error: sync.error,
  };
}

export function useAnswers(roomId: string | null) {
  const sync = useSync("host", roomId);
  return { data: sync.data?.answers, error: sync.error };
}

export function useHostData(roomId: string | null) {
  const sync = useSync("host", roomId);
  return {
    questions: sync.data?.questions ?? [],
    keys: new Map<string, AnswerKey>(Object.entries(sync.data?.keys ?? {})),
    answers: sync.data?.answers ?? [],
    participants: sync.data?.participants ?? [],
    loading: !sync.data && !sync.error,
    error: sync.error,
  };
}

export function useGuestPacket(roomId: string | null) {
  const sync = useSync("guest", roomId);
  return {
    questions: sync.data?.questions ?? [],
    myAnswers: sync.data?.myAnswers ?? [],
    answerSheet: sync.data?.answerSheet ?? null,
    error: sync.error,
  };
}

export function useScreen(roomId: string) {
  const sync = useSync("screen", roomId);
  return {
    room: sync.data ? (sync.data.room ?? null) : undefined,
    question: sync.data?.question ?? null,
    questions: sync.data?.questions ?? [],
    participants: sync.data?.participants ?? [],
    answers: sync.data?.answers ?? [],
    answerKey: sync.data?.answerKey ?? null,
    answerSheet: sync.data?.answerSheet ?? null,
    progress: sync.data?.progress ?? [],
    answeredCount: sync.data?.answeredCount ?? 0,
    error: sync.error,
  };
}

export function useRooms(enabled: boolean) {
  const sync = useSync("list", null, enabled);
  return { data: sync.data?.rooms, error: sync.error };
}
