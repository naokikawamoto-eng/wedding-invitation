import { RECEPTION_GUESTS, type ReceptionGuest } from "./reception-guests";

const UID_KEY = "wedding-quiz-guest-id";
const SEAT_KEY = "wedding-quiz-seat";

const uidListeners = new Set<(id: string) => void>();
const seatListeners = new Set<(id: string | null) => void>();

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readOrCreateGuestId(storage: Pick<Storage, "getItem" | "setItem"> = localStorage): string {
  const current = storage.getItem(UID_KEY);
  if (current) return current;
  const id = crypto.randomUUID();
  storage.setItem(UID_KEY, id);
  return id;
}

/** この端末の参加者IDだけを替える。サーバー上の回答はそのまま残す */
export function resetGuestSession(storage: Pick<Storage, "getItem" | "setItem"> = localStorage): string {
  const id = crypto.randomUUID();
  storage.setItem(UID_KEY, id);
  uidListeners.forEach((listener) => listener(id));
  return id;
}

export function subscribeGuestId(listener: (id: string) => void): () => void {
  uidListeners.add(listener);
  return () => {
    uidListeners.delete(listener);
  };
}

export function guestById(id: string | null | undefined): ReceptionGuest | null {
  if (!id) return null;
  return RECEPTION_GUESTS.find((guest) => guest.id === id) ?? null;
}

export function readSeat(storage: Pick<Storage, "getItem"> = localStorage): string | null {
  const id = storage.getItem(SEAT_KEY);
  return guestById(id) ? id : null;
}

export function writeSeat(id: string | null, storage: Store = localStorage) {
  if (id && guestById(id)) storage.setItem(SEAT_KEY, id);
  else storage.removeItem(SEAT_KEY);
  const next = readSeat(storage);
  seatListeners.forEach((listener) => listener(next));
}

export function subscribeSeat(listener: (id: string | null) => void): () => void {
  seatListeners.add(listener);
  return () => {
    seatListeners.delete(listener);
  };
}

export interface KnownGuest {
  guestId?: string | null;
  nickname?: string | null;
}

/** 名簿の人だけを返す。名前の自由入力（名簿導入前の参加）は対象外 */
export function listedGuest(person: KnownGuest | null | undefined): ReceptionGuest | null {
  if (!person) return null;
  if (person.guestId) {
    const guest = guestById(person.guestId);
    if (!guest) return null;
    if (person.nickname && person.nickname !== guest.name) return null;
    return guest;
  }
  if (!person.nickname) return null;
  const matches = RECEPTION_GUESTS.filter((guest) => guest.name === person.nickname);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * 保存済みの端末IDを使ってよいか。
 * 名簿に無い名前や、名簿導入前の自由入力は捨てて名前選択に戻す。
 */
export function resolveGuestSession(input: {
  storedSeatId: string | null;
  reception?: KnownGuest | null;
  afterparty?: KnownGuest | null;
}): { keepUid: boolean; seatId: string | null } {
  const stored = guestById(input.storedSeatId);
  const fromReception = listedGuest(input.reception);
  const fromAfterparty = listedGuest(input.afterparty);
  if ((input.reception && !fromReception) || (input.afterparty && !fromAfterparty)) {
    return { keepUid: false, seatId: null };
  }
  if (fromReception && fromAfterparty && fromReception.id !== fromAfterparty.id) {
    return { keepUid: false, seatId: null };
  }
  const server = fromReception ?? fromAfterparty;
  if (server && stored && server.id !== stored.id) return { keepUid: false, seatId: null };
  return { keepUid: true, seatId: server?.id ?? stored?.id ?? null };
}
