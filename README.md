# Wedding Invitation — 河本直樹 & 磯野有梨花

2026年11月22日（日）／ ザ・プリンス パークタワー東京

サーバーにそのままアップロードすれば公開できる状態になっています。
PHP やデータベースは不要で、静的ファイルのみで動きます。

---

## 1. ファイル構成

```
.
├── index.html                  ページ本体
├── vercel.json                 Vercel 用のヘッダ・キャッシュ設定
├── .htaccess                   Apache 用の圧縮・キャッシュ設定
├── robots.txt                  検索避け
└── assets/
    ├── css/style.css           デザイン
    ├── js/app.js               動作（★ 出欠フォームの設定はこの先頭）
    ├── js/particles.min.js     光の粒（particles.js / MIT）
    └── img/                    画像 一式（.jpg と .webp の両方）
```

画像は `.webp` と `.jpg` を両方置いてあります。対応しているブラウザは自動で
軽い `.webp` を、古いブラウザは `.jpg` を読みます。**どちらか一方だけを消さないでください。**

---

## 2. アップロード手順

### 現在の公開方法：Vercel（自動デプロイ）

本番は **Vercel** で配信しています。公開URLは `https://wedding.arlys-japan.com/` です。

このリポジトリの `main` ブランチに push すると、Vercel が自動でビルドせずそのまま配信します。
手動での操作は不要です。

```
git add -A && git commit -m "..." && git push origin main
```

- ビルド処理は無く、静的ファイルがそのまま配信されます
- 圧縮・キャッシュ・`X-Robots-Tag` などのヘッダは `vercel.json` が担当します
  （`.htaccess` は Apache 専用のため Vercel では読まれません）
- ドメインの DNS は Xserver のネームサーバーで管理しているため、
  サブドメインを増やす場合は Xserver 側の DNS レコード設定が必要です

> コミット作成者のメールアドレスが Vercel アカウントと紐づいていないと、
> デプロイが `BLOCKED` になり反映されません。`git config user.email` を確認してください。

### 他のサーバーへ手動で置く場合

`index.html` `assets/` `.htaccess` `robots.txt` を、公開したいディレクトリへ
**フォルダ構造のまま**アップロードするだけです。

```
例）https://example.com/wedding/  で公開する場合
    /wedding/index.html
    /wedding/assets/...
```

- パスはすべて相対指定なので、サブディレクトリでもドメイン直下でも動きます
- **https での公開を強くおすすめします。** 地図の埋め込みと Web フォントは
  http だとブラウザにブロックされることがあります

### Nginx をお使いの場合

`.htaccess` は Apache 専用です。Nginx では以下を参考にしてください。

```nginx
location ~* \.(jpg|jpeg|webp|png|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
location ~* \.(css|js)$ { expires 7d; }
location = /index.html   { add_header Cache-Control "no-cache"; }
gzip on;
gzip_types text/css application/javascript image/svg+xml;
```

---

## 3. 出欠フォームの送信先（Google スプレッドシート）

ゲストの返信は Google スプレッドシートに 1 行ずつ溜まります。
初回だけ、次の手順でウェブアプリ URL を発行してください。

1. [新しいスプレッドシート](https://sheets.new) を作る（名前例：`Wedding RSVP 河本・磯野`）
2. メニュー **拡張機能 → Apps Script** を開く
3. `google-apps-script/Code.gs` の内容を貼り付けて保存する
4. **デプロイ → 新しいデプロイ**
   - 種類：ウェブアプリ
   - 次のユーザーとして実行：自分
   - アクセスできるユーザー：**全員**
5. 発行された URL を `assets/js/app.js` の `RSVP.endpoint` に貼る

```js
var RSVP = {
  endpoint: 'https://script.google.com/macros/s/【デプロイID】/exec',
  mode: 'no-cors'
};
```

シートの列は「ご出欠・お名前・連絡先・アレルギー・お連れ様・メッセージ」など、
招待状の入力項目と同じ並びです。

**設定したら、必ずご自身でテスト送信して、シートに行が増えるか確認してください。**

---

## 4. 公開前に直しておきたい箇所

`index.html` 内の `<!-- ▼ … -->` というコメントが編集ポイントの目印です。

| 箇所 | 現在 | 備考 |
|---|---|---|
| Host のおふたりのコメント | 仮の文章 | ご自身の言葉に |
| 挙式・披露宴の時間 | 確定済み | スケジュール表より反映済み |
| 返信期日 | 2026年10月19日（月） | 確定済み |
| お電話番号 | 確定済み | タップで発信できます |

---

## 5. LINE などで共有したときの見え方

`assets/img/og.jpg` がサムネイルとして表示されます。
`index.html` の `og:image` は相対パスになっているので、**絶対 URL に
書き換えると確実です。**

```html
<meta property="og:image" content="https://example.com/wedding/assets/img/og.jpg">
```

LINE はサムネイルを強くキャッシュします。差し替えたのに古い画像が出る場合は、
ファイル名を `og-2.jpg` のように変えてください。

---

## 6. 検索避けについて

身内向けの招待状のため、以下の三重で検索エンジンからの登録を防いでいます。

- `index.html` の `<meta name="robots" content="noindex">`
- `robots.txt` の `Disallow: /`
- `.htaccess` の `X-Robots-Tag: noindex, nofollow`

URL を知っている人だけがアクセスできる状態です。より厳密にしたい場合は、
サーバー側で Basic 認証をかけてください。

---

## 7. 動作環境

iOS Safari / Android Chrome / PC の主要ブラウザで動作します。
Web フォント（Google Fonts）と地図（Google Maps）のみ外部を参照します。
端末の「視差効果を減らす」設定が有効な場合、アニメーションは自動で無効になります。
