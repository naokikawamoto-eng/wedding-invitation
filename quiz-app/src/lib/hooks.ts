"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  answerId,
  answerKeysCol,
  answersCol,
  fromDoc,
  participantsCol,
  questionsCol,
  roomRef,
} from "./quiz";
import type { Answer, AnswerKey, Participant, Question, Room } from "./types";

interface Live<T> {
  data: T | undefined;
  error: Error | undefined;
}

/** key が変わるたびに購読し直す onSnapshot のラッパー。key が null の間は購読しない */
function useLive<T>(
  key: string | null,
  subscribe: (next: (value: T) => void, fail: (e: Error) => void) => () => void,
): Live<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: Error }>({ key: null });
  useEffect(() => {
    if (!key) return;
    return subscribe(
      (data) => setState({ key, data }),
      (error) => {
        console.error(key, error);
        setState({ key, error });
      },
    );
    // subscribe は key から決まるので key だけを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? { data: state.data, error: state.error } : { data: undefined, error: undefined };
}

export function useAuthUser() {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => onAuthStateChanged(auth(), (user) => setState({ user, ready: true })), []);
  return state;
}

/** 参加者用：未ログインなら匿名ログインする（ブラウザを閉じても同じ uid のまま） */
export function useGuestUser() {
  const { user, ready } = useAuthUser();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    if (ready && !user) signInAnonymously(auth()).catch(setError);
  }, [ready, user]);
  return { user, error };
}

export function useRoom(roomId: string | null) {
  return useLive<Room | null>(roomId && `room/${roomId}`, (next, fail) =>
    onSnapshot(roomRef(roomId!), (s) => next(s.exists() ? fromDoc<Room>(s) : null), fail),
  );
}

export function useParticipants(roomId: string | null) {
  return useLive<Participant[]>(roomId && `participants/${roomId}`, (next, fail) =>
    onSnapshot(participantsCol(roomId!), (s) => next(s.docs.map((d) => fromDoc<Participant>(d))), fail),
  );
}

export function useParticipant(roomId: string | null, uid: string | undefined) {
  return useLive<Participant | null>(roomId && uid ? `participant/${roomId}/${uid}` : null, (next, fail) =>
    onSnapshot(
      doc(participantsCol(roomId!), uid!),
      (s) => next(s.exists() ? fromDoc<Participant>(s) : null),
      fail,
    ),
  );
}

/** 参加者用：出題中の 1 問だけを読む */
export function useQuestion(roomId: string | null, questionId: string | null) {
  return useLive<Question | null>(roomId && questionId ? `question/${roomId}/${questionId}` : null, (next, fail) =>
    onSnapshot(
      doc(questionsCol(roomId!), questionId!),
      (s) => next(s.exists() ? fromDoc<Question>(s) : null),
      fail,
    ),
  );
}

export function useMyAnswer(roomId: string | null, questionId: string | null, uid: string | undefined) {
  return useLive<Answer | null>(
    roomId && questionId && uid ? `answer/${roomId}/${questionId}/${uid}` : null,
    (next, fail) =>
      onSnapshot(
        doc(answersCol(roomId!), answerId(questionId!, uid!)),
        (s) => next(s.exists() ? fromDoc<Answer>(s) : null),
        fail,
      ),
  );
}

// ── 以下は主催者だけが読める ──────────────────────────────

export function useQuestions(roomId: string | null) {
  return useLive<Question[]>(roomId && `questions/${roomId}`, (next, fail) =>
    onSnapshot(
      query(questionsCol(roomId!), orderBy("order")),
      (s) => next(s.docs.map((d) => fromDoc<Question>(d))),
      fail,
    ),
  );
}

export function useAnswerKeys(roomId: string | null) {
  return useLive<Map<string, AnswerKey>>(roomId && `answerKeys/${roomId}`, (next, fail) =>
    onSnapshot(answerKeysCol(roomId!), (s) => next(new Map(s.docs.map((d) => [d.id, d.data() as AnswerKey]))), fail),
  );
}

export function useAnswers(roomId: string | null, questionId?: string | null) {
  const key = roomId && `answers/${roomId}/${questionId ?? "*"}`;
  return useLive<Answer[]>(key, (next, fail) =>
    onSnapshot(
      questionId ? query(answersCol(roomId!), where("questionId", "==", questionId)) : answersCol(roomId!),
      (s) => next(s.docs.map((d) => fromDoc<Answer>(d))),
      fail,
    ),
  );
}

/** 主催者画面でまとめて購読するデータ */
export function useHostData(roomId: string | null) {
  const questions = useQuestions(roomId);
  const keys = useAnswerKeys(roomId);
  const answers = useAnswers(roomId);
  const participants = useParticipants(roomId);
  return {
    questions: questions.data ?? [],
    keys: keys.data ?? new Map<string, AnswerKey>(),
    answers: answers.data ?? [],
    participants: participants.data ?? [],
    loading: !questions.data || !keys.data || !answers.data || !participants.data,
    error: questions.error ?? keys.error ?? answers.error ?? participants.error,
  };
}

export function useRooms(enabled: boolean) {
  return useLive<Room[]>(enabled ? "rooms" : null, (next, fail) =>
    onSnapshot(
      collection(db(), "rooms"),
      (s) =>
        next(
          s.docs
            .map((d) => fromDoc<Room>(d))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        ),
      fail,
    ),
  );
}
