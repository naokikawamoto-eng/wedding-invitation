# Wedding Quiz — 二次会リアルタイムクイズ

ゲストは自分のスマホで回答し、主催者は PC/タブレットで進行・集計するクイズアプリです。
主催者がボタンを押すと、全員のスマホとスクリーンが同時に切り替わります。

- **Next.js 16**（App Router / TypeScript）＋ **Tailwind CSS v4**
- **Firebase**：Firestore（リアルタイム同期）/ Storage（問題画像）/ Authentication（匿名ログイン。主催者は合言葉で昇格）
- サーバー側のコード（Cloud Functions）は使いません。不正防止はセキュリティルールで行います

---

## 1. 画面構成

| URL | 使う人 | 内容 |
|---|---|---|
| `/` | ゲスト | ルームコードを入力 |
| `/play/{コード}` | ゲスト | ニックネームで入室 → 待機 → 回答 → 正解/不正解・順位 → 最終結果。QR コードはここを指します |
| `/admin` | 主催者 | 合言葉で入室・ルームの作成と一覧 |
| `/admin/{コード}` | 主催者 | タブで **進行**／**問題**（作成・画像・並べ替え）／**ランキング**／**分析**（正解率・選択肢の分布） |
| `/screen/{コード}` | 会場スクリーン | プロジェクター用の大きな表示。待機中は参加 QR、出題中は問題と回答数、発表時は分布、最後はランキング |

進行は次の 4 つのボタンで行います。

```
[Q1 を表示する] → [回答を締め切る] → [正解を発表する] → [Q2 を表示する] → … → [最終結果を発表する]
     phase: question        closed            revealed                               finished
```

### コンポーネント

```
src/
├── app/
│   ├── page.tsx                 ルームコード入力
│   ├── play/[roomId]/page.tsx   ゲスト画面（入室状態で JoinForm / PlayerGame を出し分け）
│   ├── admin/page.tsx           ルーム一覧・作成
│   ├── admin/[roomId]/page.tsx  主催者ダッシュボード（タブ）
│   └── screen/[roomId]/page.tsx プロジェクター表示
├── components/
│   ├── player/  JoinForm, PlayerGame（待機/出題/最終結果）, AnswerArea（選択肢・記述入力）
│   ├── admin/   AdminGate（合言葉）, ControlPanel（進行）, QuestionManager, QuestionEditor, AnalyticsPanel
│   ├── QuestionBody, AnswerStats（分布バー）, Ranking, JoinQR, ui（Button/Card など）
└── lib/
    ├── firebase.ts  初期化（エミュレータ切替を含む）
    ├── hooks.ts     onSnapshot を使ったリアルタイム購読フック
    ├── quiz.ts      書き込み処理（入室・回答・問題保存・進行・採点・リセット）
    ├── judge.ts     正誤判定
    ├── scoring.ts   得点計算・順位付け・問題別集計
    └── image.ts     画像の縮小とアップロード
```

---

## 2. データベース設計（Firestore）

```
config/admin                       passcode   ← 主催者の合言葉。クライアントからは読めない
admins/{uid}                       passcode   ← 合言葉が一致したときだけ作れる＝主催者の印

rooms/{roomId}                     ← roomId は 5 文字のルームコード（例: K7Q2M）
│  title, hostUid
│  phase: "lobby" | "question" | "closed" | "revealed" | "finished"
│  currentQuestionId, currentNumber, totalQuestions
│  questionStartedAt               出題した時刻（サーバー時刻）
│  revealedQuestionIds: string[]   正解発表済みの問題
│  reveal: { questionId, type, correctChoice, correctTexts } | null   ← 発表した正解をゲストに公開
│
├── questions/{questionId}         order, type("choice"|"text"), text, imageUrl, choices[]
├── answerKeys/{questionId}        correctChoice, correctTexts[]      ← 主催者だけが読める
├── participants/{uid}             nickname, score, totalTimeMs, joinedAt
└── answers/{questionId}_{uid}     questionId, uid, nickname, choice | text, startedAt, answeredAt
```

**なぜこの形にしたか**

- **主催者は合言葉で判定**：全員匿名ログインし、`admins/{uid}` を作れた端末だけが主催者です。ルールが `config/admin` の合言葉と照合するので、合言葉はブラウザに一切届きません。
- **正解を別コレクションに分けた**：`questions` はゲストも読むので、正解を入れると開発者ツールで見えてしまいます。`answerKeys` は主催者専用にして、発表時に `rooms.reveal` へコピーします。
- **ゲストは出題中の 1 問しか読めない**：問題の先読みもルールで禁止しています。
- **回答 ID を `{問題ID}_{uid}` に固定**：1 人 1 問 1 回をルールで保証できます。締切後の回答、回答の書き換え、他人の回答の閲覧もルールで拒否します。
- **回答時刻はサーバー時刻**：`startedAt` と `answeredAt` はどちらもサーバーの時刻で、ルールが改ざんを防ぎます。同点の場合は、正解した問題の回答時間の合計が短い人を上位にします。
- **採点は毎回ゼロから計算**：「正解を発表する」を押すと、主催者のブラウザが発表済みの全問題・全回答から得点を計算し直して `participants.score` に書き込みます。二度押ししても、後から正解を直して「得点を再計算」しても結果はずれません（Cloud Functions が不要なので無料プランで動きます）。
- ランキングと分析は、参加者と回答を購読してブラウザ側で並べ替え・集計します。100〜200 人規模なら十分軽く、複合インデックスも要りません。

