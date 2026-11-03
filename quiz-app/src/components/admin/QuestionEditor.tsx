"use client";

import { useState } from "react";
import { uploadQuestionImage } from "@/lib/image";
import { saveQuestion, type QuestionDraft } from "@/lib/quiz";
import type { AnswerKey, Question, QuestionType } from "@/lib/types";
import { CHOICE_LETTERS, CHOICE_STYLES, MAX_CHOICES } from "../choice";
import { Button, Card, ErrorNote, inputClass } from "../ui";

export function QuestionEditor({
  roomId,
  question,
  answerKey,
  nextOrder,
  onClose,
}: {
  roomId: string;
  question?: Question;
  answerKey?: AnswerKey;
  nextOrder: number;
  onClose: () => void;
}) {
  const [type, setType] = useState<QuestionType>(question?.type ?? "choice");
  const [text, setText] = useState(question?.text ?? "");
  const [imageUrl, setImageUrl] = useState(question?.imageUrl ?? "");
  const [choices, setChoices] = useState<string[]>(question?.choices.length ? question.choices : ["", "", "", ""]);
  const [correctChoice, setCorrectChoice] = useState<number | null>(answerKey?.correctChoice ?? null);
  const [correctTexts, setCorrectTexts] = useState((answerKey?.correctTexts ?? []).join("\n"));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();

  const textAnswers = correctTexts.split("\n").map((t) => t.trim()).filter(Boolean);
  const problem =
    !text.trim() && !imageUrl
      ? "問題文か画像を入力してください"
      : type === "choice"
        ? choices.some((c) => !c.trim())
          ? "空の選択肢があります（不要なら ✕ で削除）"
          : correctChoice === null
            ? "正解の選択肢を選んでください"
            : null
        : !textAnswers.length
          ? "正解テキストを入力してください"
          : null;

  function removeChoice(i: number) {
    setChoices(choices.filter((_, j) => j !== i));
    if (correctChoice === i) setCorrectChoice(null);
    else if (correctChoice !== null && correctChoice > i) setCorrectChoice(correctChoice - 1);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      setImageUrl(await uploadQuestionImage(roomId, file));
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    const draft: QuestionDraft = { type, text, imageUrl: imageUrl || null, choices, correctChoice, correctTexts: textAnswers };
    setSaving(true);
    setError(undefined);
    try {
      await saveQuestion(roomId, draft, question?.order ?? nextOrder, question?.id);
      onClose();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5 ring-2 ring-blush-200">
      <h3 className="font-bold">{question ? "問題を編集" : "問題を追加"}</h3>

      <div className="flex gap-2">
        {(["choice", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded-2xl border-2 py-2 font-bold transition ${
              type === t ? "border-blush-400 bg-blush-50 text-blush-600" : "border-transparent bg-white text-ink-soft"
            }`}
          >
            {t === "choice" ? "選択式" : "記述式"}
          </button>
        ))}
      </div>

      <label className="block text-sm font-bold">
        問題文
        <textarea
          className={`${inputClass} mt-1 min-h-24`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例：新郎新婦が初めて出会った場所は？"
        />
      </label>

      <div className="space-y-2 text-sm">
        <span className="font-bold">画像（任意）</span>
        {imageUrl && (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="max-h-48 rounded-2xl shadow" />
            <button
              onClick={() => setImageUrl("")}
              className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-white"
              title="画像を外す"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-blush-300 bg-white px-4 py-2 font-bold text-blush-600 hover:bg-blush-50">
            {uploading ? "アップロード中…" : "画像を選ぶ"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <input
            className={`${inputClass} flex-1 py-2 text-sm`}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="または画像 URL（/quiz/photo1.jpg など）"
          />
        </div>
      </div>

      {type === "choice" ? (
        <div className="space-y-2 text-sm">
          <span className="font-bold">選択肢（◎ で正解を選択）</span>
          {choices.map((choice, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setCorrectChoice(i)}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white transition ${CHOICE_STYLES[i].badge} ${
                  correctChoice === i ? "ring-4 ring-gold-300 ring-offset-2" : "opacity-60"
                }`}
                title="これを正解にする"
              >
                {CHOICE_LETTERS[i]}
              </button>
              <input
                className={`${inputClass} py-2`}
                value={choice}
                onChange={(e) => setChoices(choices.map((c, j) => (j === i ? e.target.value : c)))}
                placeholder={`選択肢 ${CHOICE_LETTERS[i]}`}
              />
              {correctChoice === i && <span className="shrink-0 font-bold text-gold-600">正解</span>}
              <button
                onClick={() => removeChoice(i)}
                disabled={choices.length <= 2}
                className="shrink-0 rounded-full px-2 text-ink-soft hover:text-red-600 disabled:opacity-20"
                title="選択肢を削除"
              >
                ✕
              </button>
            </div>
          ))}
          {choices.length < MAX_CHOICES && (
            <Button variant="ghost" size="sm" onClick={() => setChoices([...choices, ""])}>
              ＋ 選択肢を追加
            </Button>
          )}
        </div>
      ) : (
        <label className="block text-sm font-bold">
          正解テキスト（1行に1つ。別解も書けます）
          <textarea
            className={`${inputClass} mt-1 min-h-20`}
            value={correctTexts}
            onChange={(e) => setCorrectTexts(e.target.value)}
            placeholder={"ハワイ\nはわい"}
          />
          <span className="mt-1 block text-xs font-normal text-ink-soft">
            完全一致で判定します。全角/半角・スペース・英字の大文字小文字の違いだけは同じとみなします。
          </span>
        </label>
      )}

      <ErrorNote error={error} />
      <div className="flex items-center justify-end gap-3">
        {problem && <span className="mr-auto text-xs text-ink-soft">{problem}</span>}
        <Button variant="ghost" onClick={onClose}>
          キャンセル
        </Button>
        <Button onClick={onSave} disabled={!!problem || saving || uploading}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
    </Card>
  );
}
