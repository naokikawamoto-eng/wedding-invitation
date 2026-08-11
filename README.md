# Wedding Invitation — 河本直樹 & 磯野有梨花

2026年11月22日（日）／ ザ・プリンス パークタワー東京

サーバーにそのままアップロードすれば公開できる状態になっています。
PHP やデータベースは不要で、静的ファイルのみで動きます。

---

## 1. ファイル構成

```
.
├── index.html                  ページ本体
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

## 3. ★ 出欠フォームの送信先を設定する（未設定です）

**現在フォームは送信されません。** このまま公開すると、ゲストが入力しても
「ただいま受付の準備中です」と表示されるだけになります。必ず設定してください。

`assets/js/app.js` の先頭を編集します。

```js
var RSVP = {
  endpoint: '',      // ← ここに送信先の URL
  mode: 'cors'
};
```

### A. Google フォームに集計する場合（無料・おすすめ）

1. Google フォームで、招待状と同じ項目の質問を作ります
2. フォームのプレビューを開き、ページのソースから各項目の `entry.123456789`
   という name を調べます
3. `index.html` の各入力欄の `name="..."` を、その `entry.xxxxx` に書き換えます

   | 招待状の name | 内容 |
   |---|---|
   | `attend` | ご出欠（出席／欠席／保留）|
   | `side` | 新郎側／新婦側 |
   | `sei` `mei` | お名前 |
   | `seik` `meik` | ふりがな |
   | `tel` `mail` | 連絡先 |
   | `zip1` `zip2` `addr` | ご住所 |
   | `al` `aldetail` | アレルギー |
   | `companions` | お連れ様（自動でまとめて送られます）|
   | `msg` | メッセージ |
   | `question` | ご質問・ご要望 |

4. `app.js` を次のように設定します

```js
var RSVP = {
  endpoint: 'https://docs.google.com/forms/d/e/【フォームID】/formResponse',
  mode: 'no-cors'
};
```

### B. Formspree などのフォームサービスを使う場合

```js
var RSVP = {
  endpoint: 'https://formspree.io/f/【ID】',
  mode: 'cors'
};
```

`name` の書き換えは不要です。送信されると項目名そのままでメールに届きます。

**設定したら、必ずご自身でテスト送信して、内容が届くか確認してください。**

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
