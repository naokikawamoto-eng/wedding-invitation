/**
 * 出欠返信を Google スプレッドシートへ記録する。
 *
 * 使い方（初回のみ）:
 * 1. https://sheets.new で新しいシートを作る
 * 2. 拡張機能 → Apps Script を開く
 * 3. このファイルの内容を貼り付けて保存
 * 4. デプロイ → 新しいデプロイ → 種類: ウェブアプリ
 *    - 説明: Wedding RSVP
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 5. デプロイ後の URL を assets/js/app.js の RSVP.endpoint に貼る
 */
var SHEET_NAME = 'RSVP';
var HEADERS = [
  '送信日時',
  'ご出欠',
  'ゲスト様',
  '姓',
  '名',
  'せい',
  'めい',
  '電話番号',
  '郵便番号',
  'ご住所',
  'メール',
  'アレルギー',
  'アレルギー詳細',
  'お連れ様',
  'メッセージ',
  'ご質問・ご要望'
];

function doPost(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var sheet = getSheet_();
  sheet.appendRow([
    new Date(),
    p.attend || '',
    p.side || '',
    p.sei || '',
    p.mei || '',
    p.seik || '',
    p.meik || '',
    p.tel || '',
    [p.zip1, p.zip2].filter(Boolean).join('-'),
    p.addr || '',
    p.mail || '',
    p.al || '',
    p.aldetail || '',
    p.companions || '',
    p.msg || '',
    p.question || ''
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('ok');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
