/**
 * 出欠返信を Google スプレッドシートへ記録する。
 * 列の見出し・見た目を直すときは setupRsvpSheet を1回実行する。
 */
var SHEET_NAME = 'RSVP';
var PHOTO_FOLDER_NAME = 'Wedding RSVP Photos 河本・磯野';
var PHOTO_FOLDER_PROP = 'RSVP_PHOTO_FOLDER_ID';
/* 見出しはフォームの表示順・項目名と同じ。先頭の送信日時だけ集計用 */
var HEADERS = [
  '送信日時',
  'ゲスト様',
  'お名前・姓',
  'お名前・名',
  'ふりがな・せい',
  'ふりがな・めい',
  '電話番号',
  '郵便番号',
  'ご住所',
  'メールアドレス',
  'アレルギー',
  'アレルギー詳細',
  'お連れ様追加',
  '新郎 直樹のイメージを一言で表すと？',
  '新婦 有梨花のイメージを一言で表すと？',
  '画像添付Gallery',
  'メッセージ',
  'ご質問・ご要望',
  'ご出欠'
];
var COL_WIDTHS = [150, 110, 90, 90, 100, 100, 130, 100, 240, 200, 110, 180, 220, 240, 240, 280, 240, 260, 80];

var SCRIPT_VERSION = 'rsvp-v7-after-party-tab';
var AFTER_SHEET_NAME = '二次会';
var AFTER_SPREADSHEET_ID = '1gO8PKCDtyHq-ickXRDGzostaTPL40WSWdqdagZzYuQQ';
var AFTER_SHEET_GID = 2013014585;
var AFTER_HEADERS = [
  '送信日時',
  'お名前',
  'メールアドレス',
  'ご出欠'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var parsed = parsePayload_(e);
    var p = parsed.p;
    if (String(p.event || '') === 'after-party') {
      appendAfterPartyRow_(p);
      var mailed = false;
      try {
        mailed = sendAfterPartyMail_(p);
      } catch (mailErr) {
        mailed = false;
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, v: SCRIPT_VERSION, event: 'after-party', mailed: mailed }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var photoUrls = '';
    try {
      photoUrls = savePhotos_(parsed.photos, p);
    } catch (err) {
      photoUrls = 'アップロード失敗: ' + (err && err.message ? err.message : err);
    }
    var sheet = getSheet_();
    var values = [
      new Date(),
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
      firstNonEmpty_(p, ['image_groom', 'imageGroom', 'groomimp', 'image', 'relation']),
      firstNonEmpty_(p, ['image_bride', 'imageBride', 'brideimp']),
      photoUrls,
      p.msg || '',
      p.question || '',
      p.attend || ''
    ];
    appendDataRow_(sheet, values);
  } finally {
    lock.releaseLock();
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, v: SCRIPT_VERSION }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(SCRIPT_VERSION);
}

function setupRsvpSheet() {
  clearRsvpTriggers();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  migrateOldLayout_(sheet);
  ensureHeader_(sheet);
  formatSheet_(sheet);
  getAfterPartySheet_();
  setupSummary_(ss);
  hideDefaultSheet_();
  getPhotoFolder_();
}

/** 送信のたびに見出しを戻す古いトリガーを消す */
function clearRsvpTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

function getAfterPartySpreadsheet_() {
  return SpreadsheetApp.openById(AFTER_SPREADSHEET_ID);
}

function getAfterPartySheet_() {
  var ss = getAfterPartySpreadsheet_();
  var sheet = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === AFTER_SHEET_GID) {
      sheet = sheets[i];
      break;
    }
  }
  if (!sheet) {
    sheet = ss.getSheetByName(AFTER_SHEET_NAME);
  }
  if (!sheet) {
    sheet = ss.insertSheet(AFTER_SHEET_NAME);
  }
  ensureAfterPartyColumns_(sheet);
  return sheet;
}

function headerLabels_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var labels = [];
  for (var i = 0; i < header.length; i++) labels.push(String(header[i] || ''));
  return labels;
}

function findHeader_(header, label) {
  for (var i = 0; i < header.length; i++) {
    if (header[i] === label) return i;
  }
  return -1;
}

