import type { SyncBody } from "./types";

export type LocalPick = {
  choice: number;
  status: "saving" | "saved" | "error";
};

/**
 * 画面に出す選択肢。
 * 受付中は、保存待ち・失敗・サーバーがまだ追いついていないあいだ、いま押した選択を維持する。
 * 締め切り後はサーバーに残った回答だけを出す。
 */
export function visibleChoice(server: number | null, local: LocalPick | null, open: boolean): number | null {
  if (!open || !local) return server;
  if (local.status === "saving" || local.status === "error") return local.choice;
  if (server === local.choice) return server;
  return local.choice;
}

const tails = new Map<string, Promise<void>>();

/** 同じ人の保存を順番に送る。後から押した回答が、先の通信に上書きされないようにする */
export function enqueueForUser<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const run = prev.then(task, task);
  tails.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

/** 部屋の版番号が変わらなくても、回答や人数が変わったら画面を更新する */
export function syncStamp(body: SyncBody): string {
  const room = body.room;
  const mine = (body.myAnswers ?? [])
    .map((answer) => `${answer.questionId}:${answer.choice ?? ""}:${answer.text ?? ""}:${answer.answeredAt ?? ""}`)
    .join(",");
  const one = body.myAnswer
    ? `${body.myAnswer.questionId}:${body.myAnswer.choice ?? ""}:${body.myAnswer.text ?? ""}:${body.myAnswer.answeredAt ?? ""}`
    : "";
  const progress = (body.progress ?? []).map((item) => `${item.questionId}:${item.answered}`).join(",");
  const answers = (body.answers ?? [])
    .map((answer) => `${answer.id}:${answer.choice ?? ""}:${answer.text ?? ""}:${answer.answeredAt ?? ""}`)
    .join(",");
  const people = (body.participants ?? []).map((person) => `${person.id}:${person.nickname}:${person.score}`).join(",");
  const me = body.me ? `${body.me.id}:${body.me.nickname}:${body.me.score}` : "";
  const sheet = (body.answerSheet ?? []).map((item) => item.questionId).join(",");
  return [
    body.version,
    room ? `${room.phase}:${room.currentQuestionId ?? ""}:${room.questionEndsAt ?? ""}:${room.totalQuestions}` : "",
    mine,
    one,
    progress,
    answers,
    people,
    me,
    body.answeredCount ?? "",
    body.questions?.length ?? "",
    sheet,
  ].join("|");
}
