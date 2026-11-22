import type { Question } from "@/lib/types";

export function QuestionBody({
  question,
  number,
  total,
  large = false,
}: {
  question: Pick<Question, "text" | "imageUrl" | "type">;
  number?: number;
  total?: number;
  large?: boolean;
}) {
  return (
    <div className="animate-pop">
      <div className="mb-3 flex items-center justify-center gap-2">
        {number ? (
          <span className={`font-display font-semibold italic text-gold-600 ${large ? "text-5xl" : "text-3xl"}`}>
            Q{number}
            {total ? <span className="text-[0.55em] text-gold-400"> / {total}</span> : null}
          </span>
        ) : null}
        <span className="rounded-full bg-gold-100 px-3 py-0.5 text-xs font-bold text-gold-600">
          {question.type === "choice" ? "選択式" : "記述式"}
        </span>
      </div>
      {question.text && (
        <p
          className={`whitespace-pre-wrap text-center font-bold leading-relaxed ${large ? "text-4xl lg:text-5xl" : "text-xl"}`}
        >
          {question.text}
        </p>
      )}
      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- アップロードした画像 URL をそのまま表示する
        <img
          src={question.imageUrl}
          alt=""
          className={`mx-auto mt-4 rounded-2xl object-contain shadow-md ${large ? "max-h-[45vh]" : "max-h-64 w-full"}`}
        />
      )}
    </div>
  );
}