/** 指定タブの既存の見出しは残す。メール列が無ければご出欠の左に足す。 */
function ensureAfterPartyColumns_(sheet) {
  var header = headerLabels_(sheet);
  var hasAny = false;
  for (var i = 0; i < header.length; i++) {
    if (header[i] !== '') hasAny = true;
  }
  if (!hasAny) {
    sheet.getRange(1, 1, 1, AFTER_HEADERS.length).setValues([AFTER_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, AFTER_HEADERS.length)
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#a98a57')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 36);
    var widths = [160, 180, 240, 100];
    for (var w = 0; w < widths.length; w++) sheet.setColumnWidth(w + 1, widths[w]);
    header = AFTER_HEADERS.slice();
  }
  if (findHeader_(header, 'メールアドレス') === -1) {
    var attendIdx = findHeader_(header, 'ご出欠');
    var insertAt = attendIdx === -1 ? header.length + 1 : attendIdx + 1;
    sheet.insertColumnBefore(insertAt);
    var cell = sheet.getRange(1, insertAt);
    cell.setValue('メールアドレス');
    if (insertAt > 1) {
      sheet.getRange(1, insertAt - 1).copyTo(cell, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    sheet.setColumnWidth(insertAt, 240);
  }
  paintAttendRules_(sheet);
}

function paintAttendRules_(sheet) {
  var header = headerLabels_(sheet);
  var idx = findHeader_(header, 'ご出欠');
  if (idx === -1) return;
  var col = idx + 1;
  var rules = sheet.getConditionalFormatRules();
  for (var i = 0; i < rules.length; i++) {
    var ranges = rules[i].getRanges();
    for (var r = 0; r < ranges.length; r++) {
      if (ranges[r].getColumn() === col) return;
    }
  }
  var attend = sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1);
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('参加')
      .setBackground('#e7f4ea')
      .setFontColor('#137333')
      .setRanges([attend])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('不参加')
      .setBackground('#f1f3f4')
      .setFontColor('#5f6368')
      .setRanges([attend])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('保留')
      .setBackground('#fef7e0')
      .setFontColor('#b06000')
      .setRanges([attend])
      .build()
  );
  sheet.setConditionalFormatRules(rules);
}

function appendAfterPartyRow_(p) {
  var sheet = getAfterPartySheet_();
  var width = Math.max(sheet.getLastColumn(), AFTER_HEADERS.length);
  var header = sheet.getRange(1, 1, 1, width).getValues()[0];
  var row = [];
  for (var c = 0; c < width; c++) row.push('');
  function put(label, value) {
    for (var i = 0; i < header.length; i++) {
      if (String(header[i] || '') === label) {
        row[i] = value;
        return;
      }
    }
  }
  put('送信日時', new Date());
  var guestName = p.name || [p.sei, p.mei].filter(Boolean).join(' ');
  if (findHeader_(header, 'お名前') !== -1) {
    put('お名前', guestName);
  } else {
    put('お名前・姓', guestName);
  }
  put('メールアドレス', String(p.mail || '').trim());
  put('ご出欠', p.attend || '');
  var last = sheet.getLastRow();
  var dest = last < 1 ? 2 : last + 1;
  sheet.getRange(dest, 1, 1, row.length).setValues([row]);
  for (var d = 0; d < header.length; d++) {
    if (String(header[d] || '') === '送信日時') {
      sheet.getRange(dest, d + 1).setNumberFormat('yyyy/MM/dd HH:mm');
    }
  }
}

function sendAfterPartyMail_(p) {
  var to = String(p.mail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  var name = String(p.name || '').trim();
  var attend = String(p.attend || '');
  var greeting = name ? name + ' 様\n\n' : '';
  var subject;
  var body;
  if (attend === '参加') {
    subject = '二次会のご参加を承りました';
    body = greeting +
      '二次会のご参加を承りました。\n' +
      '当日お会いできますのを楽しみにしております。\n\n' +
      '2026年11月22日（日）\n' +
      '開宴 17:00（受付 16:30）\n' +
      'ザ・プリンス パークタワー東京 イベントホール メロディーライン\n\n' +
      '河本直樹・磯野有梨花';
  } else if (attend === '保留') {
    subject = '二次会のご返信を承りました';
    body = greeting +
      '二次会のご出欠を「保留」として承りました。\n' +
      'お決まりになりましたら、改めてお知らせください。\n\n' +
      '河本直樹・磯野有梨花';
  } else {
    subject = '二次会のご返信を承りました';
    body = greeting +
      '二次会を欠席される旨、承りました。\n' +
      'またお会いできる日を楽しみにしております。\n\n' +
      '河本直樹・磯野有梨花';
  }
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    name: '河本直樹・磯野有梨花'
  });
  return true;
}