**正誤判定**（`src/lib/judge.ts`）
- 選択式：選んだ番号が正解の番号と同じなら正解
- 記述式：完全一致で判定します。ただし全角/半角・スペース・英字の大文字小文字の違いは同じとみなします。ひらがなとカタカナのような表記違いは、正解テキストに別解として 1 行ずつ追加してください。

---

## 3. ローカルで動かす

必要なもの：**Node.js 20 以上**（`node -v` で確認）

### A. Firebase プロジェクトを作らずに試す（エミュレータ）

エミュレータの起動には Java 21 が必要です（未インストールなら `brew install openjdk@21`）。

```bash
cd quiz-app
npm install
cp .env.local.example .env.local
# .env.local は下の「B. エミュレータ」の 4 行だけを残し、先頭の # を外す
```

ターミナルを 2 つ開いて、それぞれで実行します。

```bash
npm run emulators   # Firestore / Auth / Storage のエミュレータ（管理画面: http://localhost:4000）
npm run dev         # アプリ本体: http://localhost:3000
```

1. 合言葉を登録する（初回のみ。`npm run emulators` の起動中に、[Emulator UI](http://localhost:4000/firestore) で `config/admin` ドキュメントを作り、文字列フィールド `passcode` に 6 文字以上を入れる）
2. PC で http://localhost:3000/admin を開き、合言葉を入力する
3. ルームを作成し、「問題」タブで問題を追加する
4. 「参加用QR」をスマホで読み取る（PC と同じ Wi-Fi に接続しておく）。シークレットウィンドウで `/play/{コード}` を開いても、別のゲストとして参加できます
5. 「進行」タブで問題を表示し、締め切り、正解を発表する

### B. 実際の Firebase プロジェクトを使う

1. https://console.firebase.google.com でプロジェクトを作成する
2. **Authentication** →「始める」（匿名ログインは手順 6 の `firebase deploy --only auth` でも有効にできます）
3. **Firestore Database** → データベースを作成（本番モード、リージョン `asia-northeast1`）
4. **Storage** → 始める（※後述の注意あり）
5. プロジェクトの設定 → マイアプリ →「</>」で Web アプリを追加し、表示された値を `.env.local` の A 欄に貼り付ける
6. セキュリティルールを反映する

   ```bash
   npx firebase login
   npx firebase use --add          # 作ったプロジェクトを選ぶ
   npm run deploy:rules            # firestore.rules と storage.rules をデプロイ
   npx firebase deploy --only auth # 匿名ログインを有効化
   ```
7. 合言葉を登録する：Firestore コンソールで `config` コレクションに ID `admin` のドキュメントを作り、文字列フィールド `passcode` に 6 文字以上を入れる
8. `npm run dev` を実行して http://localhost:3000/admin を開き、合言葉を入力する

> **Storage の注意**：現在、Firebase Storage を使うには Blaze プラン（従量課金・クレジットカードの登録）が必要です。この規模なら無料枠に収まりますが、念のため予算アラートを設定してください。
> Blaze にしたくない場合は、画像を `public/quiz/` に置き、問題編集画面の「画像 URL」欄に `/quiz/photo1.jpg` のように入力すれば、アップロードなしで使えます。

---

## 4. 本番公開（Vercel）

招待状サイトとは別の Vercel プロジェクトとして作成します（招待状のデプロイには含まれないよう、`.vercelignore` で除外済みです）。

1. Vercel で「Add New → Project」→ 同じリポジトリを選ぶ
2. **Root Directory** を `quiz-app` にする
3. Environment Variables に `.env.local` の A 欄の値を入れる。`NEXT_PUBLIC_APP_URL` には公開 URL を入れる（例 `https://quiz.example.com`）

---

## 5. 当日のチェックリスト

- [ ] リハーサルが終わったら「進行」タブの「参加者ごと全てリセット」を押す
- [ ] 会場スクリーンで `/screen/{コード}` を開き、全画面表示にする（主催者と同じブラウザで開く）
- [ ] 進行用の画面は手元のタブレットか別ウィンドウで `/admin/{コード}` を開く
- [ ] 会場の Wi-Fi が弱いときに備え、ゲストにはモバイル回線でも参加できると伝える
- [ ] 合言葉を変えたいときは、Firestore コンソールで `config/admin` の `passcode` を書き換える（すでに入室済みの端末は `admins` コレクションから消すと締め出せる）
