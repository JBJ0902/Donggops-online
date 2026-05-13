/**
 * 동꼽즈 Google Sheets + Apps Script API
 * 배포: Apps Script > 배포 > 새 배포 > 웹 앱
 * 실행 권한: 본인
 * 액세스 권한: 모든 사용자
 */
const GOOGLE_CLIENT_ID = '1005600552830-ffbq5n0nsucf35lrllqkvpel13fth8nd.apps.googleusercontent.com';
const NICKNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;

const SHEETS = {
  USERS: 'users',
  SETTINGS: 'user_settings',
  SCORES: 'competition_scores',
  ONLINE: 'online_sessions'
};

const HEADERS = {
  // 개인정보 최소화를 위해 이메일/실명/프로필 사진은 저장하지 않습니다.
  // 기존 Google Sheets 배포본과의 호환성을 위해 7개 열 구조는 유지하되, 미사용 열은 항상 빈 값으로 기록합니다.
  users: ['user_id', 'google_email_unused', 'google_name_unused', 'nickname', 'picture_unused', 'created_at', 'last_login_at', 'nickname_changed_at'],
  user_settings: ['user_id', 'key_hit', 'key_star', 'key_auto', 'bgm_volume', 'sfx_volume', 'bgm_muted', 'sfx_muted', 'updated_at'],
  competition_scores: ['score_id', 'user_id', 'nickname', 'character', 'reached_stage', 'total_score', 'best_cpm', 'best_combo', 'play_time', 'created_at'],
  online_sessions: ['user_id', 'nickname', 'last_seen_at', 'status']
};

function setupDonggopsSheets() {
  Object.keys(HEADERS).forEach(name => getSheet_(name));
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'health';
  if (action === 'leaderboard') return json_({ ok: true, leaderboard: getLeaderboard_(100) });
  if (action === 'onlineCount') return json_({ ok: true, onlineCount: getOnlineCount_() });
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
      const nickname = sanitizeNickname_(body.nickname || '동꼽러');
      const user = upsertUser_(userId, nickname);
      const onlineCount = touchOnline_(userId, user.nickname);
      return json_({ ok: true, user, onlineCount, leaderboard: getLeaderboard_(100) });
    }

    if (action === 'changeNickname') {
      const nickname = sanitizeNickname_(body.nickname || '동꼽러');
      const result = changeNickname_(userId, nickname);
      if (result.locked) {
        touchOnline_(userId, result.user.nickname);
        return json_({ ok: false, error: 'nickname_change_locked', remainingMs: result.remainingMs, nextChangeAt: result.nextChangeAt, user: result.user, onlineCount: getOnlineCount_() });
      }
      const onlineCount = touchOnline_(userId, result.user.nickname);
      return json_({ ok: true, user: result.user, onlineCount, leaderboard: getLeaderboard_(100) });
    }

    if (action === 'onlinePing') {
      const nickname = sanitizeNickname_(body.nickname || '동꼽러');
      const onlineCount = touchOnline_(userId, nickname);
      return json_({ ok: true, onlineCount });
    }

    if (action === 'onlineLeave') {
      markOffline_(userId);
      return json_({ ok: true, onlineCount: getOnlineCount_() });
    }

    if (action === 'getOnlineCount') {
      return json_({ ok: true, onlineCount: getOnlineCount_() });
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
  if (header) {
    if (sh.getLastRow() === 0) {
      sh.appendRow(header);
    } else {
      const current = sh.getRange(1, 1, 1, header.length).getValues()[0];
      let changed = false;
      for (let i = 0; i < header.length; i++) {
        if (current[i] !== header[i]) changed = true;
      }
      if (changed) sh.getRange(1, 1, 1, header.length).setValues([header]);
    }
  }
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

function upsertUser_(userId, nickname) {
  const sh = getSheet_(SHEETS.USERS);
  const now = new Date().toISOString();
  const row = findRowByFirstCol_(sh, userId);
  if (row > 0) {
    const old = sh.getRange(row, 1, 1, HEADERS.users.length).getValues()[0];
    // 기존 사용자는 로그인 때 클라이언트 닉네임으로 덮어쓰지 않습니다. 닉네임 변경은 changeNickname 액션에서만 처리합니다.
    const finalNickname = old[3] || nickname || '동꼽러';
    const nicknameChangedAt = old[7] || '';
    // email/name/picture 열은 기존 시트 호환용 빈 칸입니다. 로그인할 때마다 해당 칸을 비워 개인정보 저장을 최소화합니다.
    sh.getRange(row, 1, 1, HEADERS.users.length).setValues([[userId, '', '', finalNickname, '', old[5] || now, now, nicknameChangedAt]]);
    return { user_id: userId, nickname: finalNickname, nickname_changed_at: nicknameChangedAt };
  }
  sh.appendRow([userId, '', '', nickname, '', now, now, '']);
  return { user_id: userId, nickname, nickname_changed_at: '' };
}

function changeNickname_(userId, nickname) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sh = getSheet_(SHEETS.USERS);
    const now = new Date();
    const nowIso = now.toISOString();
    let row = findRowByFirstCol_(sh, userId);
    if (row < 0) {
      sh.appendRow([userId, '', '', nickname, '', nowIso, nowIso, nowIso]);
      updateScoresNickname_(userId, nickname);
      return { locked: false, user: { user_id: userId, nickname, nickname_changed_at: nowIso } };
    }

    const old = sh.getRange(row, 1, 1, HEADERS.users.length).getValues()[0];
    const oldNickname = old[3] || '동꼽러';
    const lastChangedAt = old[7] || '';
    if (nickname === oldNickname) {
      return { locked: false, user: { user_id: userId, nickname: oldNickname, nickname_changed_at: lastChangedAt } };
    }

    const lastMs = Date.parse(lastChangedAt);
    if (!isNaN(lastMs)) {
      const remainingMs = NICKNAME_CHANGE_COOLDOWN_MS - (now.getTime() - lastMs);
      if (remainingMs > 0) {
        return {
          locked: true,
          remainingMs: remainingMs,
          nextChangeAt: new Date(lastMs + NICKNAME_CHANGE_COOLDOWN_MS).toISOString(),
          user: { user_id: userId, nickname: oldNickname, nickname_changed_at: lastChangedAt }
        };
      }
    }

    sh.getRange(row, 1, 1, HEADERS.users.length).setValues([[userId, '', '', nickname, '', old[5] || nowIso, nowIso, nowIso]]);
    updateScoresNickname_(userId, nickname);
    return { locked: false, user: { user_id: userId, nickname, nickname_changed_at: nowIso } };
  } finally {
    lock.releaseLock();
  }
}