function appendDataRow_(sheet, values) {
  if (sheet.getMaxColumns() < values.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), values.length - sheet.getMaxColumns());
  }
  var last = sheet.getLastRow();
  var dest = last < 1 ? 2 : last + 1;
  if (dest === 2 && String(sheet.getRange(1, 1).getValue() || '') === '') {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  try {
    sheet.getRange(dest, 1, 1, values.length).breakApart();
  } catch (err) {}
  sheet.getRange(dest, 1, 1, values.length).setValues([values]);
}

/* 旧見出し（ご出欠が2列目、イメージが1列）の行を今の並びに直す */
function migrateOldLayout_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var second = String(header[1] || '');
  var imageCol = String(header[16] || '');
  var isOld = second === 'ご出欠' || imageCol.indexOf('イメージ（一言') === 0;
  if (!isOld) return;
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }
  if (lastRow < 2) return;
  var width = Math.max(lastCol, HEADERS.length);
  var data = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  var out = [];
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var b = String(row[1] || '');
    if (b === '出席' || b === '欠席' || b === '保留') {
      out.push([
        row[0],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        row[8],
        row[9],
        row[10],
        row[11],
        row[12],
        row[13],
        row[16],
        '',
        row[17],
        row[14],
        row[15],
        row[1]
      ]);
    } else {
      out.push(row.slice(0, HEADERS.length));
    }
  }
  sheet.getRange(2, 1, out.length, HEADERS.length).setValues(out);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function unmergeSheet_(sheet) {
  var filter = sheet.getFilter();
  if (filter) {
    filter.remove();
  }
  try {
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();
  } catch (err) {
    /* 結合が無ければ何もしない */
  }
}

function ensureHeader_(sheet) {
  unmergeSheet_(sheet);
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }
  var used = sheet.getMaxColumns();
  var first = String(sheet.getRange(1, 1).getValue() || '');
  if (first !== HEADERS[0] && sheet.getLastRow() > 0) {
    sheet.insertRowBefore(1);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (used > HEADERS.length) {
    sheet.getRange(1, HEADERS.length + 1, 1, used - HEADERS.length).clearContent();
  }
}

function parsePayload_(e) {
  var p = {};
  var photos = [];
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function(k) {
      p[k] = e.parameter[k];
    });
  }
  if (e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      if (json && typeof json === 'object' && !isArray_(json)) {
        Object.keys(json).forEach(function(k) {
          if (k === 'photos') {
            photos = isArray_(json.photos) ? json.photos : [];
          } else if (json[k] != null && typeof json[k] !== 'object') {
            p[k] = json[k];
          }
        });
      }
    } catch (err) {
      /* application/x-www-form-urlencoded の旧送信は e.parameter を使う */
    }
  }
  ['photo1', 'photo2', 'photo3'].forEach(function(key) {
    if (!p[key]) return;
    photos.push({
      name: key + '.jpg',
      mime: 'image/jpeg',
      dataBase64: p[key]
    });
    delete p[key];
  });
  return { p: p, photos: photos.slice(0, 3) };
}

function savePhotos_(photos, p) {
  if (!photos || !photos.length) return '';
  var folder = getPhotoFolder_();
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
  var who = [p.sei, p.mei].filter(Boolean).join('_') || 'guest';
  var urls = [];
  for (var i = 0; i < photos.length && i < 3; i++) {
    var photo = photos[i];
    if (!photo) continue;
    var raw = String(photo.dataBase64 || photo.data || '');
    if (!raw) continue;
    var comma = raw.indexOf(',');
    if (raw.indexOf('base64') !== -1 && comma >= 0) {
      raw = raw.slice(comma + 1);
    }
    raw = raw.replace(/\s/g, '');
    var bytes = Utilities.base64Decode(raw);
    var mime = photo.mime || photo.type || 'image/jpeg';
    var ext = mime.indexOf('webp') !== -1 ? 'webp' : (mime.indexOf('png') !== -1 ? 'png' : 'jpg');
    var base = String(photo.name || ('photo' + (i + 1))).replace(/\.[^.]+$/, '');
    base = base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
    var file = folder.createFile(
      Utilities.newBlob(bytes, mime, 'RSVP_' + who + '_' + stamp + '_' + (i + 1) + '_' + base + '.' + ext)
    );
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      /* リンク共有が禁止でもファイル自体は残す */
    }
    urls.push(file.getUrl());
  }
  return urls.join('\n');
}

