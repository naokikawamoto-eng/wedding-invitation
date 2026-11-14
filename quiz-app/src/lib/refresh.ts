type Puller = () => Promise<void>;

let puller: Puller | null = null;

export function registerPuller(next: Puller) {
  puller = next;
}

/** 回答や進行の直後に、次の定期更新を待たず画面を揃える */
export async function requestRefresh() {
  if (puller) await puller();
}
