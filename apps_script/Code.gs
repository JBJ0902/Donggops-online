/**
 * 동꼽즈 Google Sheets + Apps Script API
 * 배포: Apps Script > 배포 > 새 배포 > 웹 앱
 * 실행 권한: 본인
 * 액세스 권한: 모든 사용자
 */
const GOOGLE_CLIENT_ID = '1005600552830-ffbq5n0nsucf35lrllqkvpel13fth8nd.apps.googleusercontent.com';

const SHEETS = {
  USERS: 'users',
  SETTINGS: 'user_settings',
  SCORES: 'competition_scores'
};

const HEADERS = {
  users: ['user_id', 'google_email', 'google_name', 'nickname', 'picture', 'created_at', 'last_login_at'],
  user_settings: ['user_id', 'key_hit', 'key_star', 'key_auto', 'bgm_volume', 'sfx_volume', 'bgm_muted', 'sfx_muted', 'updated_at'],
  competition_scores: ['score_id', 'user_id', 'nickname', 'character', 'reached_stage', 'total_score', 'best_cpm', 'best_combo', 'play_time', 'created_at']
};

function setupDonggopsSheets() {
  Object.keys(HEADERS).forEach(name => getSheet_(name));
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'health';
  if (action === 'leaderboard') return json_({ ok: true, leaderboard: getLeaderboard_(100) });
  return json_({ ok: true, service: 'donggops-sheets-api', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '');

    if (action === 'getLeaderboard') {
      return json_({ ok: true, leaderboard: getLeaderboard_(Number(body.limit || 100)) });
    }

    const verified = verifyIdToken_(body.idToken);
    const userId = 'google:' + verified.sub;

    if (action === 'login') {
      const nickname = sanitizeNickname_(body.nickname || verified.name || verified.email.split('@')[0] || '동꼽러');
      const user = upsertUser_(userId, verified.email, verified.name, nickname, verified.picture || '');
      return json_({ ok: true, user, leaderboard: getLeaderboard_(100) });
    }

    if (action === 'getSettings') {
      return json_({ ok: true, settings: getSettings_(userId) });
    }

    if (action === 'saveSettings') {
      const settings = saveSettings_(userId, body.settings || {});
      return json_({ ok: true, settings });
    }

    if (action === 'saveScore') {
      const saved = saveScore_(userId, body.score || {});
      return json_({ ok: true, saved, leaderboard: getLeaderboard_(100) });
    }

    if (action === 'getRecords') {
      return json_({ ok: true, records: getRecords_(userId, Number(body.limit || 100)) });
    }

    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const header = HEADERS[name];
  if (header && sh.getLastRow() === 0) sh.appendRow(header);
  return sh;
}

function verifyIdToken_(idToken) {
  if (!idToken) throw new Error('missing_id_token');
  const cache = CacheService.getScriptCache();
  const cacheKey = 'token:' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('invalid_id_token');
  const payload = JSON.parse(res.getContentText());
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error('aud_mismatch');
  if (String(payload.email_verified) !== 'true') throw new Error('email_not_verified');
  cache.put(cacheKey, JSON.stringify(payload), 300);
  return payload;
}

function sanitizeNickname_(s) {
  const txt = String(s || '동꼽러').replace(/[\r\n\t]/g, ' ').trim();
  return txt.slice(0, 18) || '동꼽러';
}

function findRowByFirstCol_(sh, value) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const values = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function upsertUser_(userId, email, name, nickname, picture) {
  const sh = getSheet_(SHEETS.USERS);
  const now = new Date().toISOString();
  const row = findRowByFirstCol_(sh, userId);
  if (row > 0) {
    const old = sh.getRange(row, 1, 1, HEADERS.users.length).getValues()[0];
    const finalNickname = nickname || old[3] || '동꼽러';
    sh.getRange(row, 1, 1, HEADERS.users.length).setValues([[userId, email, name, finalNickname, picture, old[5] || now, now]]);
    return { user_id: userId, email, name, nickname: finalNickname, picture };
  }
  sh.appendRow([userId, email, name, nickname, picture, now, now]);
  return { user_id: userId, email, name, nickname, picture };
}

function getSettings_(userId) {
  const sh = getSheet_(SHEETS.SETTINGS);
  const row = findRowByFirstCol_(sh, userId);
  if (row < 0) return null;
  const v = sh.getRange(row, 1, 1, HEADERS.user_settings.length).getValues()[0];
  return {
    keyConfig: { hit: v[1] || ' ', star: v[2] || 'b', auto: v[3] || '5' },
    bgmVolume: Number(v[4] || 0.4),
    sfxVolume: Number(v[5] || 0.3),
    bgmMuted: String(v[6]) === 'true',
    sfxMuted: String(v[7]) === 'true'
  };
}

function saveSettings_(userId, settings) {
  const sh = getSheet_(SHEETS.SETTINGS);
  const keyConfig = settings.keyConfig || {};
  const rowData = [
    userId,
    String(keyConfig.hit || ' '),
    String(keyConfig.star || 'b'),
    String(keyConfig.auto || '5'),
    clamp_(Number(settings.bgmVolume), 0, 1, 0.4),
    clamp_(Number(settings.sfxVolume), 0, 1, 0.3),
    !!settings.bgmMuted,
    !!settings.sfxMuted,
    new Date().toISOString()
  ];
  const row = findRowByFirstCol_(sh, userId);
  if (row > 0) sh.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  else sh.appendRow(rowData);
  return getSettings_(userId);
}

function saveScore_(userId, score) {
  const sh = getSheet_(SHEETS.SCORES);
  const totalScore = clamp_(Number(score.totalScore), 0, 500000, 0);
  const reachedStage = Math.floor(clamp_(Number(score.reachedStage), 1, 10, 1));
  const bestCpm = Math.floor(clamp_(Number(score.bestCpm), 0, 6000, 0));
  const bestCombo = Math.floor(clamp_(Number(score.bestCombo), 0, 999999, 0));
  const nickname = sanitizeNickname_(score.nickname || '동꼽러');
  const character = String(score.character || '').slice(0, 12);
  const now = new Date().toISOString();
  const scoreId = Utilities.getUuid();
  sh.appendRow([scoreId, userId, nickname, character, reachedStage, totalScore, bestCpm, bestCombo, Number(score.playTime || 0), now]);
  return { score_id: scoreId, user_id: userId, nickname, character, reachedStage, totalScore, bestCpm, bestCombo, created_at: now };
}

function getLeaderboard_(limit) {
  limit = Math.max(1, Math.min(100, Number(limit || 100)));
  const sh = getSheet_(SHEETS.SCORES);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, HEADERS.competition_scores.length).getValues();
  return values.map(r => ({
    scoreId: r[0], userId: r[1], nickname: r[2], character: r[3],
    reachedStage: Number(r[4] || 0), totalScore: Number(r[5] || 0),
    bestCpm: Number(r[6] || 0), bestCombo: Number(r[7] || 0),
    playTime: Number(r[8] || 0), at: r[9]
  })).sort((a, b) =>
    (b.totalScore - a.totalScore) ||
    (b.reachedStage - a.reachedStage) ||
    (b.bestCpm - a.bestCpm) ||
    (b.bestCombo - a.bestCombo)
  ).slice(0, limit);
}

function getRecords_(userId, limit) {
  return getLeaderboard_(1000).filter(r => r.userId === userId).slice(0, Math.max(1, Math.min(100, limit || 100)));
}

function clamp_(n, min, max, fallback) {
  if (!isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