/** エディタから1回実行して、ドライブ保存の許可を出す */
function authorizeDrive() {
  var folder = getPhotoFolder_();
  Logger.log('写真フォルダ: ' + folder.getName() + ' / ' + folder.getUrl());
}

function getPhotoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PHOTO_FOLDER_PROP);
  if (id) {
    return DriveApp.getFolderById(id);
  }
  var folder = DriveApp.createFolder(PHOTO_FOLDER_NAME);
  props.setProperty(PHOTO_FOLDER_PROP, folder.getId());
  return folder;
}

function firstNonEmpty_(p, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = p[keys[i]];
    if (v != null && String(v).trim() !== '') return v;
  }
  return '';
}

function isArray_(v) {
  return Object.prototype.toString.call(v) === '[object Array]';
}

function formatSheet_(sheet) {
  ensureHeader_(sheet);
  var lastCol = HEADERS.length;
  var lastRow = Math.max(sheet.getLastRow(), 2);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#a98a57')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, 42);

  sheet.getRange(2, 1, lastRow, 1).setNumberFormat('yyyy/MM/dd HH:mm');
  sheet.getRange(1, 1, lastRow, lastCol)
    .setVerticalAlignment('middle');
  sheet.getRange(2, 10, lastRow, lastCol - 9).setWrap(true);

  for (var i = 0; i < COL_WIDTHS.length; i++) {
    sheet.setColumnWidth(i + 1, COL_WIDTHS[i]);
  }

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(1, 1, lastRow, lastCol).createFilter();

  var attend = sheet.getRange(2, HEADERS.length, lastRow, 1);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('出席')
      .setBackground('#e7f4ea')
      .setFontColor('#137333')
      .setRanges([attend])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('欠席')
      .setBackground('#f1f3f4')
      .setFontColor('#5f6368')
      .setRanges([attend])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('保留')
      .setBackground('#fef7e0')
      .setFontColor('#b06000')
      .setRanges([attend])
      .build()
  ]);

  sheet.setHiddenGridlines(false);
}

function afterPartyCountFormula_(label) {
  var afterSs = getAfterPartySpreadsheet_();
  var afterSheet = getAfterPartySheet_();
  var header = headerLabels_(afterSheet);
  var attendIdx = findHeader_(header, 'ご出欠');
  var col = columnLetter_(attendIdx === -1 ? 4 : attendIdx + 1);
  var quoted = "'" + String(afterSheet.getName()).replace(/'/g, "''") + "'";
  var range = quoted + '!' + col + ':' + col;
  if (afterSs.getId() === SpreadsheetApp.getActiveSpreadsheet().getId()) {
    return '=COUNTIF(' + range + ',"' + label + '")';
  }
  return '=COUNTIF(IMPORTRANGE("' + AFTER_SPREADSHEET_ID + '","' + range + '"),"' + label + '")';
}

function setupSummary_(ss) {
  var name = '集計';
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(name, 0);
  sheet.getRange('A1:C1').setValues([['項目', '人数', '']]);
  sheet.getRange('A2:B9').setValues([
    ['ご出席', '=COUNTIF(RSVP!S:S,"出席")'],
    ['ご欠席', '=COUNTIF(RSVP!S:S,"欠席")'],
    ['保留', '=COUNTIF(RSVP!S:S,"保留")'],
    ['返信合計', '=COUNTA(RSVP!S2:S)'],
    ['アレルギーあり', '=COUNTIF(RSVP!K:K,"あり")'],
    ['二次会・参加', afterPartyCountFormula_('参加')],
    ['二次会・不参加', afterPartyCountFormula_('不参加')],
    ['二次会・保留', afterPartyCountFormula_('保留')]
  ]);
  sheet.getRange('A1:B1')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#a98a57')
    .setHorizontalAlignment('center');
  sheet.getRange('A2:A9').setFontWeight('bold');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 90);
  sheet.setFrozenRows(1);
}

function columnLetter_(index) {
  var letter = '';
  var n = index;
  while (n > 0) {
    var mod = (n - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function hideDefaultSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('シート1');
  if (sheet && ss.getSheets().length > 1) {
    sheet.hideSheet();
  }
}