function updateScoresNickname_(userId, nickname) {
  const sh = getSheet_(SHEETS.SCORES);
  const last = sh.getLastRow();
  if (last < 2) return;
  const userIds = sh.getRange(2, 2, last - 1, 1).getValues();
  const nickRange = sh.getRange(2, 3, last - 1, 1);
  const nicks = nickRange.getValues();
  let changed = false;
  for (let i = 0; i < userIds.length; i++) {
    if (String(userIds[i][0]) === String(userId) && String(nicks[i][0]) !== String(nickname)) {
      nicks[i][0] = nickname;
      changed = true;
    }
  }
  if (changed) nickRange.setValues(nicks);
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


function touchOnline_(userId, nickname) {
  const sh = getSheet_(SHEETS.ONLINE);
  const now = new Date().toISOString();
  const safeNick = sanitizeNickname_(nickname || '동꼽러');
  const row = findRowByFirstCol_(sh, userId);
  if (row > 0) {
    sh.getRange(row, 1, 1, HEADERS.online_sessions.length).setValues([[userId, safeNick, now, 'online']]);
  } else {
    sh.appendRow([userId, safeNick, now, 'online']);
  }
  return getOnlineCount_();
}

function markOffline_(userId) {
  const sh = getSheet_(SHEETS.ONLINE);
  const row = findRowByFirstCol_(sh, userId);
  if (row > 0) {
    const old = sh.getRange(row, 1, 1, HEADERS.online_sessions.length).getValues()[0];
    sh.getRange(row, 1, 1, HEADERS.online_sessions.length).setValues([[userId, old[1] || '동꼽러', new Date().toISOString(), 'offline']]);
  }
}

function getOnlineCount_() {
  const sh = getSheet_(SHEETS.ONLINE);
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const now = Date.now();
  const values = sh.getRange(2, 1, last - 1, HEADERS.online_sessions.length).getValues();
  let count = 0;
  values.forEach(r => {
    const lastSeen = Date.parse(r[2]);
    const status = String(r[3] || 'online');
    if (status === 'online' && !isNaN(lastSeen) && now - lastSeen <= ONLINE_TIMEOUT_MS) count++;
  });
  return count;
}

function clamp_(n, min, max, fallback) {
  if (!isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
