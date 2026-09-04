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

function doPost(e) {
  var parsed = parsePayload_(e);
  var p = parsed.p;
  var photoUrls = '';
  try {
    photoUrls = savePhotos_(parsed.photos, p);
  } catch (err) {
    photoUrls = 'アップロード失敗: ' + (err && err.message ? err.message : err);
  }
  var sheet = getSheet_();
  sheet.appendRow([
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
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('ok');
}

function setupRsvpSheet() {
  var sheet = getSheet_();
  formatSheet_(sheet);
  setupSummary_(SpreadsheetApp.getActiveSpreadsheet());
  hideDefaultSheet_();
  getPhotoFolder_();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureHeader_(sheet);
  return sheet;
}

function ensureHeader_(sheet) {
  var first = String(sheet.getRange(1, 1).getValue() || '');
  if (first !== HEADERS[0]) {
    if (sheet.getLastRow() > 0) {
      sheet.insertRowBefore(1);
    }
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    if (sheet.getMaxColumns() < HEADERS.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
    }
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
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

function setupSummary_(ss) {
  var name = '集計';
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(name, 0);
  sheet.getRange('A1:C1').setValues([['項目', '人数', '']]);
  sheet.getRange('A2:B6').setValues([
    ['ご出席', '=COUNTIF(RSVP!S:S,"出席")'],
    ['ご欠席', '=COUNTIF(RSVP!S:S,"欠席")'],
    ['保留', '=COUNTIF(RSVP!S:S,"保留")'],
    ['返信合計', '=COUNTA(RSVP!S2:S)'],
    ['アレルギーあり', '=COUNTIF(RSVP!K:K,"あり")']
  ]);
  sheet.getRange('A1:B1')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#a98a57')
    .setHorizontalAlignment('center');
  sheet.getRange('A2:A6').setFontWeight('bold');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 90);
  sheet.setFrozenRows(1);
}

function hideDefaultSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('シート1');
  if (sheet && ss.getSheets().length > 1) {
    sheet.hideSheet();
  }
}
