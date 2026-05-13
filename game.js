(() => {
  "use strict";

  // 전체 게임 화면에서 마우스 우클릭 기본 메뉴를 차단합니다.
  // 캔버스뿐 아니라 온라인 접속 패널 / 로그인 패널까지 모두 적용됩니다.
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  document.addEventListener("auxclick", (e) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  const W = 1280, H = 720;
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const signalPanel = document.getElementById("signalPanel");
  const signalSteps = document.getElementById("signalSteps");

  const STAGES = [
    { no: 1, name: "1스테이지", duration: 120, rank: "쉬움", ai: 430 },
    { no: 2, name: "2스테이지", duration: 150, rank: "하", ai: 590 },
    { no: 3, name: "3스테이지", duration: 180, rank: "보통", ai: 760 },
    { no: 4, name: "4스테이지", duration: 210, rank: "어려움", ai: 970 },
    { no: 5, name: "5스테이지", duration: 300, rank: "매우 어려움", ai: 1210 },
    // 사용자 경쟁전 전용 6~10 스테이지. BGM 파일은 추후 stage6~stage10으로 추가 가능하며,
    // 현재는 stage5 BGM을 안전하게 재사용합니다.
    { no: 6, name: "6스테이지", duration: 240, rank: "초고수", ai: 1420 },
    { no: 7, name: "7스테이지", duration: 270, rank: "프로", ai: 1640 },
    { no: 8, name: "8스테이지", duration: 300, rank: "마스터", ai: 1880 },
    { no: 9, name: "9스테이지", duration: 300, rank: "레전드", ai: 2140 },
    { no: 10, name: "10스테이지", duration: 300, rank: "동꼽신", ai: 2420 },
  ];

  const STAR_THRESHOLD = 660;
  const STAR_SUSTAIN = 5.0;
  const F_UNLOCK = 10.0;
  const F_COOLDOWN = 5.0;
  // D키 기능은 이번 버전에서 제거됨
  const DONGGOP_THRESHOLD = 1000;
  const DONGGOP_SUSTAIN = 3.0;
  const DONGGOP_DURATION = 13.0;
  const DONGGOP_CPM = 300;
  const DONGGOP_RELEASE_STAGE = 7;
  const DONGGOP_RELEASE_DURATION = 10.0;
  const DONGGOP_RELEASE_HOLD_CPM = 720;
  const DONGGOP_RELEASE_CPM_BY_STAGE = { 7: 450, 8: 500, 9: 550, 10: 600 };
  const STAR_CPM_BY_STAGE = { 7: 800, 8: 1000, 9: 1300, 10: 1600 };
  const FEVER_STEP = 50;
  const FEVER_DURATION = 8.0;
  const FEVER_CPM = 180;

  const assets = {};
  const assetList = {
    title: "assets/images/title_screen.webp",
    intro1: "assets/images/dongggop_intro_1.webp",
    intro2: "assets/images/dongggop_intro_2.webp",
    intro3: "assets/images/dongggop_intro_3.webp",
    intro4: "assets/images/dongggop_intro_4.webp",
    intro5: "assets/images/dongggop_intro_5.webp",
    intro6: "assets/images/dongggop_intro_6.webp",
    volumeIcon: "assets/images/volume_icon.png",
    fullscreenIcon: "assets/images/fullscreen_icon.png",
    select: "assets/images/character_select_screen.webp",
    bg: "assets/images/bg.webp",
    coin: "assets/images/coin.webp",
    shuni1: "assets/images/shuni_frame1.webp",
    shuni2: "assets/images/shuni_frame2.webp",
    shuni3: "assets/images/shuni_frame3.webp",
    dashiba1: "assets/images/dashiba_frame1.webp",
    dashiba2: "assets/images/dashiba_frame2.webp",
    dashiba3: "assets/images/dashiba_frame3.webp",
    shuniStar: "assets/images/shuni_star_scene.webp",
    dashibaStar: "assets/images/dashiba_star_scene.webp",
    shuniAuto1: "assets/images/shuni_coinauto1.webp",
    shuniAuto2: "assets/images/shuni_coinauto2.webp",
    shuniAuto3: "assets/images/shuni_coinauto3.webp",
    dashibaAuto1: "assets/images/dashiba_coinauto1.webp",
    dashibaAuto2: "assets/images/dashiba_coinauto2.webp",
    dashibaAuto3: "assets/images/dashiba_coinauto3.webp",
    endingShuni: "assets/images/ending_shuni.webp",
    endingDashiba: "assets/images/ending_dashibaro.webp",
    shuniWin: "assets/images/shuni_win.webp",
    shuniLose: "assets/images/shuni_lose.webp",
    dashibaWin: "assets/images/dashiba_win.webp",
    dashibaLose: "assets/images/dashiba_lose.webp",
    shuniSelect: "assets/images/shuni_select.webp",
    dashibaSelect: "assets/images/dashiba_select.webp",
    starIcon: "assets/images/star_balloon.webp",
    donggopIcon: "assets/images/excuse_icon.webp",
    enterKey: "assets/images/enter_key.webp",
    spaceKey: "assets/images/space_key.webp",
    modeSingle: "assets/images/mode_single_ai.webp",
    modeOnline: "assets/images/mode_online_vs.webp",
    modeCompetition: "assets/images/mode_user_competition.webp",
    modeRank: "assets/images/mode_online_rank.webp",
  };

  const audio = {};
  const audioFiles = {
    introBgm: "assets/audio/donggopp_killkill_1.mp3",
    titleBgm: "assets/audio/bgm.mp3",
    selectBgm: "assets/audio/select_bgm.mp3",
    stage1: "assets/audio/stage1_bgm.mp3",
    stage2: "assets/audio/stage2_bgm.mp3",
    stage3: "assets/audio/stage3_bgm.mp3",
    stage4: "assets/audio/stage4_bgm.mp3",
    stage5: "assets/audio/stage5_bgm.mp3",
    endingBgm: "assets/audio/ending_bgm.mp3",
    coin: "assets/audio/coin.mp3",
    item: "assets/audio/item_use.mp3",
    ready: "assets/audio/item_ready.mp3",
    score: "assets/audio/score.mp3",
    select: "assets/audio/select_confirm.mp3",
    move: "assets/audio/select_move.mp3",
    win: "assets/audio/win.mp3",
    resultWin: "assets/audio/game_win.mp3",
    resultLose: "assets/audio/game_lose.mp3",
    starActivate: "assets/audio/byulpoong.mp3",
    coinOut: "assets/audio/coin_came_out_of_keyboard.mp3"
  };

  let audioUnlocked = false;
  let currentBgm = null;
  let bgmVolume = 0.40;
  let sfxVolume = 0.30;
  let bgmMuted = false;
  let sfxMuted = false;
  let keyConfig = { hit: " ", star: "b", auto: "5" };
  let waitingKeyAction = null;

  // Google ID 로그인 + Google Sheets(Apps Script) 연동 설정
  // 1) GOOGLE_CLIENT_ID는 Google Cloud OAuth 클라이언트 ID입니다.
  // 2) APPS_SCRIPT_WEBAPP_URL은 Apps Script를 웹앱으로 배포한 뒤 받은 /exec URL로 교체하세요.
  //    URL을 교체하기 전에는 로그인은 로컬 프로필로만 동작하고, 랭킹은 기존 localStorage를 사용합니다.
  const GOOGLE_CLIENT_ID = "1005600552830-ffbq5n0nsucf35lrllqkvpel13fth8nd.apps.googleusercontent.com";
  const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwbChog1d2o0y5DOaJEEK-feaUbv0VfBchLfJJoZ2x6Tw_BqOZIzIhAo9Kk7000Qbwz/exec";
  let currentGoogleIdToken = "";
  let googleProfile = null;
  let googleLoginPanelEl = null;
  let googleIdInitialized = false;
  let remoteSettingsTimer = 0;
  let remoteNoticeCooldown = 0;
  const ONLINE_HEARTBEAT_MS = 45 * 1000;
  let onlineUserCount = null;
  let onlineUserCountUpdatedAt = 0;
  let onlineUserCountInFlight = false;
  let onlineHeartbeatTimer = 0;

  // GitHub Pages 전용 로컬 계정/기록 저장소
  // 서버 DB 없이 브라우저 localStorage에 저장합니다. 같은 브라우저/기기 안에서 사용자별 설정과 기록을 분리합니다.
  const ACCOUNT_STORE_KEY = "donggop_accounts_v1";
  const SESSION_KEY = "donggop_current_user_v1";
  const LEADERBOARD_KEY = "donggop_competition_leaderboard_v1";
  const PRIVACY_CONSENT_KEY = "donggop_privacy_consent_v1";
  const NICKNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  let accounts = {};
  let currentUserId = "";
  let accountButtons = [];
  let loginNotice = "";
  let loginNoticeTimer = 0;
  let leaderboardScroll = 0;
  let recordsScroll = 0;
  let competitionSaved = false;
  let competitionLastWarnAt = 0;
  let remoteLeaderboardInFlight = false;
  let remoteLeaderboardSyncedAt = 0;
  let finalLeaderboardAutoRefreshAt = 0;
  let leaderboardNotice = "";
  let leaderboardNoticeTimer = 0;

  const STAR_SKILL_NAME = "별풍 리액션 러시";
  const AUTO_SKILL_NAME = "동꼽 자동사냥";
  const heldGameplayKeys = new Set();
  let repeatGuardHintAt = 0;

  function makeAudio(key, src, volume, loop=false) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    a.loop = loop;
    // 모바일 크롬/웹뷰에서 인트로 BGM이 첫 터치 후 안정적으로 재생되도록 명시
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    audio[key] = a;
  }

  for (const [k, src] of Object.entries(audioFiles)) {
    const isBgm = k.includes("Bgm") || k.startsWith("stage");
    makeAudio(k, src, isBgm ? bgmVolume : sfxVolume, isBgm);
  }

  const chars = [
    { name: "슈니", accent: "#65b5ff", frames: ["shuni1","shuni2","shuni3"], star: "shuniStar", ending: "endingShuni", win: "shuniWin", lose: "shuniLose", autoFrames: ["shuniAuto1","shuniAuto2"], autoEnd: "shuniAuto3" },
    { name: "다시바", accent: "#ff7ad6", frames: ["dashiba1","dashiba2","dashiba3"], star: "dashibaStar", ending: "endingDashiba", win: "dashibaWin", lose: "dashibaLose", autoFrames: ["dashibaAuto1","dashibaAuto2"], autoEnd: "dashibaAuto3" }
  ];

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]
  };

  let state = "loading";
  let selectedChar = 0;
  let gameMode = "single"; // single | online
  let role = "none";      // host | guest
  let pc = null, dc = null, connected = false;
  let local = null, remote = null;
  let stageIndex = 0;
  let stageStart = 0;
  let stageDuration = STAGES[0].duration;
  let result = null;
  let finalStats = [];
  let particles = [];
  let floating = [];
  let lastFrame = performance.now();
  let lastSendState = 0;
  let aiAcc = 0;
  let aiSurge = 0;
  let aiPhase = Math.random() * 100;
  let endingTimer = 0;
  let menuOpen = false;
  let menuTab = "settings";
  let pauseStarted = 0;
  let menuButtons = [];
  let aiCatchupActive = false;
  let stage5FailCount = 0;
  let mouse = { x: -999, y: -999 };
  let titleClickFlash = 0;
  let titleClickFlashColor = "#ffffff";
  let titleClickFlashX = W/2;
  let titleClickFlashY = H/2;
  let introIndex = 0;
  let introFlash = 0;
  let introVolumeDragging = false;
  let menuVolumeDragging = null; // "bgm" | "sfx" - 설정 볼륨바 마우스 드래그
  let floatingBgmDragging = false; // 타이틀/게임 화면 우측 음악 볼륨 드래그
  let stageCountdownStart = 0;
  let stageCountdownEnd = 0;
  let adminTestMode = false;
  let adminReleaseTestMode = false;
  let adminStageNotice = "";
  let adminStageNoticeTimer = 0;

  const ONLINE_DURATIONS = [60, 120, 180, 240, 300, 360, 420, 480, 540, 600];
  const ONLINE_BGM_OPTIONS = [
    { key: "introBgm", label: "인트로 음악" },
    { key: "endingBgm", label: "엔딩 음악" },
    { key: "titleBgm", label: "시작화면 BGM" },
    { key: "selectBgm", label: "캐릭터 선택 BGM" },
    { key: "stage1", label: "스테이지 1 BGM" },
    { key: "stage2", label: "스테이지 2 BGM" },
    { key: "stage3", label: "스테이지 3 BGM" },
    { key: "stage4", label: "스테이지 4 BGM" },
    { key: "stage5", label: "스테이지 5 BGM" },
  ];
  let onlineDuration = 180;
  let onlineBgmKey = "stage1";
  let onlineLocalReady = false;
  let onlineRemoteReady = false;
  let onlineNotice = "";
  let onlineCountdownEnd = 0;
  let onlineLobbyButtons = [];
  let localPlayerName = "";
  let nameEditActive = false;
  let chatEditActive = false;
  let chatInput = "";
  let chatMessages = [];
  let onlineChatScroll = 0;


  function keyLabel(key) {
    if (key === " ") return "SPACE";
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    if (key === "ArrowUp") return "↑";
    if (key === "ArrowDown") return "↓";
    return String(key || "").toUpperCase();
  }

  function normalizeGameKey(e) {
    if (e.key === " ") return " ";
    if (e.key && e.key.length === 1) return e.key.toLowerCase();
    return e.key;
  }

  function normalizeKeyConfigValue(value, fallback) {
    // Google Sheets/Apps Script를 거치면 숫자 키가 5 같은 number로 돌아오는 경우가 있습니다.
    // 이 상태에서는 keydown의 "5" 문자열과 strict 비교가 실패해서 자동사냥 키가 먹지 않으므로 항상 문자열로 정규화합니다.
    if (value === " ") return " ";
    if (value === undefined || value === null || value === "") return fallback;
    const v = String(value);
    return v.length === 1 ? v.toLowerCase() : v;
  }

  function normalizeKeyConfigObject() {
    keyConfig.hit = normalizeKeyConfigValue(keyConfig.hit, " ");
    keyConfig.star = normalizeKeyConfigValue(keyConfig.star, "b");
    keyConfig.auto = normalizeKeyConfigValue(keyConfig.auto, "5");
  }

  function resetKeyConfigToDefault(showNotice=true) {
    keyConfig = { hit: " ", star: "b", auto: "5" };
    normalizeKeyConfigObject();
    clearGameplayHeldKeys();
    waitingKeyAction = null;
    saveSettings();
    if (showNotice) addText(W/2, 250, "키 설정을 기본값으로 초기화", "#bfffe0", 24, 1.0);
  }

  function keyMatch(e, key) {
    return normalizeGameKey(e) === normalizeKeyConfigValue(key, "");
  }

  function clearGameplayHeldKeys() {
    heldGameplayKeys.clear();
  }

  function blockGameplayHoldRepeat(e, actionName="") {
    const nk = normalizeGameKey(e);
    if (!nk) return false;
    if (e.repeat || heldGameplayKeys.has(nk)) {
      // 7~10스테이지 동꼽 해방 중에는 동꼽 키를 누르고 있는 상태가 의도된 조작입니다.
      // 브라우저 keydown 반복 이벤트는 점수로 직접 반영하지 않고 update 루프의 제한된 자동연타로만 처리합니다.
      if (actionName === "hit" && isDonggopReleaseActive(local)) return true;
      if (state === "playing" && local && nowSec() - repeatGuardHintAt > 1.15) {
        repeatGuardHintAt = nowSec();
        const x = local.side === "left" ? 330 : 950;
        const msg = actionName === "auto"
          ? "자동사냥은 1번 입력으로만 사용!"
          : "꾹누르기 무효! 순수 연타만 인정";
        addText(x, 382, msg, "#fff0a8", 22, .75);
      }
      return true;
    }
    heldGameplayKeys.add(nk);
    return false;
  }

  function bgmEffectiveVolume() {
    return bgmMuted ? 0 : bgmVolume;
  }

  function loadSettings() {
    keyConfig = { hit: " ", star: "b", auto: "5" };
    try {
      const saved = JSON.parse(localStorage.getItem(settingsStorageKey()) || localStorage.getItem("donggop_settings") || "{}");
      if (typeof saved.bgmVolume === "number") bgmVolume = Math.max(0, Math.min(1, saved.bgmVolume));
      if (typeof saved.sfxVolume === "number") sfxVolume = Math.max(0, Math.min(1, saved.sfxVolume));
      if (typeof saved.bgmMuted === "boolean") bgmMuted = saved.bgmMuted;
      if (typeof saved.sfxMuted === "boolean") sfxMuted = saved.sfxMuted;
      if (saved.keyConfig) {
        keyConfig.hit = normalizeKeyConfigValue(saved.keyConfig.hit, keyConfig.hit);
        keyConfig.star = normalizeKeyConfigValue(saved.keyConfig.star, keyConfig.star);
        keyConfig.auto = normalizeKeyConfigValue(saved.keyConfig.auto, keyConfig.auto);
      }
      normalizeKeyConfigObject();
    } catch {}
    normalizeKeyConfigObject();
  }

  function saveSettings() {
    normalizeKeyConfigObject();
    try {
      localStorage.setItem(settingsStorageKey(), JSON.stringify({ bgmVolume, sfxVolume, bgmMuted, sfxMuted, keyConfig }));
    } catch {}
    queueRemoteSettingsSave();
  }


  function simpleHash(str) {
    let h1 = 0x811c9dc5;
    const txt = String(str || "");
    for (let i = 0; i < txt.length; i++) {
      h1 ^= txt.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + ":" + btoa(unescape(encodeURIComponent(txt))).slice(0, 12);
  }

  function loadAccounts() {
    try { accounts = JSON.parse(localStorage.getItem(ACCOUNT_STORE_KEY) || "{}"); } catch { accounts = {}; }
    try {
      const savedUser = localStorage.getItem(SESSION_KEY) || "";
      if (savedUser && accounts[savedUser]) currentUserId = savedUser;
    } catch {}
  }

  function saveAccounts() {
    try { localStorage.setItem(ACCOUNT_STORE_KEY, JSON.stringify(accounts)); } catch {}
    try {
      if (currentUserId) localStorage.setItem(SESSION_KEY, currentUserId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  function validateAccountId(id) {
    return /^[A-Za-z0-9]{4,18}$/.test(String(id || ""));
  }

  function validatePassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{10,18}$/.test(String(pw || ""));
  }

  function currentAccount() {
    return currentUserId && accounts[currentUserId] ? accounts[currentUserId] : null;
  }

  function currentNickname() {
    const acc = currentAccount();
    return acc ? sanitizePlayerName(acc.nickname || acc.id) : "";
  }

  function accountPlayerCode(acc=currentAccount()) {
    if (!acc) return "게스트";
    const src = String(acc.googleSub || acc.id || currentUserId || "guest");
    const code = simpleHash(src).split(":")[0].slice(-6).toUpperCase();
    return `${acc.loginType === "google" ? "G" : "P"}-${code}`;
  }

  function accountProviderLabel(acc=currentAccount()) {
    if (!acc) return "로그인 안됨";
    return acc.loginType === "google" ? "로그인 연동" : "로컬 계정";
  }

  function accountSyncLabel() {
    if (!currentAccount()) return "로그인 후 기록 저장";
    if (remoteApiEnabled() && currentGoogleIdToken) return "외부 경쟁전 랭킹 연동";
    return "이 기기 로컬 기록";
  }

  function isAdminAccount() {
    const acc = currentAccount();
    if (!acc) return false;
    const candidates = [acc.nickname, localPlayerName, currentNickname()]
      .map(v => String(v || "").trim().toUpperCase())
      .filter(Boolean);
    // 관리자 히든 테스트는 GM / ADMIN / JBJ 닉네임만 허용합니다.
    // 한글 "관리자"는 일반 닉네임으로 취급해 접근을 막습니다.
    return candidates.some(v => ["GM", "ADMIN", "JBJ"].includes(v));
  }

  function setAdminStageNotice(msg) {
    adminStageNotice = msg || "";
    adminStageNoticeTimer = adminStageNotice ? 2.8 : 0;
  }

  function openAdminStageSelect(releaseTest=false) {
    if (!isAdminAccount()) {
      setLoginNotice("관리자 계정만 접근 가능");
      playSfx("coin", .55);
      return;
    }
    adminTestMode = true;
    adminReleaseTestMode = !!releaseTest;
    result = null;
    finalStats = [];
    leaderboardScroll = 0;
    closePeer();
    setAdminStageNotice(adminReleaseTestMode ? "관리자 동꼽 해방 테스트 모드" : "관리자 밸런스 테스트 모드");
    setState("adminStageSelect");
  }

  function accountUsefulLabel(acc=currentAccount()) {
    if (!acc) return "게스트";
    return accountProviderLabel(acc);
  }

  function settingsStorageKey() {
    return currentUserId ? `donggop_settings_user_${currentUserId}` : "donggop_settings";
  }

  function setLoginNotice(msg) {
    loginNotice = msg || "";
    loginNoticeTimer = loginNotice ? 3.2 : 0;
  }


  function nicknameChangeStatus(acc=currentAccount()) {
    if (!acc) return { canChange: false, remainingMs: 0 };
    const lastRaw = acc.nicknameChangedAt || acc.nickname_changed_at || "";
    const last = Date.parse(lastRaw);
    if (!Number.isFinite(last)) return { canChange: true, remainingMs: 0, lastAt: "" };
    const remainingMs = NICKNAME_CHANGE_COOLDOWN_MS - (Date.now() - last);
    return {
      canChange: remainingMs <= 0,
      remainingMs: Math.max(0, remainingMs),
      lastAt: new Date(last).toISOString()
    };
  }

  function formatNicknameCooldown(ms) {
    const totalHours = Math.max(1, Math.ceil(Number(ms || 0) / (60 * 60 * 1000)));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days > 0) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
    return `${totalHours}시간`;
  }

  function updateLocalLeaderboardNickname(newNick) {
    const list = loadLeaderboard();
    let changed = false;
    for (const row of list) {
      if (row && row.userId === currentUserId) {
        row.nickname = newNick;
        changed = true;
      }
    }
    if (changed) saveLeaderboard(list);
  }

  async function remotePostStrict(action, payload={}) {
    if (!remoteApiEnabled()) return null;
    const body = Object.assign({ action, idToken: currentGoogleIdToken, clientTime: new Date().toISOString() }, payload || {});
    try {
      const res = await fetch(APPS_SCRIPT_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body)
      });
      const data = safeJsonParse(await res.text());
      if (!data || typeof data !== "object") return { ok: false, error: "invalid_response" };
      return data;
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  function remoteApiEnabled() {
    return typeof APPS_SCRIPT_WEBAPP_URL === "string" &&
      APPS_SCRIPT_WEBAPP_URL.startsWith("https://") &&
      !APPS_SCRIPT_WEBAPP_URL.includes("YOUR_APPS_SCRIPT_WEBAPP_URL");
  }

  function base64UrlDecode(str) {
    try {
      const pad = "=".repeat((4 - (str.length % 4)) % 4);
      const b64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/") + pad;
      return decodeURIComponent(Array.prototype.map.call(atob(b64), c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    } catch {
      return "";
    }
  }

  function decodeJwtPayload(token) {
    try {
      const part = String(token || "").split(".")[1];
      if (!part) return null;
      return JSON.parse(base64UrlDecode(part));
    } catch {
      return null;
    }
  }

  function safeJsonParse(text) {
    try { return JSON.parse(text || "{}"); } catch { return {}; }
  }

  async function remotePost(action, payload={}) {
    if (!remoteApiEnabled()) return null;
    const body = Object.assign({ action, idToken: currentGoogleIdToken, clientTime: new Date().toISOString() }, payload || {});
    try {
      const res = await fetch(APPS_SCRIPT_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body)
      });
      const data = safeJsonParse(await res.text());
      if (!data.ok && data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      if (nowSec() - remoteNoticeCooldown > 5) {
        remoteNoticeCooldown = nowSec();
        setLoginNotice("랭킹 동기화 실패 - 로컬 저장으로 계속 진행");
      }
      return null;
    }
  }


  function onlineCountLabel() {
    if (!currentUserId) return "-명";
    if (!remoteApiEnabled() || !currentGoogleIdToken) return "-명";
    if (onlineUserCount === null || onlineUserCount === undefined) return "확인중";
    return `${Math.max(0, Number(onlineUserCount) || 0)}명`;
  }

  async function refreshOnlineCount(force=false) {
    if (!currentUserId || !remoteApiEnabled() || !currentGoogleIdToken) {
      onlineUserCount = null;
      onlineUserCountUpdatedAt = 0;
      return null;
    }
    const now = (typeof nowSec === "function") ? nowSec() : Date.now() / 1000;
    if (onlineUserCountInFlight) return onlineUserCount;
    if (!force && onlineUserCountUpdatedAt && now - onlineUserCountUpdatedAt < 12) return onlineUserCount;

    onlineUserCountInFlight = true;
    try {
      const data = await remotePostStrict("onlinePing", { nickname: currentNickname() || localPlayerName || "동꼽러" });
      if (data && data.ok && typeof data.onlineCount !== "undefined") {
        onlineUserCount = Math.max(0, Number(data.onlineCount) || 0);
      }
      return onlineUserCount;
    } finally {
      onlineUserCountUpdatedAt = (typeof nowSec === "function") ? nowSec() : Date.now() / 1000;
      onlineUserCountInFlight = false;
    }
  }

  function startOnlineHeartbeat() {
    if (onlineHeartbeatTimer) {
      clearInterval(onlineHeartbeatTimer);
      onlineHeartbeatTimer = 0;
    }
    if (!currentUserId || !remoteApiEnabled() || !currentGoogleIdToken) {
      onlineUserCount = null;
      onlineUserCountUpdatedAt = 0;
      return;
    }
    refreshOnlineCount(true);
    onlineHeartbeatTimer = setInterval(() => refreshOnlineCount(false), ONLINE_HEARTBEAT_MS);
  }

  function stopOnlineHeartbeat(sendLeave=false) {
    if (onlineHeartbeatTimer) {
      clearInterval(onlineHeartbeatTimer);
      onlineHeartbeatTimer = 0;
    }
    if (sendLeave && currentUserId && remoteApiEnabled() && currentGoogleIdToken) {
      remotePostStrict("onlineLeave", {}).then(data => {
        if (data && typeof data.onlineCount !== "undefined") {
          onlineUserCount = Math.max(0, Number(data.onlineCount) || 0);
          onlineUserCountUpdatedAt = (typeof nowSec === "function") ? nowSec() : Date.now() / 1000;
        }
      }).catch(() => {});
    } else {
      onlineUserCount = null;
      onlineUserCountUpdatedAt = 0;
    }
  }

  function sendOnlineLeaveBeacon() {
    if (!currentUserId || !remoteApiEnabled() || !currentGoogleIdToken) return;
    const body = JSON.stringify({
      action: "onlineLeave",
      idToken: currentGoogleIdToken,
      clientTime: new Date().toISOString()
    });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
        navigator.sendBeacon(APPS_SCRIPT_WEBAPP_URL, blob);
      } else {
        fetch(APPS_SCRIPT_WEBAPP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body,
          keepalive: true
        }).catch(() => {});
      }
    } catch {}
  }

  window.addEventListener("beforeunload", sendOnlineLeaveBeacon);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshOnlineCount(false);
  });

  function applyRemoteSettings(settings) {
    if (!settings || typeof settings !== "object") return;
    if (typeof settings.bgmVolume === "number") bgmVolume = Math.max(0, Math.min(1, settings.bgmVolume));
    if (typeof settings.sfxVolume === "number") sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume));
    if (typeof settings.bgmMuted === "boolean") bgmMuted = settings.bgmMuted;
    if (typeof settings.sfxMuted === "boolean") sfxMuted = settings.sfxMuted;
    if (settings.keyConfig) {
      keyConfig.hit = normalizeKeyConfigValue(settings.keyConfig.hit, keyConfig.hit);
      keyConfig.star = normalizeKeyConfigValue(settings.keyConfig.star, keyConfig.star);
      keyConfig.auto = normalizeKeyConfigValue(settings.keyConfig.auto, keyConfig.auto);
    }
    normalizeKeyConfigObject();
    try {
      localStorage.setItem(settingsStorageKey(), JSON.stringify({ bgmVolume, sfxVolume, bgmMuted, sfxMuted, keyConfig }));
    } catch {}
    applyVolumes();
  }

  function queueRemoteSettingsSave() {
    if (!remoteApiEnabled() || !currentGoogleIdToken || !currentUserId) return;
    clearTimeout(remoteSettingsTimer);
    remoteSettingsTimer = setTimeout(() => {
      remotePost("saveSettings", { settings: { bgmVolume, sfxVolume, bgmMuted, sfxMuted, keyConfig } });
    }, 700);
  }

  async function refreshRemoteLeaderboard(force=false) {
    if (!remoteApiEnabled()) return;
    const now = (typeof nowSec === "function") ? nowSec() : 0;
    if (remoteLeaderboardInFlight) return;
    if (!force && remoteLeaderboardSyncedAt && now - remoteLeaderboardSyncedAt < 6) return;
    remoteLeaderboardInFlight = true;
    try {
      const data = await remotePost("getLeaderboard", { limit: 100 });
      if (data && Array.isArray(data.leaderboard)) {
        saveLeaderboard(data.leaderboard);
        remoteLeaderboardSyncedAt = (typeof nowSec === "function") ? nowSec() : now;
      }
    } finally {
      remoteLeaderboardInFlight = false;
    }
  }

  async function syncGoogleLoginToRemote() {
    if (!currentUserId || !currentGoogleIdToken) return;
    const acc = currentAccount();
    if (!acc) return;
    if (!remoteApiEnabled()) {
      setLoginNotice(`${acc.nickname} 로그인 완료 / Apps Script URL 미설정`);
      return;
    }
    const loginData = await remotePost("login", {
      nickname: acc.nickname
    });
    if (loginData && loginData.user && loginData.user.nickname) {
      acc.nickname = sanitizePlayerName(loginData.user.nickname || acc.nickname);
      if (loginData.user.nickname_changed_at) acc.nicknameChangedAt = loginData.user.nickname_changed_at;
      localPlayerName = acc.nickname;
      saveAccounts();
    }
    if (loginData && typeof loginData.onlineCount !== "undefined") {
      onlineUserCount = Math.max(0, Number(loginData.onlineCount) || 0);
      onlineUserCountUpdatedAt = (typeof nowSec === "function") ? nowSec() : Date.now() / 1000;
    }
    startOnlineHeartbeat();
    const settingsData = await remotePost("getSettings", {});
    if (settingsData && settingsData.settings) applyRemoteSettings(settingsData.settings);
    await refreshRemoteLeaderboard(true);
    setLoginNotice(`${currentNickname()} 로그인 완료 / 현재접속자 ${onlineCountLabel()} / 랭킹 연동 완료`);
  }

  function hasPrivacyConsent() {
    try { return localStorage.getItem(PRIVACY_CONSENT_KEY) === "yes"; } catch { return false; }
  }

  function savePrivacyConsent(checked) {
    try {
      if (checked) localStorage.setItem(PRIVACY_CONSENT_KEY, "yes");
      else localStorage.removeItem(PRIVACY_CONSENT_KEY);
    } catch {}
  }

  function updateGoogleLoginButtonLock() {
    const panel = googleLoginPanelEl;
    if (!panel) return;
    const consent = panel.querySelector("#googlePrivacyConsent");
    const signIn = panel.querySelector("#googleSignInButton");
    const guide = panel.querySelector("#googleConsentGuide");
    const ok = !!(consent && consent.checked);
    if (signIn) signIn.classList.toggle("google-signin-disabled", !ok);
    if (guide) guide.textContent = ok ? "동의 확인 완료: Google 로그인 버튼을 누를 수 있습니다." : "동의 체크 후 Google 로그인 버튼이 활성화됩니다.";
  }

  function buildGoogleLoginPanel() {
    if (googleLoginPanelEl) return googleLoginPanelEl;
    const wrap = document.createElement("div");
    wrap.id = "googleLoginOverlay";
    wrap.className = "google-login-overlay hidden";
    wrap.innerHTML = `
      <div class="google-login-card" role="dialog" aria-modal="true" aria-labelledby="googleLoginTitle">
        <h3 id="googleLoginTitle">동꼽즈 로그인</h3>
        <p>무료 팬 게임 이용을 위한 로그인입니다. 아래 개인정보 및 이용 책임 안내를 확인해 주세요.</p>

        <div class="google-privacy-box" aria-label="개인정보 및 이용 책임 안내">
          <b>개인정보 및 이용 책임 안내</b>
          <ul>
            <li>Google 로그인은 랭킹 기록과 현재접속자 표시를 위해 Google 고유 식별값, 닉네임, 게임 기록, 접속 상태, 키설정, 볼륨 설정만 저장합니다.</li>
            <li>랭킹 화면에는 닉네임, 캐릭터, 점수, 최고 CPM, 콤보, 도달 스테이지만 표시됩니다.</li>
            <li>브라우저/기기 오류, 네트워크 문제, 로컬 저장 데이터, 데이터 초기화, 이용자 간 분쟁 등 사이트 이용 중 발생하는 문제에 대해 개발자는 책임 지지 않습니다.</li>
          </ul>
        </div>

        <label class="google-consent-check">
          <input id="googlePrivacyConsent" type="checkbox" />
          <span>위 개인정보 안내 및 무료 팬 게임 이용 조건을 확인하고 동의합니다.</span>
        </label>
        <div id="googleConsentGuide" class="google-consent-guide">동의 체크 후 Google 로그인 버튼이 활성화됩니다.</div>

        <div id="googleLoginStatus" class="google-login-status hidden"></div>
        <div id="googleSignInButton" class="google-signin-disabled" style="display:grid; place-items:center; min-height:44px;"></div>
        <button id="googleLoginClose" class="google-login-close" type="button" aria-label="로그인 창 닫기">닫기</button>
      </div>`;
    document.body.appendChild(wrap);

    // 캔버스 입력 처리보다 로그인 모달 닫기 처리를 우선합니다.
    const forceClose = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      }
      hideGoogleLoginPanel();
      return false;
    };
    wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) forceClose(e); }, true);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) forceClose(e); }, true);
    const closeBtn = wrap.querySelector("#googleLoginClose");
    closeBtn.addEventListener("pointerdown", forceClose, true);
    closeBtn.addEventListener("click", forceClose, true);
    closeBtn.onclick = forceClose;

    const consent = wrap.querySelector("#googlePrivacyConsent");
    if (consent) {
      consent.checked = hasPrivacyConsent();
      consent.addEventListener("change", () => {
        savePrivacyConsent(consent.checked);
        updateGoogleLoginButtonLock();
      });
    }

    googleLoginPanelEl = wrap;
    return googleLoginPanelEl;
  }

  function hideGoogleLoginPanel() {
    if (googleLoginPanelEl) {
      googleLoginPanelEl.classList.add("hidden");
      const btn = googleLoginPanelEl.querySelector("#googleSignInButton");
      if (btn) btn.innerHTML = "";
    }
  }

  function isGoogleLoginAllowedOrigin() {
    const protocol = location.protocol;
    const host = location.hostname;
    return protocol === "https:" || host === "localhost" || host === "127.0.0.1";
  }

  function setGoogleLoginStatus(message, warn=true) {
    const panel = buildGoogleLoginPanel();
    const box = panel.querySelector("#googleLoginStatus");
    if (!box) return;
    box.textContent = message || "";
    box.className = message ? `google-login-status ${warn ? "warn" : "ok"}` : "google-login-status hidden";
  }

  function showGoogleLoginPanel() {
    const panel = buildGoogleLoginPanel();
    panel.classList.remove("hidden");
    const consent = panel.querySelector("#googlePrivacyConsent");
    if (consent) consent.checked = hasPrivacyConsent();
    updateGoogleLoginButtonLock();
    setGoogleLoginStatus("");

    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_")) {
      setGoogleLoginStatus("로그인 설정이 아직 완료되지 않았습니다.");
      setLoginNotice("로그인 설정이 아직 완료되지 않았습니다");
      return;
    }

    if (!isGoogleLoginAllowedOrigin()) {
      setGoogleLoginStatus("로컬 파일(file://)에서는 로그인이 차단됩니다. GitHub 도메인에서 접속하거나 LOCAL_TEST_START.bat로 localhost 테스트를 실행하세요.");
      setLoginNotice("로그인은 GitHub 도메인 또는 localhost에서 테스트하세요");
      return;
    }

    if (!window.google || !google.accounts || !google.accounts.id) {
      setGoogleLoginStatus("로그인 모듈 로딩 중입니다. 잠시 후 다시 눌러주세요.");
      setLoginNotice("로그인 모듈 로딩 중입니다. 잠시 후 다시 눌러주세요");
      return;
    }

    try {
      if (!googleIdInitialized) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true
        });
        googleIdInitialized = true;
      }
      const btn = panel.querySelector("#googleSignInButton");
      btn.innerHTML = "";
      google.accounts.id.renderButton(btn, {
        theme: "filled_black",
        size: "large",
        type: "standard",
        shape: "pill",
        text: "signin_with",
        locale: "ko"
      });
      updateGoogleLoginButtonLock();
    } catch (err) {
      console.warn("Login render failed", err);
      setGoogleLoginStatus("로그인 버튼 초기화에 실패했습니다. 도메인 등록과 HTTPS 설정을 확인하세요.");
    }
  }

  // 혹시 모달 버튼 이벤트가 다른 레이어에 가로막혀도 닫기 버튼은 항상 동작하게 보강합니다.
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "googleLoginClose") {
      e.preventDefault();
      e.stopPropagation();
      hideGoogleLoginPanel();
    }
  }, true);

  function handleGoogleCredentialResponse(response) {
    if (!hasPrivacyConsent()) {
      showGoogleLoginPanel();
      setGoogleLoginStatus("개인정보 안내 및 이용 조건 동의가 필요합니다.");
      setLoginNotice("동의 체크 후 로그인해 주세요");
      return;
    }
    const token = response && response.credential ? String(response.credential) : "";
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
      setLoginNotice("로그인 토큰을 읽지 못했습니다");
      return;
    }
    hideGoogleLoginPanel();
    currentGoogleIdToken = token;
    googleProfile = payload;
    const uid = `google:${payload.sub}`;
    let acc = accounts[uid];
    if (!acc) {
      const suggested = "동꼽러";
      const nickInput = window.prompt("동꼽즈에서 사용할 닉네임을 입력하세요. 한글 12자 / 영문 18자 이내", suggested);
      const nick = sanitizePlayerName(nickInput || suggested || "동꼽러");
      acc = accounts[uid] = {
        id: uid,
        loginType: "google",
        googleSub: payload.sub,
        nickname: nick,
        nicknameChangedAt: "",
        createdAt: new Date().toISOString(),
        records: [],
        totals: { plays: 0, wins: 0, bestScore: 0, bestCpm: 0, bestCombo: 0, bestStage: 0 }
      };
    } else {
      acc.loginType = "google";
      acc.googleSub = payload.sub;
      delete acc.googleEmail;
      delete acc.googleName;
      delete acc.googlePicture;
      acc.lastLoginAt = new Date().toISOString();
    }
    currentUserId = uid;
    localPlayerName = sanitizePlayerName(acc.nickname || "동꼽러");
    saveAccounts();
    loadSettings();
    applyVolumes();
    setLoginNotice(`${localPlayerName} 로그인 완료`);
    syncGoogleLoginToRemote();
  }


  async function promptChangeNickname() {
    const acc = currentAccount();
    if (!acc) {
      setLoginNotice("로그인 후 닉네임 변경 가능");
      return;
    }

    const status = nicknameChangeStatus(acc);
    if (!status.canChange) {
      setLoginNotice(`닉네임 변경은 ${formatNicknameCooldown(status.remainingMs)} 후 가능`);
      return;
    }

    if (acc.loginType === "google" && remoteApiEnabled() && !currentGoogleIdToken) {
      setLoginNotice("닉네임 변경은 Google 재로그인 후 가능");
      showGoogleLoginPanel();
      return;
    }

    const currentNick = sanitizePlayerName(acc.nickname || currentNickname() || "동꼽러");
    const input = window.prompt(
      "새 닉네임을 입력하세요. 한글 12자 / 영문 18자 이내\n닉네임 변경은 7일에 1번만 가능합니다.",
      currentNick
    );
    if (input === null) return;

    const newNick = sanitizePlayerName(input || currentNick || "동꼽러");
    if (newNick === currentNick) {
      setLoginNotice("기존 닉네임과 같습니다");
      return;
    }

    const ok = window.confirm(`닉네임을 "${newNick}"(으)로 변경할까요?\n변경 후 7일 동안 다시 변경할 수 없습니다.`);
    if (!ok) return;

    if (acc.loginType === "google" && remoteApiEnabled() && currentGoogleIdToken) {
      setLoginNotice("닉네임 변경 동기화 중...");
      const data = await remotePostStrict("changeNickname", { nickname: newNick });
      if (data && data.ok && data.user) {
        acc.nickname = sanitizePlayerName(data.user.nickname || newNick);
        acc.nicknameChangedAt = data.user.nickname_changed_at || new Date().toISOString();
        localPlayerName = acc.nickname;
        if (Array.isArray(data.leaderboard)) saveLeaderboard(data.leaderboard);
        else updateLocalLeaderboardNickname(acc.nickname);
        saveAccounts();
        refreshOnlineCount(true);
        setLoginNotice(`${acc.nickname} 닉네임 변경 완료`);
        return;
      }
      if (data && data.error === "nickname_change_locked") {
        if (data.user && data.user.nickname_changed_at) acc.nicknameChangedAt = data.user.nickname_changed_at;
        saveAccounts();
        setLoginNotice(`닉네임 변경은 ${formatNicknameCooldown(data.remainingMs || 0)} 후 가능`);
        return;
      }
      setLoginNotice("닉네임 변경 실패 - 잠시 후 다시 시도");
      return;
    }

    acc.nickname = newNick;
    acc.nicknameChangedAt = new Date().toISOString();
    localPlayerName = newNick;
    updateLocalLeaderboardNickname(newNick);
    saveAccounts();
    setLoginNotice(`${newNick} 닉네임 변경 완료`);
  }

  function promptCreateAccount() {
    const id = window.prompt("계정 ID를 입력하세요. 영문/숫자 4~18자리", "");
    if (id === null) return;
    const uid = String(id).trim();
    if (!validateAccountId(uid)) { setLoginNotice("ID는 영문/숫자 4~18자리만 가능"); return; }
    if (accounts[uid]) { setLoginNotice("이미 존재하는 ID입니다"); return; }
    const pw = window.prompt("PW를 입력하세요. 영문 대/소문자+숫자 조합 10~18자리", "");
    if (pw === null) return;
    if (!validatePassword(pw)) { setLoginNotice("PW는 영문 대/소문자+숫자 조합 10~18자리"); return; }
    const nick = window.prompt("닉네임을 입력하세요. 한글 12자 / 영문 18자 이내", uid);
    if (nick === null) return;
    accounts[uid] = {
      id: uid,
      pwHash: simpleHash(uid + "|" + pw),
      nickname: sanitizePlayerName(nick || uid),
      nicknameChangedAt: "",
      createdAt: new Date().toISOString(),
      records: [],
      totals: { plays: 0, wins: 0, bestScore: 0, bestCpm: 0, bestCombo: 0, bestStage: 0 }
    };
    stopOnlineHeartbeat(true);
    currentGoogleIdToken = "";
    googleProfile = null;
    currentUserId = uid;
    localPlayerName = accounts[uid].nickname;
    saveAccounts();
    loadSettings();
    applyVolumes();
    setLoginNotice(`${accounts[uid].nickname} 계정 생성/로그인 완료`);
  }

  function promptLoginAccount() {
    const id = window.prompt("계정 ID를 입력하세요.", currentUserId || "");
    if (id === null) return;
    const uid = String(id).trim();
    if (!accounts[uid]) { setLoginNotice("등록되지 않은 ID입니다"); return; }
    const pw = window.prompt("PW를 입력하세요.", "");
    if (pw === null) return;
    if (accounts[uid].pwHash !== simpleHash(uid + "|" + pw)) { setLoginNotice("PW가 맞지 않습니다"); return; }
    stopOnlineHeartbeat(true);
    currentGoogleIdToken = "";
    googleProfile = null;
    currentUserId = uid;
    localPlayerName = sanitizePlayerName(accounts[uid].nickname || uid);
    saveAccounts();
    loadSettings();
    applyVolumes();
    setLoginNotice(`${localPlayerName} 로그인 완료`);
  }

  function logoutAccount() {
    stopOnlineHeartbeat(true);
    currentUserId = "";
    currentGoogleIdToken = "";
    googleProfile = null;
    localPlayerName = "";
    onlineUserCount = null;
    onlineUserCountUpdatedAt = 0;
    saveAccounts();
    loadSettings();
    applyVolumes();
    setLoginNotice("로그아웃되었습니다");
  }

  function saveUserStageRecord(res, kind="stage") {
    if (!currentUserId || !accounts[currentUserId] || !res) return;
    const acc = accounts[currentUserId];
    if (!Array.isArray(acc.records)) acc.records = [];
    if (!acc.totals) acc.totals = { plays: 0, wins: 0, bestScore: 0, bestCpm: 0, bestCombo: 0, bestStage: 0 };
    const rec = {
      at: new Date().toISOString(),
      kind,
      mode: gameMode,
      stage: res.stage,
      win: !!res.win,
      score: res.localScore || 0,
      rivalScore: res.remoteScore || 0,
      maxCpm: res.maxCpm || 0,
      maxManualCpm: res.maxManualCpm || 0,
      combo: res.combo || 0,
      star: res.star || 0,
      donggop: res.donggop || 0,
      fever: res.fever || 0
    };
    acc.records.unshift(rec);
    if (acc.records.length > 100) acc.records.length = 100;
    acc.totals.plays = (acc.totals.plays || 0) + 1;
    if (rec.win) acc.totals.wins = (acc.totals.wins || 0) + 1;
    acc.totals.bestScore = Math.max(acc.totals.bestScore || 0, rec.score);
    acc.totals.bestCpm = Math.max(acc.totals.bestCpm || 0, rec.maxCpm);
    acc.totals.bestCombo = Math.max(acc.totals.bestCombo || 0, rec.combo);
    acc.totals.bestStage = Math.max(acc.totals.bestStage || 0, rec.stage || 0);
    saveAccounts();
  }

  function loadLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]"); } catch { return []; }
  }

  function saveLeaderboard(list) {
    try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list.slice(0, 100))); } catch {}
  }

  function totalRunScore(stats) {
    return (stats || []).reduce((sum, r) => sum + (r.localScore || 0), 0);
  }

  function bestRunCpm(stats) {
    return Math.max(0, ...((stats || []).map(r => r.maxCpm || 0)));
  }

  function bestRunCombo(stats) {
    return Math.max(0, ...((stats || []).map(r => r.combo || 0)));
  }

  function maxAutoItemsForCurrentStage() {
    // 일반/온라인/1~5스테이지는 5개 유지, 사용자 경쟁전 6~10스테이지는 6~10개까지 확장
    if (gameMode === "competition") return Math.max(5, Math.min(10, STAGES[stageIndex]?.no || 5));
    return 5;
  }

  function currentStageNo() {
    return Number(STAGES[stageIndex]?.no || 1);
  }

  function isDonggopReleaseStage() {
    return gameMode === "competition" && currentStageNo() >= DONGGOP_RELEASE_STAGE;
  }

  function donggopCpmForCurrentStage() {
    if (!isDonggopReleaseStage()) return DONGGOP_CPM;
    return DONGGOP_RELEASE_CPM_BY_STAGE[currentStageNo()] || DONGGOP_CPM;
  }

  function starCpmForCurrentStage() {
    if (gameMode === "competition" && currentStageNo() >= 7) {
      return STAR_CPM_BY_STAGE[currentStageNo()] || 500;
    }
    return 500;
  }

  function isDonggopReleaseActive(player=local) {
    return !!(player && player.autoReleaseTimer > 0);
  }

  function resetDonggopReleaseCycle(player=local) {
    if (!player) return;
    player.donggopReleaseCycleActive = false;
    player.donggopReleaseCycleTarget = 0;
    player.donggopReleaseCycleSpent = 0;
  }

  function grantAdminReleaseTestCoins(player=local, force=false) {
    if (!(adminTestMode && adminReleaseTestMode && isDonggopReleaseStage() && player)) return;
    const maxItems = maxAutoItemsForCurrentStage();
    if (currentStageNo() < 7 || maxItems < 7) return;
    if (isDonggopReleaseActive(player) || player.donggopReleaseCycleActive) return;
    if (force || player.donggopItems < maxItems) {
      player.donggopItems = maxItems;
      player.adminReleaseRefillNotified = true;
      addText(330, 300, `테스트 코인 자동 충전 x${maxItems}/${maxItems}`, "#bfffe0", 25, .9);
    }
  }

  function triggerDonggopRelease(player=local, usedCount=0) {
    if (!player) return;
    player.autoReleaseTimer = DONGGOP_RELEASE_DURATION;
    player.autoReleaseAcc = 0;
    player.autoReleaseUses = (player.autoReleaseUses || 0) + 1;
    resetDonggopReleaseCycle(player);
    fountain(330, 330);
    addText(330, 300, `동꼽 해방! ${usedCount || maxAutoItemsForCurrentStage()}개 전부 사용`, "#fff0a8", 34, 1.05);
    addText(330, 338, `10초 동안 ${keyLabel(keyConfig.hit)} 홀드 자동연타`, "#bfffe0", 24, 1.15);
    playSfx("item", 1.1);
    sendMsg({ type: "item", item: "donggop_release", count: usedCount || maxAutoItemsForCurrentStage() });
  }

  function useDonggopAutoSkill(player=local) {
    if (!player) return;
    if (player.fUnlocked) {
      addText(330, 300, `${AUTO_SKILL_NAME}은 ${STAR_SKILL_NAME}과 중복 불가`, "#ffd08a", 25, .9);
      return;
    }
    if (player.donggopItems <= 0) {
      addText(330, 300, `${AUTO_SKILL_NAME} 없음`, "#eee", 25, .8);
      return;
    }

    const releaseStage = isDonggopReleaseStage();
    const maxItems = maxAutoItemsForCurrentStage();
    const beforeItems = player.donggopItems;
    const stageCpm = donggopCpmForCurrentStage();

    if (releaseStage && beforeItems >= maxItems && !player.donggopReleaseCycleActive) {
      player.donggopReleaseCycleActive = true;
      player.donggopReleaseCycleTarget = maxItems;
      player.donggopReleaseCycleSpent = 0;
      addText(330, 268, `동꼽 해방 준비! ${maxItems}개를 모두 사용하세요`, "#fff0a8", 23, .9);
    }

    player.donggopItems = Math.max(0, player.donggopItems - 1);
    player.donggopBuffs.push(DONGGOP_DURATION);

    if (releaseStage && player.donggopReleaseCycleActive) {
      player.donggopReleaseCycleSpent++;
      const left = Math.max(0, player.donggopReleaseCycleTarget - player.donggopReleaseCycleSpent);
      addText(330, 305, `${AUTO_SKILL_NAME} 1개 사용! 13초 +${stageCpm}CPM`, "#bfe8ff", 28, 1.0);
      if (left > 0) addText(330, 338, `해방까지 ${left}개 남음`, "#fff0a8", 22, .9);
      if (player.donggopItems <= 0 && player.donggopReleaseCycleSpent >= player.donggopReleaseCycleTarget) {
        triggerDonggopRelease(player, player.donggopReleaseCycleTarget);
      } else {
        playSfx("item");
        sendMsg({ type: "item", item: "donggop", count: 1 });
      }
    } else {
      addText(330, 300, `${AUTO_SKILL_NAME} 발동! 13초 +${releaseStage ? stageCpm : DONGGOP_CPM}CPM`, "#bfe8ff", 32, 1.0);
      if (releaseStage) addText(330, 338, `MAX에서 전부 쓰면 동꼽 해방`, "#fff0a8", 21, .85);
      playSfx("item");
      sendMsg({ type: "item", item: "donggop", count: 1 });
    }
  }

  function competitionDeficit() {
    if (!(gameMode === "competition" && state === "playing" && local && remote)) return 0;
    return Math.max(0, remote.score - local.score);
  }

  function maybeHandleCompetitionElimination() {
    const deficit = competitionDeficit();
    if (deficit < 500) return false;
    const t = nowSec();
    if (t - competitionLastWarnAt > 0.85) {
      competitionLastWarnAt = t;
      playSfx("ready", 0.65);
      addText(W/2, 188, `위험! 탈락 위험 ${deficit}점 차이`, "#ff4666", 30, 0.75);
      for (let i=0; i<18; i++) {
        particles.push({
          x: W/2 + (Math.random()-.5)*620,
          y: 145 + Math.random()*85,
          vx: (Math.random()-.5)*150,
          vy: -80 - Math.random()*120,
          life: .45 + Math.random()*.35,
          color: Math.random() < .5 ? "#ff3055" : "#fff0a8",
          size: 5 + Math.random()*6
        });
      }
    }
    if (deficit >= 1000) {
      addText(W/2, 230, "1000점 차이! 사용자 경쟁전 탈락", "#ffb0b0", 34, 1.1);
      finishStage(false, "competition_eliminated");
      return true;
    }
    return false;
  }

  function commitCompetitionRecord(clear=false) {
    if (competitionSaved || !finalStats.length) return;
    competitionSaved = true;
    const entry = {
      at: new Date().toISOString(),
      userId: currentUserId || "guest",
      nickname: currentNickname() || getLocalName() || "게스트",
      character: chars[selectedChar].name,
      clear: !!clear,
      reachedStage: Math.max(...finalStats.map(r => r.stage || 1)),
      totalScore: totalRunScore(finalStats),
      bestCpm: bestRunCpm(finalStats),
      bestCombo: bestRunCombo(finalStats),
      stars: finalStats.reduce((s, r) => s + (r.star || 0), 0),
      donggops: finalStats.reduce((s, r) => s + (r.donggop || 0), 0),
      fevers: finalStats.reduce((s, r) => s + (r.fever || 0), 0)
    };
    const list = loadLeaderboard();
    list.push(entry);
    list.sort((a,b) =>
      (b.totalScore - a.totalScore) ||
      (b.reachedStage - a.reachedStage) ||
      (b.bestCpm - a.bestCpm) ||
      (b.bestCombo - a.bestCombo)
    );
    saveLeaderboard(list);
    if (remoteApiEnabled() && currentGoogleIdToken) {
      remoteLeaderboardInFlight = true;
      remotePost("saveScore", { score: entry }).then((data) => {
        if (data && Array.isArray(data.leaderboard)) {
          saveLeaderboard(data.leaderboard);
          remoteLeaderboardSyncedAt = nowSec();
        }
      }).finally(() => {
        remoteLeaderboardInFlight = false;
        refreshRemoteLeaderboard(true);
      });
    }
    if (currentUserId && accounts[currentUserId]) {
      const acc = accounts[currentUserId];
      if (!Array.isArray(acc.records)) acc.records = [];
      acc.records.unshift({ at: entry.at, kind: "competition", mode: "competition", stage: entry.reachedStage, win: entry.clear, score: entry.totalScore, maxCpm: entry.bestCpm, combo: entry.bestCombo });
      if (acc.records.length > 100) acc.records.length = 100;
      if (!acc.totals) acc.totals = { plays: 0, wins: 0, bestScore: 0, bestCpm: 0, bestCombo: 0, bestStage: 0 };
      acc.totals.plays = (acc.totals.plays || 0) + 1;
      if (entry.clear) acc.totals.wins = (acc.totals.wins || 0) + 1;
      acc.totals.bestScore = Math.max(acc.totals.bestScore || 0, entry.totalScore);
      acc.totals.bestCpm = Math.max(acc.totals.bestCpm || 0, entry.bestCpm);
      acc.totals.bestCombo = Math.max(acc.totals.bestCombo || 0, entry.bestCombo);
      acc.totals.bestStage = Math.max(acc.totals.bestStage || 0, entry.reachedStage);
      saveAccounts();
    }
  }

  function nowSec() { return performance.now() / 1000; }

  // 인트로 화면 전용 BGM 재생 보강:
  // 안드로이드 크롬은 자동재생을 막는 경우가 있어, 자동 시도 + 첫 터치/클릭/키입력 때 재시도한다.
  // 타이틀/본게임 BGM 로직은 그대로 두고 인트로 BGM만 안정화한다.
  function ensureIntroBgmPlaying(reset=false) {
    if (state !== "intro") return;
    const a = audio.introBgm;
    if (!a) return;
    audioUnlocked = true;
    a.loop = true;
    a.volume = bgmEffectiveVolume();
    if (currentBgm && currentBgm !== a) stopBgm();
    currentBgm = a;
    try {
      if (reset) a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // 실패 상태를 currentBgm으로 고정하지 않고, 다음 사용자 입력에서 다시 재시도한다.
          if (currentBgm === a && a.paused) currentBgm = null;
        });
      }
    } catch {
      if (currentBgm === a && a.paused) currentBgm = null;
    }
  }

  function unlockAudio() {
    if (state === "intro") {
      audioUnlocked = true;
      applyVolumes();
      ensureIntroBgmPlaying(false);
      return;
    }
    if (audioUnlocked) return;
    audioUnlocked = true;
    applyVolumes();
    switchBgmForState();
  }

  function tryTitleAutoplay() {
    if (audioUnlocked) return;
    const a = state === "intro" ? audio.introBgm : audio.titleBgm;
    if (!a) return;
    try {
      a.loop = true;
      a.volume = bgmEffectiveVolume();
      const p = a.play();
      if (p) {
        p.then(() => {
          audioUnlocked = true;
          currentBgm = a;
        }).catch(() => {
          if (currentBgm === a && a.paused) currentBgm = null;
        });
      }
    } catch {
      if (currentBgm === a && a.paused) currentBgm = null;
    }
  }

  function applyVolumes() {
    for (const [key, a] of Object.entries(audio)) {
      const isBgm = key.includes("Bgm") || key.startsWith("stage");
      a.volume = isBgm ? bgmEffectiveVolume() : (sfxMuted ? 0 : sfxVolume);
    }
    if (currentBgm) currentBgm.volume = bgmEffectiveVolume();
  }

  function playSfx(key, volMul=1) {
    const a = audio[key];
    if (!a || !audioUnlocked || sfxMuted) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = Math.min(1, sfxVolume * volMul);
      a.play().catch(()=>{});
    } catch {}
  }

  function stopBgm() {
    if (currentBgm) {
      try { currentBgm.pause(); } catch {}
      currentBgm = null;
    }
  }

  function playBgm(key) {
    if (!audioUnlocked) return;
    const a = audio[key];
    if (!a) return;
    if (currentBgm === a && !a.paused) return;
    if (currentBgm !== a) stopBgm();
    currentBgm = a;
    try {
      a.volume = bgmEffectiveVolume();
      if (a.paused || a.ended) a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          if (currentBgm === a && a.paused) currentBgm = null;
        });
      }
    } catch {
      if (currentBgm === a && a.paused) currentBgm = null;
    }
  }

  function switchBgmForState() {
    if (!audioUnlocked) return;
    if (state === "intro") ensureIntroBgmPlaying(false);
    else if (state === "title") playBgm("titleBgm");
    else if (state === "select" || state === "mode" || state === "adminStageSelect" || state === "connected" || state === "onlineLobby") playBgm("selectBgm");
    else if (state === "onlineCountdown") playBgm(onlineBgmKey || "stage1");
    else if (state === "stageCountdown") playBgm(`stage${Math.min(stageIndex + 1, 5)}`);
    else if (state === "playing") playBgm(gameMode === "online" ? (onlineBgmKey || "stage1") : `stage${Math.min(stageIndex + 1, 5)}`);
    else if (state === "ending" || state === "final") playBgm("endingBgm");
    else stopBgm();
  }

  function setState(s) {
    state = s;
    if (s !== "playing") clearGameplayHeldKeys();
    switchBgmForState();
    if (s === "intro") tryTitleAutoplay();
  }

  function loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { assets[key] = img; resolve(); };
      img.onerror = () => { assets[key] = null; resolve(); };
      img.src = src;
    });
  }

  function defaultPlayer(charIdx, side, nameOverride="") {
    return {
      char: charIdx,
      name: nameOverride || chars[charIdx].name,
      score: 0,
      combo: 0,
      maxCombo: 0,
      hitTimes: [],
      manualHitTimes: [],
      actionTimer: 0,
      lastHit: -99,
      side,
      fUnlocked: false,
      fTimer: 0,
      fCooldown: 0,
      dUnlocked: false,
      dTimer: 0,
      starSustain: 0,
      dSustain: 0,
      donggopItems: 0,
      donggopSustain: 0,
      donggopBuffs: [],
      feverTimer: 0,
      lastFeverCombo: 0,
      starPopup: 0,
      maxCpm: 0,
      maxManualCpm: 0,
      starEarned: 0,
      dEarned: 0,
      donggopEarned: 0,
      feverCount: 0,
      remoteCpm: 0,
      remoteManualCpm: 0,
      autoAcc: 0,
      autoReleaseTimer: 0,
      autoReleaseAcc: 0,
      autoReleaseUses: 0,
      donggopReleaseCycleActive: false,
      donggopReleaseCycleTarget: 0,
      donggopReleaseCycleSpent: 0,
      adminReleaseRefillNotified: false,
    };
  }

  function resetPlayerKeepChar(p, side) {
    return defaultPlayer(p.char, side, p.name);
  }

  function cpm(player, manual=false, windowSec=1.0) {
    const t = nowSec();
    const arr = manual ? player.manualHitTimes : player.hitTimes;
    while (arr.length && t - arr[0] > windowSec) arr.shift();
    return Math.round(arr.length * 60 / windowSec);
  }

  function hit(player, manual=true, send=false, key="A", show=true) {
    const t = nowSec();
    player.score += 1 + (player.feverTimer > 0 ? 1 : 0);
    player.combo = (t - player.lastHit < 0.55) ? player.combo + 1 : 1;
    player.maxCombo = Math.max(player.maxCombo, player.combo);
    player.lastHit = t;
    player.actionTimer = Math.max(player.actionTimer || 0, 0.18);
    player.hitTimes.push(t);
    if (manual) player.manualHitTimes.push(t);
    if (show) spawnCoinBurst(player, 1.0);
    else if (manual && player.side === "right" && Math.random() < 0.10) spawnCoinBurst(player, 0.35);
    if (show && player.combo % 50 === 0) {
      addText(player.side === "left" ? 330 : 950, 210, `${player.combo} COMBO!`, "#fff0a8", 34, 1.0);
      playSfx("score");
    }
    if (manual && player.side === "left") playSfx("coin");
    maybeFever(player);
    if (send) sendMsg({ type: "hit", key, score: player.score, combo: player.combo });
  }

  function maybeFever(player) {
    if (player.combo > 0 && player.combo % FEVER_STEP === 0 && player.combo !== player.lastFeverCombo) {
      player.lastFeverCombo = player.combo;
      player.feverTimer = FEVER_DURATION;
      player.feverCount += 1;
      addText(player.side === "left" ? 330 : 950, 165, "버블 피버!", "#ffd6ff", 42, 1.2);
      fountain(player.side === "left" ? 330 : 950, 310);
      playSfx("score", 1.1);
    }
  }

  function spawnCoinBurst(player, intensity=1.0) {
    const x = player.side === "left" ? 330 : 950;
    const y = 520;
    const coinCount = Math.max(1, Math.round(3 * intensity));
    const starCount = Math.max(0, Math.round(1 * intensity));
    for (let i=0; i<coinCount; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const sp = 120 + Math.random()*260;
      particles.push({ kind:"coin", x, y, vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, life: .42, maxLife:.42, rot: Math.random()*360, r: 16+Math.random()*14 });
    }
    for (let i=0; i<starCount; i++) {
      addText(x + (Math.random()-.5)*55, y-25+(Math.random()-.5)*35, ["★","✦"][i%2], ["#fff0a8","#8bdfff"][i%2], 20+Math.random()*9, .42);
    }
    if (particles.length > 140) particles.splice(0, particles.length - 140);
  }

  function addText(x,y,text,color="#fff",size=24,life=.85) {
    floating.push({ x,y,text,color,size,life,maxLife:life,vy:-35-Math.random()*25 });
    if (floating.length > 45) floating.splice(0, floating.length - 45);
  }

  function fountain(x,y) {
    // 별풍선 발동 전용: 화려하지만 파티클 수를 제한해서 브라우저 렉을 억제
    const burst = 26;
    for (let i=0; i<burst; i++) {
      const ang = -Math.PI*0.95 + Math.random()*Math.PI*0.9;
      const sp = 150 + Math.random()*390;
      particles.push({
        kind: i % 3 === 0 ? "spark" : "star",
        x: x + (Math.random()-.5)*58,
        y: y + (Math.random()-.5)*28,
        vx: Math.cos(ang)*sp,
        vy: Math.sin(ang)*sp,
        life: .8 + Math.random()*.55,
        maxLife: 1.35,
        r: 10 + Math.random()*20,
        color: ["#fff0a8","#ff8ee4","#8bdfff","#ffffff"][i%4],
        rot: Math.random()*360
      });
    }
    for (let i=0; i<7; i++) {
      addText(x + (Math.random()-.5)*170, y - 80 - Math.random()*80, ["★","✦","✧","♡"][i%4], ["#fff0a8","#ff8ee4","#8bdfff","#ffffff"][i%4], 26+Math.random()*18, .85);
    }
    if (particles.length > 170) particles.splice(0, particles.length - 170);
  }


  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menuTab = "settings";
    if (state === "playing") pauseStarted = nowSec();
  }

  function closeMenu() {
    if (!menuOpen) return;
    if (state === "playing" && pauseStarted > 0) {
      stageStart += nowSec() - pauseStarted;
    }
    menuOpen = false;
    pauseStarted = 0;
  }

  function menuButton(id, x, y, w, h, label, fill="#16162c") {
    const rect = {id, x, y, w, h};
    menuButtons.push(rect);
    const hovered = inRect(mouse, rect);
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = hovered ? "rgba(255,240,168,.95)" : "rgba(255,255,255,.82)";
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.shadowColor = hovered ? "rgba(255,220,120,.85)" : "transparent";
    ctx.shadowBlur = hovered ? 18 : 0;
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    if (hovered) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#fff0a8";
      roundRect(x, y, w, h, 14);
      ctx.fill();
    }
    ctx.restore();
    drawText(label, x + w/2, y + h/2, hovered ? 22 : 21, hovered ? "#fff0a8" : "#fff", "center", true);
  }

  function menuRect() {
    // 온라인 로비에서는 큰 로비 UI와 겹치지 않도록 오른쪽 바깥 여백에 배치
    if (state === "onlineLobby") return { x: 1168, y: 666, w: 96, h: 42 };
    return { x: 1158, y: 654, w: 104, h: 48 };
  }

  function drawMenuIcon() {
    if (state === "loading" || state === "intro") return;
    const { x, y, w, h } = menuRect();
    const onlineActive = (gameMode === "online" || role === "host" || role === "guest") && (state === "playing" || state === "onlineCountdown");
    const label = onlineActive ? "LOBBY" : "MENU";
    ctx.save();
    const hovered = inRect(mouse, {x,y,w,h});
    ctx.fillStyle = "rgba(0,0,0,.58)";
    ctx.strokeStyle = hovered ? "rgba(255,240,168,.95)" : "rgba(255,255,255,.8)";
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.shadowColor = hovered ? "rgba(255,220,120,.75)" : "transparent";
    ctx.shadowBlur = hovered ? 14 : 0;
    roundRect(x, y, w, h, 15);
    ctx.fill();
    ctx.stroke();
    if (hovered) {
      ctx.globalAlpha = .20;
      ctx.fillStyle = "#fff0a8";
      roundRect(x, y, w, h, 15);
      ctx.fill();
    }
    ctx.restore();
    drawText(label, x + w/2, y + h/2, label === "LOBBY" ? 18 : 20, "#fff0a8", "center", true);
  }

  function drawMenuOverlay() {
    menuButtons = [];
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.68)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const panelX = 80;
    const panelW = 1120;
    drawPanel(panelX, 70, panelW, 600);
    drawText(state === "playing" ? "PAUSE / 설정" : "설정", W/2, 135, 44, "#fff");
    drawText("ESC 또는 MENU : 닫기", W/2, 176, 22, "#fff0a8");

    if (menuTab === "help") {
      drawText("게임 설명", W/2, 225, 32, "#bfe8ff");
      const lines = [
        "목표: 제한시간 안에 상대보다 동전을 많이 꼽으면 승리합니다.",
        `${keyLabel(keyConfig.hit)}: 동꼽 / ${keyLabel(keyConfig.star)}: ${STAR_SKILL_NAME} 활성 중 1회 입력 / ${keyLabel(keyConfig.auto)}: ${AUTO_SKILL_NAME} 사용`,
        `꾹누르기 자동연타는 무효이며, 순수 키 입력만 연타로 인정됩니다.`,
        `별풍선: ${keyLabel(keyConfig.hit)} 순수 연타 660CPM 이상 5초 유지 → 10초 발동, 7~10스테이지 후반 보정 강화`,
        `${AUTO_SKILL_NAME}: 1000CPM 3초 유지 시 획득, 사용하면 13초간 자동 +300CPM`,
        "싱글 AI 대전은 플레이어가 400점 이상 앞서면 AI가 추격 모드로 들어갑니다.",
        "5스테이지는 3회 실패하면 자동으로 초기화면으로 돌아갑니다."
      ];
      let y = 275;
      for (const line of lines) {
        drawText(line, W/2, y, 19, "#fff", "center", true);
        y += 33;
      }
      menuButton("settings", 450, 560, 180, 50, "설정으로");
      menuButton("resume", 660, 560, 180, 50, "계속하기");
      return;
    }

    if (menuTab === "keys") {
      drawText("키 설정 변경", W/2, 225, 32, "#bfe8ff");
      drawText(waitingKeyAction ? "원하는 새 키를 누르세요. ESC / ENTER는 취소입니다." : "바꿀 항목을 선택하거나 기본값으로 초기화하세요.", W/2, 268, 20, "#fff0a8");
      const keyRows = [
        ["setHitKey", "동꼽 키", keyConfig.hit],
        ["setStarKey", "별풍선 키", keyConfig.star],
        ["setAutoKey", `${AUTO_SKILL_NAME} 키`, keyConfig.auto],
      ];
      let y = 308;
      for (const [id, label, key] of keyRows) {
        drawText(`${label}: ${keyLabel(key)}`, 470, y+17, 24, "#fff", "center", true);
        menuButton(id, 685, y-10, 210, 50, "변경");
        y += 64;
      }
      menuButton("resetKeys", 520, 500, 240, 44, "키 설정 초기화", "#27334f");
      menuButton("settings", 450, 560, 180, 50, "설정으로");
      menuButton("resume", 660, 560, 180, 50, "계속하기");
      return;
    }

    drawText(`BGM 볼륨 ${bgmMuted ? "음소거" : (bgmVolume*100).toFixed(0) + "%"}`, W/2, 232, 27, "#fff");
    menuButton("bgmDown", 360, 265, 120, 44, "BGM -");
    menuButton("bgmUp", 800, 265, 120, 44, "BGM +");
    drawVolumeBar(525, 277, 230, 22, bgmMuted ? 0 : bgmVolume, "#8bdfff", "bgm");
    menuButton("bgmMute", 540, 314, 200, 42, bgmMuted ? "BGM 음소거 해제" : "BGM 음소거");

    drawText(`효과음 볼륨 ${sfxMuted ? "음소거" : (sfxVolume*100).toFixed(0) + "%"}`, W/2, 391, 27, "#fff");
    menuButton("sfxDown", 360, 424, 120, 44, "효과음 -");
    menuButton("sfxUp", 800, 424, 120, 44, "효과음 +");
    drawVolumeBar(525, 436, 230, 22, sfxMuted ? 0 : sfxVolume, "#ff8ee4", "sfx");
    menuButton("sfxMute", 540, 474, 200, 42, sfxMuted ? "효과음 음소거 해제" : "효과음 음소거");

    menuButton("keySettings", 175, 580, 155, 48, "키 설정");
    menuButton("help", 365, 580, 150, 48, "게임 설명");
    menuButton("fullscreen", 550, 580, 180, 48, "전체화면(F11)");
    menuButton("resume", 765, 580, 150, 48, "계속하기");
    menuButton("title", 950, 580, 155, 48, (gameMode === "online" && connected) ? "온라인 로비" : "초기화면");
  }

  function menuVolumeSliderRect(kind) {
    if (kind === "bgm") return { id: "bgmSlider", kind: "bgm", x: 525, y: 277, w: 230, h: 22, color: "#8bdfff", label: "BGM 볼륨" };
    return { id: "sfxSlider", kind: "sfx", x: 525, y: 436, w: 230, h: 22, color: "#ff8ee4", label: "효과음 볼륨" };
  }

  function menuVolumeHitRect(kind) {
    const r = menuVolumeSliderRect(kind);
    return { ...r, x: r.x - 18, y: r.y - 16, w: r.w + 36, h: r.h + 32 };
  }

  function hoveredMenuVolumeSlider(p=mouse) {
    if (!menuOpen || menuTab !== "settings") return null;
    if (inRect(p, menuVolumeHitRect("bgm"))) return "bgm";
    if (inRect(p, menuVolumeHitRect("sfx"))) return "sfx";
    return null;
  }

  function setMenuVolumeFromX(kind, x) {
    const r = menuVolumeSliderRect(kind);
    const value = Math.max(0, Math.min(1, (x - r.x) / r.w));
    if (kind === "bgm") {
      bgmVolume = value;
      bgmMuted = false;
    } else {
      sfxVolume = value;
      sfxMuted = false;
    }
    applyVolumes();
    saveSettings();
  }

  function drawVolumeBar(x, y, w, h, ratio, color, kind=null) {
    const v = Math.max(0, Math.min(1, Number(ratio) || 0));
    const fillW = w * v;
    const hovered = kind && (menuVolumeDragging === kind || hoveredMenuVolumeSlider() === kind);
    const hot = kind ? menuVolumeHitRect(kind) : { x, y, w, h };
    ctx.save();

    if (hovered) {
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      roundRect(hot.x, hot.y, hot.w, hot.h, 16);
      ctx.fill();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.15)";
    roundRect(x, y, w, h, 10);
    ctx.fill();

    // 0%일 때는 컬러 게이지를 아예 그리지 않아 왼쪽에서 뒤로 꺾여 보이는 잔상 버그를 방지합니다.
    if (fillW > 1) {
      ctx.shadowColor = color;
      ctx.shadowBlur = hovered ? 14 : 0;
      ctx.fillStyle = color;
      roundRect(x, y, fillW, h, Math.min(10, fillW / 2, h / 2));
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = hovered ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.65)";
    ctx.lineWidth = hovered ? 2.6 : 2;
    roundRect(x, y, w, h, 10);
    ctx.stroke();

    if (hovered) {
      const knobX = x + w * v;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(knobX, y + h / 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawText("DRAG", x + w + 48, y + h / 2, 13, color, "center", true);
    }
    ctx.restore();
  }


  function inRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }


  function loginButtonRect() {
    return { id: "loginMain", x: 1018, y: 28, w: 205, h: 46, color: currentUserId ? "#bfffe0" : "#ffd6ff", label: currentUserId ? `${currentNickname()}` : "로그인" };
  }

  function loginDropdownRect() {
    const r = loginButtonRect();
    return { id: "loginDrop", x: r.x, y: r.y + r.h + 6, w: r.w, h: currentUserId ? 188 : 62, color: r.color, label: "계정 메뉴" };
  }

  function loginWidgetOpen(p=mouse) {
    if (state !== "title") return false;
    return inRect(p, loginButtonRect()) || inRect(p, loginDropdownRect());
  }

  function accountActionRects() {
    const r = loginDropdownRect();
    if (currentUserId) {
      return [
        { id:"onlineCount", x:r.x+14, y:r.y+14, w:r.w-28, h:34, color:"#bfffe0", label:`현재접속자 : ${onlineCountLabel()}` },
        { id:"records", x:r.x+14, y:r.y+56, w:r.w-28, h:34, color:"#bfe8ff", label:"내 기록" },
        { id:"changeNickname", x:r.x+14, y:r.y+98, w:r.w-28, h:34, color:"#fff0a8", label:"닉네임 변경" },
        { id:"logout", x:r.x+14, y:r.y+140, w:r.w-28, h:34, color:"#ffd6ff", label:"로그아웃" },
      ];
    }
    return [
      { id:"googleLogin", x:r.x+14, y:r.y+14, w:r.w-28, h:34, color:"#bfe8ff", label:"로그인" },
    ];
  }

  function drawAccountWidget() {
    if (state !== "title") return;
    accountButtons = [];
    const r = loginButtonRect();
    const open = loginWidgetOpen();
    const hovered = inRect(mouse, r);
    ctx.save();
    ctx.fillStyle = hovered || open ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.46)";
    ctx.strokeStyle = hovered || open ? r.color : "rgba(255,255,255,.62)";
    ctx.lineWidth = hovered || open ? 2.8 : 1.6;
    ctx.shadowColor = hovered || open ? r.color : "transparent";
    ctx.shadowBlur = hovered || open ? 18 : 0;
    roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    drawText(currentUserId ? `👤 ${currentNickname()}` : "로그인", r.x + r.w/2, r.y + r.h/2, currentUserId ? 17 : 18, r.color, "center", true);

    if (open && currentUserId && remoteApiEnabled() && currentGoogleIdToken) {
      refreshOnlineCount(false);
    }

    if (open) {
      const d = loginDropdownRect();
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.70)";
      ctx.strokeStyle = "rgba(255,255,255,.70)";
      ctx.lineWidth = 2;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 18;
      roundRect(d.x, d.y, d.w, d.h, 18);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      for (const b of accountActionRects()) {
        accountButtons.push(b);
        const bh = inRect(mouse, b);
        ctx.save();
        ctx.fillStyle = bh ? "rgba(255,255,255,.18)" : "rgba(20,18,48,.82)";
        ctx.strokeStyle = bh ? b.color : "rgba(255,255,255,.55)";
        ctx.lineWidth = bh ? 2.6 : 1.5;
        ctx.shadowColor = bh ? b.color : "transparent";
        ctx.shadowBlur = bh ? 14 : 0;
        roundRect(b.x,b.y,b.w,b.h,12);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        drawText(b.label, b.x + b.w/2, b.y + b.h/2, b.id === "accountInfo" ? 13 : 16, b.color, "center", true);
      }
    }

    if (loginNoticeTimer > 0 && loginNotice) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.64)";
      ctx.strokeStyle = "rgba(255,240,168,.82)";
      ctx.lineWidth = 2;
      roundRect(350, 84, 580, 40, 16);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      drawText(loginNotice, W/2, 104, 17, "#fff0a8", "center", true);
    }
  }

  function handleAccountClick(p) {
    if (state !== "title") return false;
    if (!loginWidgetOpen(p)) return false;
    const action = accountActionRects().find(b => inRect(p, b));
    if (!action) return true;
    if (action.id === "googleLogin") showGoogleLoginPanel();
    else if (action.id === "onlineCount") {
      if (!remoteApiEnabled() || !currentGoogleIdToken) {
        setLoginNotice("현재접속자 표시는 Google 연동 로그인 후 가능");
      } else {
        setLoginNotice("현재접속자 갱신 중...");
        refreshOnlineCount(true).then(count => {
          setLoginNotice(`현재접속자 : ${count === null || count === undefined ? "-" : Math.max(0, Number(count) || 0)}명`);
        });
      }
    }
    else if (action.id === "create") promptCreateAccount();
    else if (action.id === "login") promptLoginAccount();
    else if (action.id === "changeNickname") promptChangeNickname();
    else if (action.id === "logout") logoutAccount();
    else if (action.id === "records") { recordsScroll = 0; setState("records"); }
    return true;
  }

  function titleStartRect() {
    return { id: "titleStart", x: 360, y: 560, w: 560, h: 132, color: "#fff0a8", label: "게임 시작" };
  }

  function modeOptionRects() {
    // v39: 이미지가 작게 깨져 보이지 않도록 카드와 이미지 영역을 확대하고,
    // 텍스트는 우측 정보 영역 안에서만 배치합니다.
    return [
      {
        id: "single", x: 88, y: 162, w: 500, h: 214, color: "#65b5ff", image: "modeSingle",
        label: "싱글 플레이 AI 대전", shortLabel: "AI 대전", key: "ENTER / SPACE",
        desc1: "1~5 스테이지", desc2: "혼자 즐기는 기본 모드"
      },
      {
        id: "online", x: 630, y: 162, w: 500, h: 214, color: "#ff7ad6", image: "modeOnline",
        label: "ONLINE 1:1 대전", shortLabel: "온라인 매치", key: "O",
        desc1: "1:1 로비 대전", desc2: "채팅 · READY"
      },
      {
        id: "competition", x: 88, y: 402, w: 500, h: 214, color: "#fff0a8", image: "modeCompetition",
        label: "사용자 경쟁전", shortLabel: "경쟁전", key: "C",
        desc1: "1~10 스테이지", desc2: "랭킹 기록 저장"
      },
      {
        id: "competitionRank", x: 630, y: 402, w: 500, h: 214, color: "#bfffe0", image: "modeRank",
        label: "사용자 온라인 경쟁전 순위 보기", shortLabel: "순위 보기", key: "R",
        desc1: "외부 경쟁전 순위", desc2: "1위~100위 확인"
      },
    ];
  }

  function adminStageRects() {
    const rects = [];
    const startX = 170, startY = 188, gapX = 28, gapY = 28, w = 170, h = 116;
    for (let i = 0; i < 10; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      rects.push({
        id: `adminStage${i + 1}`, stage: i + 1,
        x: startX + col * (w + gapX), y: startY + row * (h + gapY), w, h,
        color: i < 5 ? "#65b5ff" : "#fff0a8", label: `${i + 1}스테이지`
      });
    }
    return rects;
  }

  function adminStageBackRect() {
    return { id: "adminStageBack", x: 430, y: 595, w: 420, h: 54, color: "#bfe8ff", label: "모드 선택으로" };
  }

  function selectChoiceRects() {
    return [
      { id: "shuniChoice", char: 0, x: 342, y: 86, w: 314, h: 548, color: "#65b5ff", label: "슈니 선택" },
      { id: "dashibaChoice", char: 1, x: 650, y: 86, w: 314, h: 548, color: "#d79a55", label: "다시바 선택" },
    ];
  }

  function resultNextRect() {
    return { id: "resultNext", x: 420, y: 612, w: 440, h: 58, color: "#fff0a8", label: "다음 진행" };
  }

  function endingNextRect() {
    return { id: "endingNext", x: 405, y: 626, w: 470, h: 58, color: "#bfe8ff", label: "최종 결과" };
  }

  function finalNextRect() {
    return { id: "finalNext", x: 420, y: 580, w: 440, h: 58, color: "#bfe8ff", label: "초기화면" };
  }

  function introNextRect() {
    if (introIndex >= 5) {
      // 6번째 인트로는 이미지 하단의 "ENTER : 게임 타이틀" 영역 자체를 클릭 대상으로 사용합니다.
      return { id: "introTitle", x: 468, y: 646, w: 344, h: 50, color: "#8bdfff", label: "게임 타이틀" };
    }
    return { id: "introNext", x: 500, y: 518, w: 280, h: 48, color: "#fff0a8", label: "다음" };
  }

  function introSkipRect() {
    return { id: "introSkip", x: 1136, y: 646, w: 112, h: 48, color: "#fff0a8", label: "SKIP" };
  }

  function introVolumeIconRect() {
    return { id: "introVolumeIcon", x: 1160, y: 584, w: 50, h: 50, color: "#bfe8ff", label: "볼륨" };
  }

  function introVolumeRect() {
    return { id: "introVolume", x: 972, y: 582, w: 248, h: 56, color: "#bfe8ff", label: "볼륨" };
  }

  function introVolumeSliderRect() {
    return { id: "introVolumeSlider", x: 1038, y: 603, w: 135, h: 14, color: "#9cffb0", label: "볼륨" };
  }

  function introVolumeOpen(p=mouse) {
    return introVolumeDragging || inRect(p, introVolumeIconRect()) || inRect(p, introVolumeRect());
  }

  function fullscreenButtonRect() {
    if (state === "intro") {
      return { id: "fullscreenToggle", x: 18, y: 654, w: 154, h: 46, color: "#bfe8ff", label: document.fullscreenElement ? "전체화면 해제" : "전체화면" };
    }
    // 인트로 이후 화면에서는 우측 하단 BGM 볼륨 아이콘 위에 작은 아이콘으로 표시
    const mr = menuRect();
    return { id: "fullscreenToggle", x: mr.x + 28, y: mr.y - 118, w: 48, h: 48, color: "#bfe8ff", label: document.fullscreenElement ? "전체화면 해제" : "전체화면" };
  }

  function toggleFullscreen() {
    const target = document.documentElement;
    if (!document.fullscreenElement && target.requestFullscreen) target.requestFullscreen().catch(()=>{});
    else if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  }

  function drawGlobalFullscreenButton() {
    if (state === "loading" || menuOpen) return;
    const r = fullscreenButtonRect();
    const hovered = inRect(mouse, r);
    const label = document.fullscreenElement ? "전체화면 해제" : "전체화면";

    ctx.save();
    if (state === "intro") {
      ctx.fillStyle = hovered ? "rgba(139,223,255,.18)" : "rgba(0,0,0,.40)";
      ctx.strokeStyle = hovered ? "rgba(190,232,255,.96)" : "rgba(255,255,255,.55)";
      ctx.lineWidth = hovered ? 2.8 : 1.6;
      ctx.shadowColor = hovered ? "#8bdfff" : "transparent";
      ctx.shadowBlur = hovered ? 16 : 0;
      roundRect(r.x, r.y, r.w, r.h, 15);
      ctx.fill();
      ctx.stroke();
      if (hovered) {
        ctx.globalAlpha = .18;
        ctx.fillStyle = "#bfe8ff";
        roundRect(r.x, r.y, r.w, r.h, 15);
        ctx.fill();
      }
      ctx.restore();
      drawText(label, r.x + r.w / 2, r.y + r.h / 2, 19, hovered ? "#bfe8ff" : "#fff", "center", true);
      return;
    }

    // 작은 전체화면 아이콘 버튼
    ctx.fillStyle = hovered ? "rgba(190,232,255,.22)" : "rgba(0,0,0,.46)";
    ctx.strokeStyle = hovered ? "rgba(190,232,255,.98)" : "rgba(255,255,255,.55)";
    ctx.lineWidth = hovered ? 2.4 : 1.4;
    ctx.shadowColor = hovered ? "#8bdfff" : "transparent";
    ctx.shadowBlur = hovered ? 16 : 0;
    roundRect(r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.stroke();

    if (assets.fullscreenIcon) {
      ctx.globalAlpha = hovered ? 1 : .88;
      ctx.drawImage(assets.fullscreenIcon, r.x + 9, r.y + 9, r.w - 18, r.h - 18);
      ctx.globalAlpha = 1;
    } else {
      drawText("⛶", r.x + r.w / 2, r.y + r.h / 2, 28, "#ffffff", "center", true);
    }

    if (hovered) {
      const bx = Math.max(14, r.x - 190);
      const by = r.y + 4;
      const bw = 180;
      const bh = 40;
      ctx.fillStyle = "rgba(0,0,0,.58)";
      ctx.strokeStyle = "rgba(190,232,255,.90)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#8bdfff";
      ctx.shadowBlur = 12;
      roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = .16;
      ctx.fillStyle = "#bfe8ff";
      roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      drawText(label, bx + bw / 2, by + bh / 2, 18, "#e8fbff", "center", true);
      return;
    }
    ctx.restore();
  }

  function floatingBgmIconRect() {
    const mr = menuRect();
    return { id: "floatingBgmIcon", x: mr.x + 24, y: mr.y - 62, w: 56, h: 50, color: "#9cffb0", label: "BGM 볼륨" };
  }

  function floatingBgmPanelRect() {
    const icon = floatingBgmIconRect();
    return { id: "floatingBgmPanel", x: icon.x - 236, y: icon.y - 2, w: 296, h: 54, color: "#9cffb0", label: "BGM 볼륨" };
  }

  function floatingBgmSliderRect() {
    const panel = floatingBgmPanelRect();
    return { id: "floatingBgmSlider", x: panel.x + 62, y: panel.y + 20, w: 165, h: 14, color: "#9cffb0", label: "BGM 볼륨" };
  }

  function floatingBgmSliderHitRect() {
    const r = floatingBgmSliderRect();
    return { ...r, x: r.x - 12, y: r.y - 14, w: r.w + 24, h: r.h + 28 };
  }

  function floatingBgmVisibleInState() {
    return !menuOpen && (state === "title" || state === "select" || state === "mode" || state === "playing" || state === "stageCountdown" || state === "onlineCountdown");
  }

  function floatingBgmOpen(p=mouse) {
    if (!floatingBgmVisibleInState()) return false;
    return floatingBgmDragging || inRect(p, floatingBgmIconRect()) || inRect(p, floatingBgmPanelRect());
  }

  function setFloatingBgmVolumeFromX(x) {
    const r = floatingBgmSliderRect();
    bgmVolume = Math.max(0, Math.min(1, (x - r.x) / r.w));
    bgmMuted = false;
    applyVolumes();
    saveSettings();
  }

  function drawFloatingBgmVolumeControl() {
    if (!floatingBgmVisibleInState()) return;
    const icon = floatingBgmIconRect();
    const panel = floatingBgmPanelRect();
    const slider = floatingBgmSliderRect();
    const open = floatingBgmOpen();
    const hoveredIcon = inRect(mouse, icon);

    ctx.save();
    if (open) {
      ctx.fillStyle = "rgba(0,0,0,.52)";
      ctx.strokeStyle = "rgba(156,255,176,.92)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#9cffb0";
      ctx.shadowBlur = 15;
      roundRect(panel.x, panel.y, panel.w, panel.h, 18);
      ctx.fill();
      ctx.stroke();

      if (assets.volumeIcon) ctx.drawImage(assets.volumeIcon, panel.x + 12, panel.y + 8, 38, 38);
      else drawText("🔊", panel.x + 32, panel.y + 27, 22, "#fff", "center", false);

      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.17)";
      roundRect(slider.x, slider.y, slider.w, slider.h, 7);
      ctx.fill();
      const fillW = slider.w * bgmEffectiveVolume();
      if (fillW > 1) {
        ctx.shadowColor = "#9cffb0";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#9cffb0";
        roundRect(slider.x, slider.y, Math.max(slider.h, fillW), slider.h, 7);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,255,255,.72)";
      ctx.lineWidth = 2;
      roundRect(slider.x, slider.y, slider.w, slider.h, 7);
      ctx.stroke();
      const knobX = slider.x + slider.w * bgmEffectiveVolume();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#9cffb0";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#9cffb0";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(knobX, slider.y + slider.h / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawText(`${Math.round(bgmEffectiveVolume() * 100)}%`, panel.x + panel.w - 28, panel.y + panel.h / 2, 16, "#fff0a8", "center", true);
    } else {
      ctx.fillStyle = hoveredIcon ? "rgba(156,255,176,.18)" : "rgba(0,0,0,.42)";
      ctx.strokeStyle = hoveredIcon ? "rgba(156,255,176,.95)" : "rgba(255,255,255,.55)";
      ctx.lineWidth = hoveredIcon ? 2.6 : 1.5;
      ctx.shadowColor = hoveredIcon ? "#9cffb0" : "transparent";
      ctx.shadowBlur = hoveredIcon ? 14 : 0;
      roundRect(icon.x, icon.y, icon.w, icon.h, 16);
      ctx.fill();
      ctx.stroke();
      if (assets.volumeIcon) ctx.drawImage(assets.volumeIcon, icon.x + 10, icon.y + 7, 36, 36);
      else drawText("🔊", icon.x + icon.w/2, icon.y + icon.h/2, 24, "#fff", "center", false);
    }
    ctx.restore();
  }

  function setIntroVolumeFromX(x) {
    const r = introVolumeSliderRect();
    bgmVolume = Math.max(0, Math.min(1, (x - r.x) / r.w));
    bgmMuted = false;
    applyVolumes();
    saveSettings();
  }

  function goTitleFromIntro() {
    introVolumeDragging = false;
    introFlash = 0;
    setState("title");
  }

  function nextIntroScene() {
    ensureIntroBgmPlaying(false);
    playSfx("select", .8);
    if (introIndex < 5) {
      introIndex++;
      introFlash = 0.58;
    } else {
      goTitleFromIntro();
    }
  }

  function drawIntroVfx() {
    const t = nowSec();
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const x = 45 + ((i * 83 + t * 24) % 1190);
      const y = 45 + ((i * 47 + t * 18) % 620);
      ctx.globalAlpha = 0.18 + 0.18 * Math.sin(t * 2.2 + i);
      ctx.fillStyle = ["#fff0a8", "#8bdfff", "#ff8ee4", "#ffffff"][i % 4];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      drawStar(x, y, 4 + (i % 4) * 1.4, t * 35 + i * 22);
    }
    for (let i = 0; i < 8; i++) {
      const x = 80 + i * 150 + Math.sin(t * .9 + i) * 18;
      const y = 110 + ((t * 35 + i * 67) % 500);
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 1.8 + i);
      ctx.strokeStyle = i % 2 ? "#ff8ee4" : "#8bdfff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 10 + (i % 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawIntroControls() {
    const next = introNextRect();
    const skip = introSkipRect();
    const icon = introVolumeIconRect();
    const vol = introVolumeRect();
    const slider = introVolumeSliderRect();
    const volOpen = introVolumeOpen();

    if (introIndex >= 5) {
      if (inRect(mouse, next)) {
        drawHoverSelectBox(next, 0.16);
        drawSmallVfxAroundRect(next, "#8bdfff");
      }
    } else {
      if (inRect(mouse, next)) drawHoverSelectBox(next, 0.18);
      // 다음 버튼: 스토리 하단 자막과 겹치지 않도록 화면 중앙 하단 위쪽에 배치
      ctx.save();
      ctx.fillStyle = inRect(mouse, next) ? "rgba(255,240,168,.18)" : "rgba(0,0,0,.36)";
      ctx.strokeStyle = inRect(mouse, next) ? "rgba(255,240,168,.95)" : "rgba(255,255,255,.50)";
      ctx.lineWidth = inRect(mouse, next) ? 2.8 : 1.6;
      ctx.shadowColor = inRect(mouse, next) ? "#fff0a8" : "transparent";
      ctx.shadowBlur = inRect(mouse, next) ? 18 : 0;
      roundRect(next.x, next.y, next.w, next.h, 18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawText("CLICK : 다음", next.x + next.w/2, next.y + next.h/2, 22, "#fff0a8", "center", true);
    }
    if (inRect(mouse, skip)) drawHoverSelectBox(skip, 0.18);

    // SKIP 버튼
    ctx.save();
    ctx.fillStyle = inRect(mouse, skip) ? "rgba(255,240,168,.18)" : "rgba(0,0,0,.42)";
    ctx.strokeStyle = inRect(mouse, skip) ? "rgba(255,240,168,.95)" : "rgba(255,255,255,.55)";
    ctx.lineWidth = inRect(mouse, skip) ? 2.8 : 1.5;
    roundRect(skip.x, skip.y, skip.w, skip.h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawText("SKIP", skip.x + skip.w/2, skip.y + skip.h/2, 21, inRect(mouse, skip) ? "#fff0a8" : "#fff", "center", true);

    // 볼륨: 평소에는 아이콘만 표시, 마우스를 올리면 슬라이더가 펼쳐짐
    ctx.save();
    if (volOpen) {
      ctx.fillStyle = "rgba(0,0,0,.50)";
      ctx.strokeStyle = "rgba(190,232,255,.92)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#8bdfff";
      ctx.shadowBlur = 16;
      roundRect(vol.x, vol.y, vol.w, vol.h, 18);
      ctx.fill();
      ctx.stroke();

      if (assets.volumeIcon) ctx.drawImage(assets.volumeIcon, vol.x + 10, vol.y + 8, 38, 38);
      else drawText("🔊", vol.x + 29, vol.y + 28, 23, "#fff", "center", false);

      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.18)";
      roundRect(slider.x, slider.y, slider.w, slider.h, 7);
      ctx.fill();
      const vw = slider.w * bgmEffectiveVolume();
      if (vw > 1) {
        ctx.shadowColor = "#9cffb0";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#9cffb0";
        roundRect(slider.x, slider.y, Math.max(slider.h, vw), slider.h, 7);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,255,255,.70)";
      ctx.lineWidth = 2;
      roundRect(slider.x, slider.y, slider.w, slider.h, 7);
      ctx.stroke();
      const knobX = slider.x + slider.w * bgmEffectiveVolume();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(knobX, slider.y + slider.h / 2, 9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(0,0,0,.42)";
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1.5;
      roundRect(icon.x, icon.y, icon.w, icon.h, 16);
      ctx.fill();
      ctx.stroke();
      if (assets.volumeIcon) ctx.drawImage(assets.volumeIcon, icon.x + 7, icon.y + 7, 36, 36);
      else drawText("🔊", icon.x + icon.w/2, icon.y + icon.h/2, 24, "#fff", "center", false);
    }
    ctx.restore();
  }

  function drawModeCard(card) {
    const hovered = inRect(mouse, card);
    const t = nowSec();
    const pop = hovered ? 1.018 + Math.sin(t * 7) * 0.004 : 1;
    const baseDy = hovered ? -6 : 0;
    const cx = card.x + card.w / 2;
    const cy = card.y + card.h / 2 + baseDy;
    const x = cx - (card.w * pop) / 2;
    const y = cy - (card.h * pop) / 2;
    const w = card.w * pop;
    const h = card.h * pop;
    const glow = hovered ? 30 + Math.sin(t * 8) * 7 : 12;

    // 카드 배경: 큰 이미지 영역 + 오른쪽 정보 패널.
    ctx.save();
    ctx.shadowColor = card.color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = hovered ? "rgba(10,10,32,.82)" : "rgba(0,0,0,.64)";
    ctx.strokeStyle = hovered ? card.color : "rgba(255,255,255,.64)";
    ctx.lineWidth = hovered ? 3.2 : 2;
    roundRect(x, y, w, h, 25);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const pad = 12 * pop;
    const imgBox = { x: x + pad, y: y + pad, w: 308 * pop, h: h - pad * 2 };
    const infoBox = { x: imgBox.x + imgBox.w + 14 * pop, y: y + 20 * pop, w: w - imgBox.w - pad * 2 - 14 * pop, h: h - 40 * pop };

    ctx.save();
    ctx.shadowColor = hovered ? card.color : "rgba(0,0,0,.75)";
    ctx.shadowBlur = hovered ? 18 : 8;
    ctx.fillStyle = "rgba(0,0,0,.56)";
    ctx.strokeStyle = hovered ? card.color : "rgba(255,255,255,.46)";
    ctx.lineWidth = hovered ? 2.4 : 1.4;
    roundRect(imgBox.x, imgBox.y, imgBox.w, imgBox.h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    roundRect(imgBox.x + 3, imgBox.y + 3, imgBox.w - 6, imgBox.h - 6, 16);
    ctx.clip();
    drawImageCover(assets[card.image], imgBox.x + 3, imgBox.y + 3, imgBox.w - 6, imgBox.h - 6);
    if (hovered) {
      const grad = ctx.createLinearGradient(imgBox.x, imgBox.y, imgBox.x + imgBox.w, imgBox.y + imgBox.h);
      grad.addColorStop(0, "rgba(255,255,255,.04)");
      grad.addColorStop(.48, "rgba(255,255,255,.18)");
      grad.addColorStop(1, "rgba(255,255,255,.03)");
      ctx.fillStyle = grad;
      ctx.fillRect(imgBox.x + 3, imgBox.y + 3, imgBox.w - 6, imgBox.h - 6);
    }
    ctx.restore();

    if (hovered) {
      drawSmallVfxAroundRect({ x, y, w, h }, card.color);
      drawHoverSelectBox({ x, y, w, h, color: card.color }, 0.10);
    }

    // 정보 패널은 이미지와 겹치지 않도록 우측에만 표시합니다.
    ctx.save();
    ctx.fillStyle = hovered ? "rgba(0,0,0,.50)" : "rgba(0,0,0,.36)";
    ctx.strokeStyle = "rgba(255,255,255,.20)";
    ctx.lineWidth = 1;
    roundRect(infoBox.x, infoBox.y, infoBox.w, infoBox.h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const tx = infoBox.x + infoBox.w / 2;
    drawText(card.shortLabel, tx, infoBox.y + 32 * pop, card.id === "competitionRank" ? 21 : 24, card.color, "center", true);
    drawText(card.desc1, tx, infoBox.y + 73 * pop, 18, "#ffffff", "center", true);
    drawText(card.desc2, tx, infoBox.y + 105 * pop, 16, "#fff0a8", "center", true);

    ctx.save();
    const keyW = card.key.length > 3 ? 152 * pop : 116 * pop;
    const keyH = 34 * pop;
    const keyX = tx - keyW / 2;
    const keyY = infoBox.y + infoBox.h - keyH - 12 * pop;
    ctx.fillStyle = hovered ? "rgba(255,255,255,.20)" : "rgba(0,0,0,.48)";
    ctx.strokeStyle = hovered ? card.color : "rgba(255,255,255,.55)";
    ctx.lineWidth = hovered ? 2.2 : 1.4;
    roundRect(keyX, keyY, keyW, keyH, keyH / 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawText(card.key, tx, infoBox.y + infoBox.h - 29 * pop, card.key.length > 3 ? 13 : 18, "#fff0a8", "center", true);
  }


  function drawModeHeaderBadge() {
    const t = nowSec();
    const titleY = 82;
    ctx.save();
    ctx.shadowColor = '#b48cff';
    ctx.shadowBlur = 18 + Math.sin(t * 3) * 4;
    drawText('동꼽즈 게임 모드', W/2, titleY, 43, '#ffffff', 'center', true);
    ctx.restore();

    const name = chars[selectedChar].name;
    const pillW = Math.max(360, 238 + name.length * 28);
    const pillH = 38;
    const pillX = W/2 - pillW/2;
    const pillY = 112;
    const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    grad.addColorStop(0, 'rgba(90,180,255,.20)');
    grad.addColorStop(.5, 'rgba(255,255,255,.10)');
    grad.addColorStop(1, 'rgba(255,110,215,.22)');
    ctx.save();
    ctx.shadowColor = selectedChar === 0 ? '#63b8ff' : '#ff7ad6';
    ctx.shadowBlur = 16;
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,.48)';
    ctx.lineWidth = 1.6;
    roundRect(pillX, pillY, pillW, pillH, 19);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawText('선택 캐릭터', W/2 - 46, pillY + pillH/2, 19, '#fff0a8', 'right', true);
    drawText('·', W/2 - 30, pillY + pillH/2, 20, 'rgba(255,255,255,.9)', 'center', true);
    const charColor = selectedChar === 0 ? '#86d9ff' : '#ff9add';
    ctx.save();
    ctx.shadowColor = charColor;
    ctx.shadowBlur = 12;
    drawText(name, W/2 - 13, pillY + pillH/2, 24, charColor, 'left', true);
    ctx.restore();
  }

  function drawModeMenuUI() {
    drawImageCover(assets.bg,0,0,W,H);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.fillRect(0,0,W,H);
    ctx.restore();

    drawPanel(48, 50, 1100, 620);
    drawModeHeaderBadge();

    const cards = modeOptionRects();
    for (const card of cards) drawModeCard(card);

    const hovered = cards.find(r => inRect(mouse, r));
    if (hovered) {
      titleClickFlashX = hovered.x + hovered.w / 2;
      titleClickFlashY = hovered.y + hovered.h / 2;
      titleClickFlashColor = hovered.color;
    }

    drawText("마우스로 카드 선택 또는 단축키 입력", W/2, 646, 18, "#bfe8ff");
    if (loginNoticeTimer > 0 && loginNotice) drawText(loginNotice, W/2, 678, 16, "#ffb0b0");
  }

  function drawAdminStageSelect() {
    drawImageCover(assets.bg, 0, 0, W, H);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.54)";
    ctx.fillRect(0,0,W,H);
    ctx.restore();

    drawPanel(70, 58, 1140, 604);
    drawText(adminReleaseTestMode ? "관리자 동꼽 해방 테스트" : "관리자 밸런스 테스트", W/2, 105, 42, "#fff0a8");
    drawText(adminReleaseTestMode ? "7~10스테이지 시작 시 MAX 코인 자동 충전 · 기록/랭킹 저장 없음" : "1~10스테이지를 바로 시작합니다 · 기록/랭킹 저장 없음", W/2, 145, 21, "#bfe8ff");
    drawText(`테스트 캐릭터: ${chars[selectedChar].name} / AI: ${chars[1-selectedChar].name}`, W/2, 171, 18, "#ffffff");

    for (const r of adminStageRects()) {
      const st = STAGES[r.stage - 1];
      const hovered = inRect(mouse, r);
      const pulse = hovered ? 1.02 + Math.sin(nowSec()*8)*0.006 : 1;
      const cx = r.x + r.w/2, cy = r.y + r.h/2;
      const x = cx - r.w*pulse/2, y = cy - r.h*pulse/2, w = r.w*pulse, h = r.h*pulse;
      ctx.save();
      ctx.shadowColor = r.color;
      ctx.shadowBlur = hovered ? 26 : 10;
      ctx.fillStyle = hovered ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.58)";
      ctx.strokeStyle = hovered ? r.color : "rgba(255,255,255,.60)";
      ctx.lineWidth = hovered ? 3 : 1.8;
      roundRect(x, y, w, h, 22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (hovered) {
        drawHoverSelectBox({ x, y, w, h, color: r.color }, 0.12);
        drawSmallVfxAroundRect({ x, y, w, h }, r.color);
      }
      drawText(`${st.no} STAGE`, cx, y + 28, 22, r.color, "center", true);
      drawText(st.rank, cx, y + 60, 18, "#ffffff", "center", true);
      drawText(`AI ${st.ai} CPM`, cx, y + 88, 16, "#fff0a8", "center", true);
    }

    const br = adminStageBackRect();
    const backHover = inRect(mouse, br);
    if (backHover) {
      drawHoverSelectBox(br, 0.16);
      drawSmallVfxAroundRect(br, br.color);
    }
    ctx.save();
    ctx.fillStyle = backHover ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.55)";
    ctx.strokeStyle = backHover ? br.color : "rgba(255,255,255,.65)";
    ctx.lineWidth = 2;
    roundRect(br.x, br.y, br.w, br.h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawText("ESC / CLICK : 모드 선택으로", br.x + br.w/2, br.y + br.h/2, 22, "#bfe8ff", "center", true);

    drawText(adminReleaseTestMode ? "키보드: 7~9, 0=10스테이지 권장 · 동꼽 자동사냥 MAX 자동 지급" : "키보드: 1~9, 0=10스테이지 바로 시작", W/2, 570, 18, "#ffffff", "center", true);
    if (adminStageNoticeTimer > 0 && adminStageNotice) drawText(adminStageNotice, W/2, 680, 18, "#fff0a8", "center", true);
  }

  function drawIntroScreen() {
    drawImageCover(assets[`intro${introIndex + 1}`] || assets.bg, 0, 0, W, H);
    drawIntroVfx();
    drawIntroControls();
    if (introFlash > 0) {
      const a = Math.min(.92, introFlash / .58);
      ctx.save();
      ctx.globalAlpha = a * .86;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function drawHoverSelectBox(r, alpha=0.22) {
    const t = nowSec();
    const pulse = alpha + 0.06 * Math.sin(t * 6);
    ctx.save();
    ctx.globalAlpha = Math.max(0.12, pulse);
    ctx.fillStyle = r.color || "#ffffff";
    ctx.shadowColor = r.color || "#ffffff";
    ctx.shadowBlur = 26;
    roundRect(r.x, r.y, r.w, r.h, 18);
    ctx.fill();
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = r.color || "#ffffff";
    ctx.lineWidth = 3;
    roundRect(r.x, r.y, r.w, r.h, 18);
    ctx.stroke();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 1.5;
    roundRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14, 14);
    ctx.stroke();
    ctx.restore();
  }

  function drawSmallVfxAroundRect(r, color) {
    const t = nowSec();
    ctx.save();
    for (let i=0; i<8; i++) {
      const px = r.x + 18 + ((t * 42 + i * 71) % Math.max(20, r.w - 36));
      const py = r.y + 18 + ((i * 59 + Math.sin(t * 1.7 + i) * 18) % Math.max(20, r.h - 36));
      ctx.globalAlpha = 0.42 + 0.22 * Math.sin(t * 3 + i);
      ctx.fillStyle = [color, "#ffffff", "#fff0a8"][i % 3];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      drawStar(px, py, 4 + (i % 3) * 1.8, t * 65 + i * 27);
    }
    ctx.restore();
  }

  function currentSelectVisualChar() {
    if (state !== "select") return selectedChar;
    const h = selectChoiceRects().find(r => inRect(mouse, r));
    return h ? h.char : selectedChar;
  }

  function drawSelectPopout() {
    const idx = currentSelectVisualChar();
    const r = selectChoiceRects()[idx];
    const key = idx === 0 ? "shuniSelect" : "dashibaSelect";
    const img = assets[key];
    if (!r) return;

    const popX = r.x - 10;
    const popY = r.y - 12;
    const popW = r.w + 20;
    const popH = r.h + 20;
    const popRadius = 30;

    ctx.save();
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 24;
    ctx.globalAlpha = 0.90;
    // 선택 캐릭터만 카드 위치에서 살짝 확대되어 튀어나오는 느낌.
    drawImageCoverRounded(img, popX, popY, popW, popH, popRadius);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 18;
    roundRect(popX, popY, popW, popH, popRadius);
    ctx.stroke();
    ctx.restore();

    drawHoverSelectBox(r, 0.16);
    drawSmallVfxAroundRect(r, r.color);
    drawText(idx === 0 ? "슈니 선택" : "다시바 선택", r.x + r.w/2, r.y + 28, 20, r.color, "center", true);
  }

  function hoveredInteractiveRect() {
    const mr = menuRect();
    if (menuOpen) {
      const b = menuButtons.find(v => inRect(mouse, v));
      if (b) return { ...b, color: "#fff0a8" };
      const sliderKind = hoveredMenuVolumeSlider();
      if (sliderKind) {
        const r = menuVolumeHitRect(sliderKind);
        return { ...r, color: r.color, label: sliderKind === "bgm" ? "BGM 볼륨 조절" : "효과음 볼륨 조절" };
      }
      return null;
    }
    if (state === "intro") {
      if (inRect(mouse, introSkipRect())) return introSkipRect();
      if (introVolumeOpen()) return introVolumeIconRect();
      if (inRect(mouse, introNextRect())) return introNextRect();
      if (inRect(mouse, fullscreenButtonRect())) return fullscreenButtonRect();
      return null;
    }
    if (floatingBgmOpen()) return floatingBgmIconRect();
    if (inRect(mouse, fullscreenButtonRect())) return fullscreenButtonRect();
    if (state === "title") {
      const sr = titleStartRect();
      if (inRect(mouse, sr)) return sr;
      return getTitleHotspot(mouse);
    }
    if (state === "select") return selectChoiceRects().find(r => inRect(mouse, r)) || null;
    if (state === "mode") return modeOptionRects().find(r => inRect(mouse, r)) || null;
    if (state === "adminStageSelect") return adminStageRects().find(r => inRect(mouse, r)) || (inRect(mouse, adminStageBackRect()) ? adminStageBackRect() : null);
    if (state === "result") return inRect(mouse, resultNextRect()) ? resultNextRect() : null;
    if (state === "ending") return inRect(mouse, endingNextRect()) ? endingNextRect() : null;
    if (state === "final") {
      if (gameMode === "competition" && inRect(mouse, competitionRefreshRect())) return competitionRefreshRect();
      return inRect(mouse, finalNextRect()) ? finalNextRect() : null;
    }
    if (state === "records") return inRect(mouse, recordsBackRect()) ? recordsBackRect() : null;
    if (state === "onlineLobby") {
      const b = onlineLobbyButtons.find(v => !v.disabled && inRect(mouse, v));
      if (b) return { ...b, color: "#fff0a8" };
    }
    if (!menuOpen && mouse.x >= mr.x && mouse.x <= mr.x + mr.w && mouse.y >= mr.y && mouse.y <= mr.y + mr.h) {
      return { ...mr, color: "#fff0a8", label: "MENU" };
    }
    return null;
  }

  function titleHotspots() {
    return [
      {
        id: "shuni",
        label: "슈니 SOOP",
        url: "https://www.sooplive.com/station/k4187421",
        x: 275, y: 135, w: 390, h: 475,
        color: "#77c8ff"
      },
      {
        id: "dashiba",
        label: "다시바 SOOP",
        url: "https://www.sooplive.com/station/tdnlamuron",
        x: 655, y: 50, w: 420, h: 560,
        color: "#ff8ed8"
      },
      {
        id: "bubblelan",
        label: "버블란 카페",
        url: "https://cafe.naver.com/turzuran",
        x: 0, y: 565, w: 145, h: 155,
        color: "#fff0a8"
      }
    ];
  }

  function getTitleHotspot(pt) {
    if (state !== "title") return null;
    if (inRect(pt, titleStartRect())) return null;
    // 겹치는 영역에서는 캐릭터 우선순위가 더 자연스럽게 동작하도록 처리
    const links = titleHotspots();
    for (const id of ["dashiba", "shuni", "bubblelan"]) {
      const h = links.find(v => v.id === id);
      if (h && inRect(pt, h)) return h;
    }
    return null;
  }

  function openTitleLink(h) {
    if (!h) return;
    titleClickFlash = 0.42;
    titleClickFlashColor = h.color;
    titleClickFlashX = h.x + h.w / 2;
    titleClickFlashY = h.y + h.h / 2;
    playSfx("select");
    addText(titleClickFlashX, Math.max(80, h.y + 35), h.label, h.color, 30, .8);
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 250;
      particles.push({
        kind: i % 3 === 0 ? "spark" : "star",
        x: titleClickFlashX + (Math.random() - .5) * h.w * .4,
        y: titleClickFlashY + (Math.random() - .5) * h.h * .25,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: .65 + Math.random() * .25,
        maxLife: .9,
        r: 8 + Math.random() * 12,
        color: [h.color, "#ffffff", "#fff0a8"][i % 3],
        rot: Math.random() * 360
      });
    }
    if (particles.length > 120) particles.splice(0, particles.length - 120);
    const opened = window.open(h.url, "_blank");
    if (opened) { try { opened.opener = null; } catch (_) {} }
    else addText(W/2, 95, "팝업이 차단되면 브라우저에서 팝업 허용을 눌러주세요", "#fff0a8", 22, 1.6);
  }

  function drawTitleHoverVfx() {
    const h = getTitleHotspot(mouse);
    const t = nowSec();
    if (h) {
      ctx.save();
      const pulse = 0.28 + 0.08 * Math.sin(t * 5.5);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = h.color;
      ctx.shadowColor = h.color;
      ctx.shadowBlur = 26;
      roundRect(h.x, h.y, h.w, h.h, 34);
      ctx.fill();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 4;
      roundRect(h.x, h.y, h.w, h.h, 34);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 7; i++) {
        const px = h.x + 25 + ((t * 38 + i * 79) % Math.max(40, h.w - 50));
        const py = h.y + 30 + ((i * 67 + Math.sin(t + i) * 24) % Math.max(40, h.h - 60));
        ctx.fillStyle = i % 2 ? "#ffffff" : h.color;
        ctx.shadowBlur = 12;
        drawStar(px, py, 5 + (i % 3) * 2, t * 45 + i * 30);
      }
      drawText(h.label, h.x + h.w/2, h.y + 30, 21, h.color, "center", true);
      ctx.restore();
    }
    if (titleClickFlash > 0) {
      ctx.save();
      const a = Math.max(0, Math.min(1, titleClickFlash / .42));
      ctx.globalAlpha = a * .55;
      ctx.strokeStyle = titleClickFlashColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = titleClickFlashColor;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(titleClickFlashX, titleClickFlashY, 80 + (1-a) * 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a * .35;
      ctx.fillStyle = titleClickFlashColor;
      ctx.beginPath();
      ctx.arc(titleClickFlashX, titleClickFlashY, 40 + (1-a) * 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function sanitizePlayerName(name) {
    let v = String(name || "").replace(/\s+/g, " ").trim();
    if (!v) v = chars[selectedChar].name;
    const hasWide = /[^\x00-\x7F]/.test(v);
    const max = hasWide ? 12 : 18;
    return Array.from(v).slice(0, max).join("");
  }

  function getLocalName() {
    return sanitizePlayerName(localPlayerName || currentNickname() || chars[selectedChar].name);
  }

  function ensureOnlinePlayers() {
    localPlayerName = getLocalName();
    if (!local) local = defaultPlayer(selectedChar, "left", localPlayerName);
    local.char = selectedChar;
    local.name = localPlayerName;
    if (!remote) remote = defaultPlayer(1 - selectedChar, "right", "상대");
  }

  function onlineBgmLabel() {
    const item = ONLINE_BGM_OPTIONS.find(o => o.key === onlineBgmKey) || ONLINE_BGM_OPTIONS.find(o => o.key === "stage1") || ONLINE_BGM_OPTIONS[0];
    return item.label;
  }

  function fitLobbyLabel(text, maxChars=16) {
    const arr = Array.from(String(text || ""));
    return arr.length > maxChars ? arr.slice(0, maxChars - 1).join("") + "…" : arr.join("");
  }

  function onlineChatDisplayRect() {
    return { x: 172, y: 368, w: 915, h: 96 };
  }

  function setOnlineReady(v, broadcast=true) {
    onlineLocalReady = !!v;
    if (local) local.name = getLocalName();
    if (broadcast) sendMsg({ type: "lobby_state", name: getLocalName(), char: selectedChar, ready: onlineLocalReady, duration: onlineDuration, bgm: onlineBgmKey });
    maybeStartOnlineCountdown();
  }

  function broadcastLobbyState() {
    sendMsg({ type: "lobby_state", name: getLocalName(), char: selectedChar, ready: onlineLocalReady, duration: onlineDuration, bgm: onlineBgmKey });
  }

  function pushChat(who, text, color="#fff") {
    const msg = String(text || "").trim();
    if (!msg) return;
    chatMessages.push({ who, text: Array.from(msg).slice(0, 80).join(""), color });
    if (chatMessages.length > 60) chatMessages.splice(0, chatMessages.length - 60);
    onlineChatScroll = Math.max(0, chatMessages.length - 4);
  }

  function sendChat() {
    const msg = chatInput.trim();
    if (!msg) return;
    pushChat(getLocalName(), msg, chars[selectedChar].accent);
    sendMsg({ type: "chat", name: getLocalName(), text: msg });
    chatInput = "";
    chatEditActive = true;
  }

  function adjustOnlineDuration(step) {
    if (role !== "host") return;
    const idx = Math.max(0, ONLINE_DURATIONS.indexOf(onlineDuration));
    const next = (idx + step + ONLINE_DURATIONS.length) % ONLINE_DURATIONS.length;
    onlineDuration = ONLINE_DURATIONS[next];
    onlineLocalReady = false;
    onlineRemoteReady = false;
    sendMsg({ type: "settings", duration: onlineDuration, bgm: onlineBgmKey, resetReady: true });
    broadcastLobbyState();
  }

  function adjustOnlineBgm(step) {
    if (role !== "host") return;
    const idx = Math.max(0, ONLINE_BGM_OPTIONS.findIndex(o => o.key === onlineBgmKey));
    onlineBgmKey = ONLINE_BGM_OPTIONS[(idx + step + ONLINE_BGM_OPTIONS.length) % ONLINE_BGM_OPTIONS.length].key;
    onlineLocalReady = false;
    onlineRemoteReady = false;
    sendMsg({ type: "settings", duration: onlineDuration, bgm: onlineBgmKey, resetReady: true });
    broadcastLobbyState();
  }

  function maybeStartOnlineCountdown() {
    if (role === "host" && state === "onlineLobby" && connected && onlineLocalReady && onlineRemoteReady) {
      startOnlineCountdown(true);
    }
  }

  function startOnlineCountdown(broadcast=true) {
    ensureOnlinePlayers();
    adminTestMode = false;
    gameMode = "online";
    menuOpen = false;
    particles = [];
    floating = [];
    result = null;
    onlineCountdownEnd = nowSec() + 3.8;
    setState("onlineCountdown");
    playSfx("ready", 1.1);
    if (broadcast) sendMsg({ type: "start_countdown", duration: onlineDuration, bgm: onlineBgmKey, hostName: getLocalName(), hostChar: selectedChar });
  }

  function startOnlineMatch() {
    adminTestMode = false;
    gameMode = "online";
    ensureOnlinePlayers();
    const remoteChar = remote ? remote.char : (1 - selectedChar);
    const remoteName = remote ? remote.name : "상대";
    local = defaultPlayer(selectedChar, "left", getLocalName());
    remote = defaultPlayer(remoteChar, "right", remoteName);
    stageIndex = 0;
    stageDuration = onlineDuration;
    stageStart = nowSec();
    particles = [];
    floating = [];
    result = null;
    onlineLocalReady = false;
    onlineRemoteReady = false;
    addText(W/2, 170, "게임 시작!", "#fff0a8", 44, 1.2);
    setState("playing");
    sendState(true);
  }

  function onlineReturnLobby(broadcast=true, notice="온라인 로비로 돌아왔습니다.") {
    if (broadcast) sendMsg({ type: "leave_lobby" });
    ensureOnlinePlayers();
    const remoteChar = remote ? remote.char : (1 - selectedChar);
    const remoteName = remote ? remote.name : "상대";
    local = defaultPlayer(selectedChar, "left", getLocalName());
    remote = defaultPlayer(remoteChar, "right", remoteName);
    onlineLocalReady = false;
    onlineRemoteReady = false;
    particles = [];
    floating = [];
    result = null;
    onlineNotice = notice;
    setState("onlineLobby");
    broadcastLobbyState();
  }

  function handleDisconnected() {
    if (gameMode === "online" || state === "onlineLobby" || state === "onlineCountdown" || state === "connected") {
      onlineNotice = "상대와 연결이 끊어졌습니다.";
      closePeer();
      local = null;
      remote = null;
      setState("mode");
      addText(W/2, 210, "상대와 연결이 끊어졌습니다", "#ffb0b0", 34, 1.6);
    }
  }

  function lobbyButton(id, x, y, w, h, label, fill="#24154f", disabled=false) {
    const rect = { id, x, y, w, h, disabled };
    onlineLobbyButtons.push(rect);
    const hovered = !disabled && inRect(mouse, rect);
    ctx.save();
    ctx.globalAlpha = disabled ? .45 : 1;
    ctx.fillStyle = fill;
    ctx.strokeStyle = disabled ? "rgba(255,255,255,.35)" : (hovered ? "rgba(255,240,168,.95)" : "rgba(255,255,255,.82)");
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.shadowColor = hovered ? "rgba(255,220,120,.7)" : "transparent";
    ctx.shadowBlur = hovered ? 14 : 0;
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    if (hovered) {
      ctx.globalAlpha = .20;
      ctx.fillStyle = "#fff0a8";
      roundRect(x, y, w, h, 14);
      ctx.fill();
    }
    ctx.restore();
    drawText(label, x + w/2, y + h/2, hovered ? 19 : 18, disabled ? "#aaa" : (hovered ? "#fff0a8" : "#fff"), "center", true);
  }

  function drawInputBox(id, x, y, w, h, text, active, placeholder="") {
    onlineLobbyButtons.push({ id, x, y, w, h, disabled:false });
    ctx.save();
    ctx.fillStyle = active ? "rgba(25,25,55,.92)" : "rgba(5,5,18,.78)";
    ctx.strokeStyle = active ? "#fff0a8" : "rgba(255,255,255,.65)";
    ctx.lineWidth = active ? 3 : 2;
    roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    // 긴 안내문/채팅이 전송 버튼 영역까지 밀려 보이지 않도록 입력창 안에서만 표시
    ctx.beginPath();
    roundRect(x + 8, y + 4, w - 32, h - 8, 8);
    ctx.clip();
    const label = String(text || placeholder || "");
    ctx.font = `800 18px Malgun Gothic, Apple SD Gothic Neo, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,.72)";
    ctx.fillStyle = text ? "#fff" : "#9aa";
    const maxW = w - 52;
    let shown = label;
    while (ctx.measureText(shown).width > maxW && shown.length > 1) shown = shown.slice(1);
    if (shown !== label) shown = "…" + shown;
    ctx.strokeText(shown, x + 16, y + h/2);
    ctx.fillText(shown, x + 16, y + h/2);
    ctx.restore();

    if (active && Math.floor(nowSec()*2) % 2 === 0) drawText("|", x + w - 18, y + h/2, 20, "#fff0a8", "center", false);
  }

  function drawOnlineLobby() {
    onlineLobbyButtons = [];
    drawImageCover(assets.bg, 0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,.44)"; ctx.fillRect(0,0,W,H);

    // 로비 전체 배치 재정렬: MENU/전체화면/BGM 버튼 영역을 비워두고,
    // 채팅/입력/옵션이 서로 겹치지 않도록 분리합니다.
    drawPanel(92, 34, 1068, 656);
    drawText("온라인 1:1 대전 로비", W/2, 70, 36, "#fff0a8");
    drawText(role === "host" ? "방장" : "참가자", W/2, 107, 22, role === "host" ? "#bfe8ff" : "#ffd6ff");

    ensureOnlinePlayers();
    const lReady = onlineLocalReady ? "READY" : "대기";
    const rReady = onlineRemoteReady ? "READY" : "대기";

    if (onlineNotice) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.strokeStyle = "rgba(255,240,168,.55)";
      ctx.lineWidth = 1.5;
      roundRect(215, 122, 850, 34, 14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const notice = onlineNotice.length > 54 ? onlineNotice.slice(0, 53) + "…" : onlineNotice;
      drawText(notice, W/2, 139, 15, "#fff0a8", "center", true);
    }

    drawPanel(150, 165, 440, 150);
    drawText("내 정보", 370, 188, 22, chars[selectedChar].accent);
    drawText(`캐릭터: ${chars[selectedChar].name}`, 370, 216, 18, "#fff");
    drawInputBox("nameInput", 190, 238, 360, 42, getLocalName(), nameEditActive, "닉네임 입력");
    drawText(`상태: ${lReady}`, 370, 300, 20, onlineLocalReady ? "#b6ffb6" : "#fff0a8");

    const rc = remote ? chars[remote.char] || chars[1-selectedChar] : chars[1-selectedChar];
    drawPanel(690, 165, 440, 150);
    drawText("상대 정보", 910, 188, 22, rc.accent);
    drawText(`캐릭터: ${remote ? chars[remote.char].name : "대기 중"}`, 910, 216, 18, "#fff");
    drawText(remote ? remote.name : "상대 접속 대기", 910, 257, 24, "#fff");
    drawText(`상태: ${rReady}`, 910, 300, 20, onlineRemoteReady ? "#b6ffb6" : "#fff0a8");

    // 채팅 영역: 메시지 출력 영역과 입력창 영역을 완전히 분리하고 휠 스크롤 지원
    drawPanel(150, 330, 980, 210);
    drawText("로비 채팅", 235, 354, 19, "#bfe8ff", "left");
    const chatRect = onlineChatDisplayRect();
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.20)";
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    roundRect(chatRect.x - 8, chatRect.y - 5, chatRect.w + 16, chatRect.h + 10, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundRect(chatRect.x, chatRect.y, chatRect.w, chatRect.h, 10);
    ctx.clip();
    const visibleChatRows = 4;
    const maxChatStart = Math.max(0, chatMessages.length - visibleChatRows);
    onlineChatScroll = Math.max(0, Math.min(onlineChatScroll, maxChatStart));
    let cy = chatRect.y + 17;
    for (let i = onlineChatScroll; i < Math.min(chatMessages.length, onlineChatScroll + visibleChatRows); i++) {
      const m = chatMessages[i];
      const line = `${m.who}: ${m.text}`;
      drawText(line.length > 56 ? line.slice(0, 55) + "…" : line, chatRect.x + 8, cy, 16, m.color || "#fff", "left", true);
      cy += 23;
    }
    ctx.restore();
    if (chatMessages.length > visibleChatRows) drawText("휠 스크롤", 1048, 354, 14, "#ddd", "center", true);

    drawInputBox("chatInput", 180, 487, 775, 40, chatInput, chatEditActive, "메시지 입력 후 ENTER 또는 전송");
    lobbyButton("sendChat", 970, 487, 120, 40, "전송", "#5a2ac6");

    lobbyButton("ready", 185, 566, 180, 52, onlineLocalReady ? "준비 취소" : "READY", onlineLocalReady ? "#5a5a5a" : "#bd3ee8");
    lobbyButton("lobbyBack", 395, 566, 160, 52, "나가기", "#3b3b4f");

    drawPanel(620, 548, 510, 134);
    drawText("방 옵션", 875, 570, 16, "#bfe8ff", "center", true);
    if (role !== "host") drawText("방장만 변경 가능", 1030, 570, 13, "#d8d8e8", "center", true);
    drawText("플레이 시간", 692, 606, 17, "#fff", "left", true);
    drawText(`${Math.round(onlineDuration/60)}분`, 845, 606, 20, "#fff0a8", "center", true);
    lobbyButton("durPrev", 975, 588, 48, 36, "◀", "#2d225e", role !== "host");
    lobbyButton("durNext", 1030, 588, 48, 36, "▶", "#2d225e", role !== "host");

    drawText("BGM", 692, 650, 17, "#fff0a8", "left", true);
    drawText(fitLobbyLabel(onlineBgmLabel(), 15), 845, 650, 18, "#fff0a8", "center", true);
    lobbyButton("bgmPrev", 975, 632, 48, 36, "◀", "#2d225e", role !== "host");
    lobbyButton("bgmNext", 1030, 632, 48, 36, "▶", "#2d225e", role !== "host");
  }

  function drawOnlineCountdown() {
    drawImageCover(assets.bg, 0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,.50)"; ctx.fillRect(0,0,W,H);
    drawPanel(250, 185, 780, 350);
    const rem = Math.max(0, onlineCountdownEnd - nowSec());
    let label = "게임 시작!";
    if (rem > 2.8) label = "게임 시작 3초전";
    else if (rem > 1.8) label = "게임 시작 2초전";
    else if (rem > .8) label = "게임 시작 1초전";
    drawText(label, W/2, 295, 54, "#fff0a8");
    drawText(`${getLocalName()}  VS  ${remote ? remote.name : "상대"}`, W/2, 375, 28, "#fff");
    drawText(`플레이 시간 ${Math.round(onlineDuration/60)}분 / ${onlineBgmLabel()}`, W/2, 430, 24, "#bfe8ff");
  }

  function handleOnlineLobbyClick(x, y) {
    for (const b of onlineLobbyButtons) {
      if (b.disabled) continue;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        nameEditActive = b.id === "nameInput";
        chatEditActive = b.id === "chatInput";
        if (b.id === "nameInput") {
          const entered = window.prompt("닉네임을 입력하세요. 한글 12자 / 영문 18자 이내", getLocalName());
          if (entered !== null) { localPlayerName = sanitizePlayerName(entered); if (local) local.name = localPlayerName; onlineLocalReady = false; broadcastLobbyState(); }
          nameEditActive = false;
        }
        else if (b.id === "chatInput") {
          const entered = window.prompt("채팅 메시지를 입력하세요.", chatInput);
          if (entered !== null) { chatInput = Array.from(String(entered)).slice(0, 80).join(""); sendChat(); }
          chatEditActive = false;
        }
        else if (b.id === "ready") setOnlineReady(!onlineLocalReady);
        else if (b.id === "lobbyBack") { sendMsg({ type:"disconnect_notice" }); closePeer(); local = null; remote = null; setState("mode"); }
        else if (b.id === "sendChat") sendChat();
        else if (b.id === "durPrev") adjustOnlineDuration(-1);
        else if (b.id === "durNext") adjustOnlineDuration(1);
        else if (b.id === "bgmPrev") adjustOnlineBgm(-1);
        else if (b.id === "bgmNext") adjustOnlineBgm(1);
        if (b.id !== "nameInput" && b.id !== "chatInput") { nameEditActive = false; if (b.id !== "sendChat") chatEditActive = false; }
        return true;
      }
    }
    nameEditActive = false;
    chatEditActive = false;
    return false;
  }

  function handleMenuClick(x, y) {
    if (!menuOpen) return;
    for (const b of menuButtons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === "resume") closeMenu();
        else if (b.id === "settings") menuTab = "settings";
        else if (b.id === "help") menuTab = "help";
        else if (b.id === "keySettings") menuTab = "keys";
        else if (b.id === "setHitKey") waitingKeyAction = "hit";
        else if (b.id === "setStarKey") waitingKeyAction = "star";
        else if (b.id === "setAutoKey") waitingKeyAction = "auto";
        else if (b.id === "resetKeys") resetKeyConfigToDefault(true);
        else if (b.id === "bgmMute") { bgmMuted = !bgmMuted; applyVolumes(); saveSettings(); }
        else if (b.id === "sfxMute") { sfxMuted = !sfxMuted; applyVolumes(); saveSettings(); if (!sfxMuted) playSfx("coin"); }
        else if (b.id === "title") {
          closeMenu();
          if (gameMode === "online" && connected) onlineReturnLobby(true, "온라인 로비로 돌아왔습니다.");
          else { closePeer(); local = null; remote = null; finalStats = []; setState("title"); }
        }
        else if (b.id === "fullscreen") {
          const target = document.documentElement;
          if (!document.fullscreenElement && target.requestFullscreen) target.requestFullscreen().catch(()=>{});
          else if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
        }
        else if (b.id === "bgmDown") { bgmVolume = Math.max(0, bgmVolume - 0.05); applyVolumes(); saveSettings(); }
        else if (b.id === "bgmUp") { bgmVolume = Math.min(1, bgmVolume + 0.05); applyVolumes(); saveSettings(); }
        else if (b.id === "sfxDown") { sfxVolume = Math.max(0, sfxVolume - 0.05); sfxMuted = false; applyVolumes(); saveSettings(); }
        else if (b.id === "sfxUp") { sfxVolume = Math.min(1, sfxVolume + 0.05); sfxMuted = false; applyVolumes(); saveSettings(); playSfx("coin"); }
        return;
      }
    }
  }

  function canvasPoint(evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (W / r.width),
      y: (evt.clientY - r.top) * (H / r.height)
    };
  }

  canvas.addEventListener("click", (evt) => {
    unlockAudio();
    const p = canvasPoint(evt);
    if (menuOpen) {
      const sliderKind = hoveredMenuVolumeSlider(p);
      if (sliderKind) {
        setMenuVolumeFromX(sliderKind, p.x);
        if (sliderKind === "sfx") playSfx("coin", .45);
        return;
      }
      handleMenuClick(p.x, p.y);
      return;
    }
    if (floatingBgmOpen(p) && inRect(p, floatingBgmSliderRect())) { setFloatingBgmVolumeFromX(p.x); return; }
    if (inRect(p, fullscreenButtonRect())) { toggleFullscreen(); return; }
    if (state === "intro") {
      ensureIntroBgmPlaying(false);
      if (inRect(p, introSkipRect())) { goTitleFromIntro(); return; }
      if (introVolumeOpen(p) && inRect(p, introVolumeSliderRect())) { setIntroVolumeFromX(p.x); ensureIntroBgmPlaying(false); return; }
      if (inRect(p, introNextRect())) { nextIntroScene(); return; }
      return;
    }
    if (state === "title") {
      if (handleAccountClick(p)) return;
      if (inRect(p, titleStartRect())) { setState("select"); playSfx("select"); return; }
      const h = getTitleHotspot(p);
      if (h) { openTitleLink(h); return; }
    }
    if (state === "select") {
      const choice = selectChoiceRects().find(r => inRect(p, r));
      if (choice) { selectedChar = choice.char; setState("mode"); playSfx("select"); return; }
    }
    if (state === "mode") {
      const opt = modeOptionRects().find(r => inRect(p, r));
      if (opt) {
        playSfx("select", 1.05);
        if (opt.id === "single") startSingle();
        else if (opt.id === "online") openConnectionPanel();
        else if (opt.id === "competition") startCompetition();
        else if (opt.id === "competitionRank") openCompetitionRankPage();
        return;
      }
    }
    if (state === "adminStageSelect") {
      const stageBtn = adminStageRects().find(r => inRect(p, r));
      if (stageBtn) { startAdminStage(stageBtn.stage); return; }
      if (inRect(p, adminStageBackRect())) { adminTestMode = false; adminReleaseTestMode = false; setState("mode"); return; }
    }
    if (state === "result" && inRect(p, resultNextRect())) { proceedResult(); return; }
    if (state === "ending" && inRect(p, endingNextRect())) { proceedEnding(); return; }
    if (state === "final" && gameMode === "competition" && inRect(p, competitionRefreshRect())) { refreshCompetitionRankNow(); return; }
    if (state === "final" && inRect(p, finalNextRect())) { proceedFinal(); return; }
    if (state === "records" && inRect(p, recordsBackRect())) { setState("title"); return; }
    if (state === "onlineLobby") {
      if (handleOnlineLobbyClick(p.x, p.y)) return;
    }
    const mr = menuRect();
    if (p.x >= mr.x && p.x <= mr.x + mr.w && p.y >= mr.y && p.y <= mr.y + mr.h) {
      const onlineActive = (gameMode === "online" || role === "host" || role === "guest") && (state === "playing" || state === "onlineCountdown");
      if (onlineActive) onlineReturnLobby(true, "온라인 로비로 돌아왔습니다.");
      else openMenu();
    }
  });

  canvas.addEventListener("pointerdown", (evt) => {
    const p = canvasPoint(evt);
    if (menuOpen) {
      const sliderKind = hoveredMenuVolumeSlider(p);
      if (sliderKind) {
        unlockAudio();
        menuVolumeDragging = sliderKind;
        setMenuVolumeFromX(sliderKind, p.x);
        evt.preventDefault();
        return;
      }
    }
    if (floatingBgmOpen(p) && inRect(p, floatingBgmSliderHitRect())) {
      unlockAudio();
      floatingBgmDragging = true;
      setFloatingBgmVolumeFromX(p.x);
      evt.preventDefault();
      return;
    }
    if (state === "intro" && introVolumeOpen(p) && inRect(p, introVolumeSliderRect())) {
      unlockAudio();
      ensureIntroBgmPlaying(false);
      introVolumeDragging = true;
      setIntroVolumeFromX(p.x);
      evt.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", (evt) => {
    const p = canvasPoint(evt);
    mouse = p;
    if (menuVolumeDragging) {
      setMenuVolumeFromX(menuVolumeDragging, p.x);
      evt.preventDefault();
      return;
    }
    if (floatingBgmDragging) {
      setFloatingBgmVolumeFromX(p.x);
      evt.preventDefault();
      return;
    }
    if (!introVolumeDragging) return;
    setIntroVolumeFromX(p.x);
  });

  window.addEventListener("pointerup", () => {
    if (menuVolumeDragging === "sfx") playSfx("coin", .45);
    introVolumeDragging = false;
    floatingBgmDragging = false;
    menuVolumeDragging = null;
  });

  canvas.addEventListener("mousemove", (evt) => {
    mouse = canvasPoint(evt);
    canvas.style.cursor = hoveredInteractiveRect() ? "pointer" : "default";
  });

  canvas.addEventListener("mouseleave", () => {
    mouse = { x: -999, y: -999 };
    introVolumeDragging = false;
    floatingBgmDragging = false;
    menuVolumeDragging = null;
    canvas.style.cursor = "default";
  });


  function handleAudioGestureUnlock() {
    if (state === "intro") ensureIntroBgmPlaying(false);
    else if (state === "title") unlockAudio();
  }

  ["pointerdown", "touchstart", "mousedown", "click", "keydown"].forEach(type => {
    window.addEventListener(type, handleAudioGestureUnlock, { capture: true, passive: true });
  });

  function startSingle() {
    adminTestMode = false;
    adminReleaseTestMode = false;
    gameMode = "single";
    stage5FailCount = 0;
    competitionSaved = false;
    closePeer();
    local = defaultPlayer(selectedChar, "left", getLocalName());
    remote = defaultPlayer(1 - selectedChar, "right", "AI " + chars[1 - selectedChar].name);
    finalStats = [];
    startStage(0);
  }

  function startCompetition() {
    adminTestMode = false;
    adminReleaseTestMode = false;
    if (!currentUserId) {
      setLoginNotice("사용자 경쟁전은 로그인 후 이용 가능");
      return;
    }
    gameMode = "competition";
    stage5FailCount = 0;
    competitionSaved = false;
    leaderboardScroll = 0;
    closePeer();
    local = defaultPlayer(selectedChar, "left", getLocalName());
    remote = defaultPlayer(1 - selectedChar, "right", "AI " + chars[1 - selectedChar].name);
    finalStats = [];
    startStage(0);
  }

  function startAdminStage(stageNo) {
    if (!isAdminAccount()) {
      setAdminStageNotice("관리자 계정만 접근 가능");
      return;
    }
    const idx = Math.max(0, Math.min(9, Number(stageNo || 1) - 1));
    adminTestMode = true;
    gameMode = "competition";
    closePeer();
    local = defaultPlayer(selectedChar, "left", currentNickname() || "관리자");
    remote = defaultPlayer(1 - selectedChar, "right", "AI " + chars[1 - selectedChar].name);
    finalStats = [];
    result = null;
    competitionSaved = true; // 테스트 결과가 기록/랭킹에 저장되지 않도록 차단
    leaderboardScroll = 0;
    playSfx("select", 1.05);
    startStage(idx);
  }

  function startOnlineAsReady() {
    startOnlineMatch();
  }

  function startStage(idx, broadcast=true) {
    stageIndex = idx;
    stageDuration = gameMode === "online" ? onlineDuration : STAGES[idx].duration;
    if (!local) local = defaultPlayer(selectedChar, "left");
    if (!remote) remote = defaultPlayer(1-selectedChar, "right");
    local = resetPlayerKeepChar(local, "left");
    remote = resetPlayerKeepChar(remote, "right");
    if (adminTestMode && adminReleaseTestMode && gameMode === "competition" && (STAGES[idx]?.no || 1) >= 7) {
      // 관리자 동꼽 해방 테스트: 7~10스테이지 시작 시 MAX 코인을 즉시 지급합니다.
      local.donggopItems = Math.max(7, maxAutoItemsForCurrentStage());
      local.adminReleaseRefillNotified = true;
    }
    particles = [];
    floating = [];
    aiAcc = 0;
    aiSurge = 0;
    aiCatchupActive = false;
    competitionLastWarnAt = 0;
    result = null;

    if (gameMode === "single" || gameMode === "competition") {
      stageCountdownStart = nowSec();
      stageCountdownEnd = stageCountdownStart + 3.6;
      setState("stageCountdown");
      return;
    }

    beginStagePlay(broadcast);
  }

  function beginStagePlay(broadcast=true) {
    stageStart = nowSec();
    setState("playing");
    const stageName = gameMode === "online" ? "ONLINE 1:1 대전" : STAGES[stageIndex].name;
    addText(W/2, 170, `${stageName} 시작!`, "#fff0a8", 42, 1.3);
    if (gameMode === "online" && broadcast) sendMsg({ type: "stage_start", stage: stageIndex });
  }

  function finishStage(forcedWin = null, reason = "") {
    const stageWin = forcedWin === null ? local.score >= remote.score : !!forcedWin;
    result = {
      win: stageWin,
      localScore: local.score,
      remoteScore: remote.score,
      maxCpm: local.maxCpm,
      maxManualCpm: local.maxManualCpm,
      combo: local.maxCombo,
      star: local.starEarned,
      donggop: local.donggopEarned,
      fever: local.feverCount,
      stage: gameMode === "online" ? 1 : stageIndex + 1,
      online: gameMode === "online",
      reason,
    };
    if (gameMode !== "online") finalStats.push(result);
    if (!adminTestMode && (gameMode === "single" || gameMode === "competition")) saveUserStageRecord(result, gameMode === "competition" ? "competition_stage" : "single_stage");
    playSfx(result.win ? "resultWin" : "resultLose", 1.0);
    setState("result");
  }

  function timeLeft() {
    const baseNow = (menuOpen && state === "playing" && pauseStarted > 0) ? pauseStarted : nowSec();
    return Math.max(0, stageDuration - (baseNow - stageStart));
  }

  function updateAI(dt) {
    // AI 대전과 사용자 경쟁전은 둘 다 로컬 AI가 상대입니다.
    // v31에서는 single에서만 AI가 갱신되어 경쟁전 AI가 0 CPM으로 멈추는 문제가 있었습니다.
    if (!((gameMode === "single" || gameMode === "competition") && state === "playing")) return;
    const stage = STAGES[stageIndex];
    if (aiSurge > 0) aiSurge -= dt;
    else if (Math.random() < dt * (0.05 + stageIndex * 0.018)) aiSurge = 4 + Math.random() * 4;

    const gap = local.score - remote.score;
    if (gap >= 400) aiCatchupActive = true;
    if (aiCatchupActive && remote.score > local.score) aiCatchupActive = false;

    const wave = Math.sin(nowSec() * (1.5 + stageIndex * 0.15) + aiPhase) * 55;
    const surge = aiSurge > 0 ? 180 + stageIndex * 35 : 0;
    const catchup = aiCatchupActive ? Math.min(520, 180 + Math.max(0, gap) * 0.65) : 0;
    const target = Math.max(120, stage.ai + wave + surge + catchup);
    remote.remoteCpm = Math.round(target);
    aiAcc += (target / 60) * dt;
    const hits = Math.min(24, Math.floor(aiAcc));
    aiAcc -= hits;
    for (let i=0; i<hits; i++) hit(remote, false, false, "AI", false);
  }

  function updatePlayerItems(player, dt, isLocal) {
    const manual = cpm(player, true);
    const total = cpm(player, false);
    player.maxCpm = Math.max(player.maxCpm, total);
    player.maxManualCpm = Math.max(player.maxManualCpm, manual);

    if (player.feverTimer > 0) player.feverTimer = Math.max(0, player.feverTimer - dt);

    if (player.fUnlocked) {
      player.fTimer = Math.max(0, player.fTimer - dt);
      if (player.fTimer <= 0) {
        player.fUnlocked = false;
        player.fCooldown = F_COOLDOWN;
        if (isLocal) addText(330, 250, `${STAR_SKILL_NAME} 종료`, "#ffe0b0", 26, .9);
      }
    } else if (player.fCooldown > 0) player.fCooldown = Math.max(0, player.fCooldown - dt);

    player.dUnlocked = false;
    player.dTimer = 0;

    const prevDonggopBuffs = player.donggopBuffs.slice();
    const nextDonggopBuffs = player.donggopBuffs.map(x => x - dt);
    if (isLocal && prevDonggopBuffs.some((oldTime, idx) => oldTime > 2.0 && nextDonggopBuffs[idx] <= 2.0 && nextDonggopBuffs[idx] > 0)) {
      playSfx("coinOut", 1.0);
      addText(330, 345, "동전이 빠질 것 같아!", "#fff0a8", 25, 1.0);
    }
    player.donggopBuffs = nextDonggopBuffs.filter(x => x > 0);
    if (player.autoReleaseTimer > 0) player.autoReleaseTimer = Math.max(0, player.autoReleaseTimer - dt);
    else player.autoReleaseAcc = 0;
    if (isLocal && player.autoReleaseTimer <= 0 && player.donggopItems <= 0 && !player.donggopReleaseCycleActive) {
      player.autoReleaseAcc = 0;
    }
    if (isLocal) grantAdminReleaseTestCoins(player, false);
    const overlapBlocked = player.donggopBuffs.length > 0;

    if (isLocal) {
      if (!player.fUnlocked && player.fCooldown <= 0 && !overlapBlocked && manual >= STAR_THRESHOLD) player.starSustain += dt;
      else if (!player.fUnlocked) player.starSustain = 0;

      if (!player.fUnlocked && player.fCooldown <= 0 && !overlapBlocked && player.starSustain >= STAR_SUSTAIN) {
        player.starSustain = 0;
        player.fUnlocked = true;
        player.fTimer = F_UNLOCK;
        player.starEarned++;
        player.starPopup = 2.0;
        fountain(330, 330);
        addText(330, 230, `${STAR_SKILL_NAME}! 10초 +${starCpmForCurrentStage()}CPM`, "#ffd6ff", 32, 1.2);
        playSfx("starActivate", 1.15);
        sendMsg({ type: "item", item: "star" });
      }

      if (manual >= DONGGOP_THRESHOLD) player.donggopSustain += dt;
      else player.donggopSustain = 0;
      if (player.donggopSustain >= DONGGOP_SUSTAIN) {
        player.donggopSustain = 0;
        const maxAutoItems = maxAutoItemsForCurrentStage();
        if (player.donggopItems < maxAutoItems) {
          player.donggopItems++;
          player.donggopEarned++;
          addText(330, 305, `${AUTO_SKILL_NAME} 획득! ${keyLabel(keyConfig.auto)}번`, "#bfe8ff", 28, 1.0);
          playSfx("ready");
        } else {
          addText(330, 305, `${AUTO_SKILL_NAME} 최대 ${maxAutoItems}개`, "#ffd08a", 26, .9);
        }
      }

      if (player.donggopBuffs.length > 0 || player.feverTimer > 0 || player.fUnlocked) {
        const starBonus = player.fUnlocked ? starCpmForCurrentStage() : 0;
        const donggopBonus = player.donggopBuffs.length * donggopCpmForCurrentStage();
        const bonus = (donggopBonus + starBonus + (player.feverTimer > 0 ? FEVER_CPM : 0)) / 60;
        player.autoAcc = (player.autoAcc || 0) + bonus * dt;
        const count = Math.floor(player.autoAcc);
        player.autoAcc -= count;
        for (let i=0; i<Math.min(count, 60); i++) hit(player, false, gameMode === "online", "auto", false);
      }

      if (player.autoReleaseTimer > 0 && heldGameplayKeys.has(normalizeKeyConfigValue(keyConfig.hit, " "))) {
        // 동꼽 해방: 7~10스테이지 한정. 사용자가 동꼽 키를 누르고 있을 때만 제한된 자동연타를 보조합니다.
        player.autoReleaseAcc = (player.autoReleaseAcc || 0) + (DONGGOP_RELEASE_HOLD_CPM / 60) * dt;
        const releaseHits = Math.floor(player.autoReleaseAcc);
        player.autoReleaseAcc -= releaseHits;
        for (let i=0; i<Math.min(releaseHits, 18); i++) hit(player, false, gameMode === "online", "release", false);
      }
    }

    if (player.starPopup > 0) player.starPopup = Math.max(0, player.starPopup - dt);
    if (player.actionTimer > 0) player.actionTimer = Math.max(0, player.actionTimer - dt);
  }

  function sendMsg(obj) {
    if (!dc || dc.readyState !== "open") return;
    try { dc.send(JSON.stringify(obj)); } catch {}
  }

  function sendState(force=false) {
    if (gameMode !== "online" || !local) return;
    const t = nowSec();
    if (!force && t - lastSendState < .18) return;
    lastSendState = t;
    sendMsg({
      type: "state",
      char: selectedChar,
      name: localPlayerName || chars[selectedChar].name,
      score: local.score,
      combo: local.combo,
      cpm: cpm(local, false),
      manualCpm: cpm(local, true),
      fUnlocked: local.fUnlocked,
      fTimer: local.fTimer,
      stage: stageIndex,
      timeLeft: timeLeft()
    });
  }

  function receiveMsg(msg) {
    if (msg.type === "hello") {
      const rChar = Number.isInteger(msg.char) ? msg.char : (1 - selectedChar);
      remote = defaultPlayer(rChar, "right", sanitizePlayerName(msg.name || chars[rChar].name));
      onlineRemoteReady = false;
      if (state === "connected" || state === "onlineLobby" || state === "mode") {
        setState("onlineLobby");
        onlineNotice = "상대가 접속했습니다. 닉네임과 옵션을 확인한 뒤 READY를 눌러주세요.";
      }
      broadcastLobbyState();
    } else if (msg.type === "lobby_state" || msg.type === "ready") {
      const rChar = Number.isInteger(msg.char) ? msg.char : (remote ? remote.char : 1 - selectedChar);
      remote = defaultPlayer(rChar, "right", sanitizePlayerName(msg.name || (remote ? remote.name : chars[rChar].name)));
      onlineRemoteReady = !!msg.ready;
      if (role !== "host") {
        if (typeof msg.duration === "number") onlineDuration = msg.duration;
        if (msg.bgm) onlineBgmKey = msg.bgm;
      }
      if (state === "connected") setState("onlineLobby");
      maybeStartOnlineCountdown();
    } else if (msg.type === "settings") {
      if (role !== "host") {
        if (typeof msg.duration === "number") onlineDuration = msg.duration;
        if (msg.bgm) onlineBgmKey = msg.bgm;
      }
      if (msg.resetReady) {
        onlineLocalReady = false;
        onlineRemoteReady = false;
        onlineNotice = "방장 옵션이 변경되어 READY가 초기화되었습니다.";
      }
    } else if (msg.type === "chat") {
      pushChat(sanitizePlayerName(msg.name || (remote ? remote.name : "상대")), msg.text || "", remote ? chars[remote.char].accent : "#ffd6ff");
    } else if (msg.type === "start_countdown") {
      if (typeof msg.duration === "number") onlineDuration = msg.duration;
      if (msg.bgm) onlineBgmKey = msg.bgm;
      onlineRemoteReady = true;
      onlineLocalReady = true;
      startOnlineCountdown(false);
    } else if (msg.type === "leave_lobby") {
      onlineReturnLobby(false, "상대가 온라인 로비로 돌아갔습니다.");
    } else if (msg.type === "disconnect_notice") {
      onlineNotice = "상대가 접속을 종료했습니다.";
      closePeer();
      local = null;
      remote = null;
      setState("mode");
    } else if (msg.type === "stage_start") {
      startStage(Number(msg.stage || 0), false);
    } else if (msg.type === "hit") {
      if (!remote) remote = defaultPlayer(1-selectedChar, "right", "상대");
      hit(remote, true, false, msg.key || "A", false);
      remote.score = Math.max(remote.score, msg.score || remote.score);
      remote.combo = msg.combo ?? remote.combo;
    } else if (msg.type === "state") {
      if (!remote) remote = defaultPlayer(msg.char ?? 1, "right");
      remote.char = msg.char ?? remote.char;
      remote.name = sanitizePlayerName(msg.name || remote.name);
      const delta = Math.max(0, Math.min(18, (msg.score || 0) - remote.score));
      for (let i=0; i<delta; i++) hit(remote, false, false, "sync", false);
      remote.score = Math.max(remote.score, msg.score || 0);
      remote.combo = msg.combo || remote.combo;
      remote.remoteCpm = msg.cpm || 0;
      remote.remoteManualCpm = msg.manualCpm || 0;
      remote.fUnlocked = !!msg.fUnlocked;
      remote.fTimer = msg.fTimer || 0;
    } else if (msg.type === "item") {
      if (msg.item === "star" && remote) remote.starPopup = 2.0;
    }
  }

  function closePeer() {
    try { if (dc) { dc.onclose = null; dc.onerror = null; dc.close(); } } catch {}
    try { if (pc) pc.close(); } catch {}
    pc = null; dc = null; connected = false; role = "none";
  }

  function openConnectionPanel() {
    signalPanel.classList.remove("hidden");
    signalSteps.innerHTML = `
      <p>1명은 <b>방 만들기</b>, 다른 1명은 <b>방 참가</b>를 누르세요.</p>
      <p class="warn">VPN, 회사/학교 방화벽, LTE/5G 일부 환경에서는 온라인 1:1 접속 연결이 실패할 수 있습니다.</p>
    `;
  }

  document.getElementById("backBtn").onclick = () => {
    signalPanel.classList.add("hidden");
    setState("mode");
  };
  document.getElementById("hostBtn").onclick = hostFlow;
  document.getElementById("joinBtn").onclick = joinFlow;

  async function waitIceGathering(peer) {
    if (peer.iceGatheringState === "complete") return;
    await new Promise(resolve => {
      const check = () => {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", check);
      setTimeout(resolve, 2600);
    });
  }

  function enc(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  function dec(str) { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); }

  function setupDC(channel) {
    dc = channel;
    dc.onopen = () => {
      connected = true;
      adminTestMode = false;
      gameMode = "online";
      signalPanel.classList.add("hidden");
      localPlayerName = getLocalName();
      local = defaultPlayer(selectedChar, "left", localPlayerName);
      if (!remote) remote = defaultPlayer(1 - selectedChar, "right", "상대");
      onlineLocalReady = false;
      onlineRemoteReady = false;
      onlineNotice = "연결 완료! 닉네임을 입력하고 양쪽 모두 READY를 누르면 시작합니다.";
      sendMsg({ type:"hello", char:selectedChar, name:localPlayerName });
      setState("onlineLobby");
      setTimeout(broadcastLobbyState, 250);
    };
    dc.onmessage = (ev) => {
      try { receiveMsg(JSON.parse(ev.data)); } catch {}
    };
    dc.onclose = () => handleDisconnected();
    dc.onerror = () => handleDisconnected();
  }

  async function hostFlow() {
    unlockAudio();
    closePeer();
    role = "host";
    pc = new RTCPeerConnection(rtcConfig);
    setupDC(pc.createDataChannel("donggop"));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIceGathering(pc);
    const code = enc(pc.localDescription);
    signalSteps.innerHTML = `
      <p class="ok">1단계: 아래 방 만들기 코드를 상대에게 보내세요.</p>
      <textarea id="offerOut" readonly>${code}</textarea>
      <button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('offerOut').value)">코드 복사</button>
      <p>2단계: 상대가 만든 참가 답변 코드를 아래에 붙여넣고 연결하기를 누르세요.</p>
      <textarea id="answerIn" placeholder="상대의 참가 답변 코드를 붙여넣기"></textarea>
      <button id="applyAnswer">상대 답변 코드로 연결</button>
    `;
    document.getElementById("applyAnswer").onclick = async () => {
      try {
        const ans = dec(document.getElementById("answerIn").value);
        await pc.setRemoteDescription(ans);
        signalSteps.insertAdjacentHTML("beforeend", `<p class="ok">연결 시도 중... 잠시 기다리세요.</p>`);
      } catch (e) {
        signalSteps.insertAdjacentHTML("beforeend", `<p class="warn">답변 코드 오류: ${e}</p>`);
      }
    };
  }

  async function joinFlow() {
    unlockAudio();
    closePeer();
    role = "guest";
    pc = new RTCPeerConnection(rtcConfig);
    pc.ondatachannel = (ev) => setupDC(ev.channel);
    signalSteps.innerHTML = `
      <p>1단계: 방 만든 사람이 준 코드를 아래에 붙여넣고 답변 코드 만들기를 누르세요.</p>
      <textarea id="offerIn" placeholder="방 만들기 코드를 붙여넣기"></textarea>
      <button id="makeAnswer">답변 코드 만들기</button>
      <div id="answerArea"></div>
    `;
    document.getElementById("makeAnswer").onclick = async () => {
      try {
        const off = dec(document.getElementById("offerIn").value);
        await pc.setRemoteDescription(off);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitIceGathering(pc);
        const code = enc(pc.localDescription);
        document.getElementById("answerArea").innerHTML = `
          <p class="ok">2단계: 아래 답변 코드를 방 만든 사람에게 보내세요.</p>
          <textarea id="answerOut" readonly>${code}</textarea>
          <button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('answerOut').value)">답변 코드 복사</button>
          <p class="ok">방 만든 사람이 답변 코드를 입력하면 자동 연결됩니다.</p>
        `;
      } catch (e) {
        document.getElementById("answerArea").innerHTML = `<p class="warn">방 만들기 코드 오류: ${e}</p>`;
      }
    };
  }

  function proceedResult() {
    if (state !== "result" || !result) return;
    if (adminTestMode) {
      result = null;
      finalStats = [];
      setAdminStageNotice("다른 스테이지를 바로 선택하세요");
      setState("adminStageSelect");
      return;
    }
    if (result.autoReturnTitle) {
      result = null;
      finalStats = [];
      stage5FailCount = 0;
      setState("title");
    } else if (gameMode === "single") {
      if (result.win && stageIndex < 4) startStage(stageIndex + 1);
      else if (!result.win) startStage(stageIndex);
      else {
        endingTimer = 5;
        setState("ending");
      }
    } else if (gameMode === "competition") {
      if (result.win && stageIndex < 9) {
        startStage(stageIndex + 1);
      } else {
        commitCompetitionRecord(!!result.win);
        finalLeaderboardAutoRefreshAt = 0;
        leaderboardNotice = "외부 경쟁전 순위";
        leaderboardNoticeTimer = 1.6;
        result = null;
        setState("final");
        refreshRemoteLeaderboard(true).then(() => {
          leaderboardNotice = remoteApiEnabled() && currentGoogleIdToken ? "갱신 완료" : "로컬 순위 표시";
          leaderboardNoticeTimer = 2.2;
        });
      }
    } else {
      onlineReturnLobby(true, "대전이 끝났습니다. 다시 READY를 누르면 새 대전을 시작합니다.");
    }
  }

  function proceedEnding() {
    if (state !== "ending") return;
    setState("final");
  }

  function proceedFinal() {
    if (state !== "final") return;
    result = null;
    finalStats = [];
    stage5FailCount = 0;
    setState("title");
  }

  function handleKey(e) {
    if (waitingKeyAction) {
      const nk = normalizeGameKey(e);
      if (e.key !== "Escape" && e.key !== "Enter" && nk) {
        const used = Object.entries(keyConfig).find(([name, val]) => normalizeKeyConfigValue(val, "") === nk && name !== waitingKeyAction);
        if (used) {
          addText(W/2, 250, `${keyLabel(nk)} 키는 이미 사용 중입니다`, "#ffb3c7", 24, 1.0);
        } else {
          keyConfig[waitingKeyAction] = nk;
          saveSettings();
          addText(W/2, 250, `${keyLabel(nk)} 키로 변경`, "#bfe8ff", 24, 1.0);
        }
      }
      waitingKeyAction = null;
      return;
    }
    unlockAudio();
    const k = e.key.toLowerCase();
    if (e.key === "Escape") {
      if (state === "adminStageSelect") { adminTestMode = false; adminReleaseTestMode = false; setState("mode"); }
      else if (state === "playing" && gameMode === "online" && !menuOpen) onlineReturnLobby(true, "온라인 로비로 돌아왔습니다.");
      else if (menuOpen) closeMenu();
      else openMenu();
      return;
    }
    if (menuOpen) return;
    if (state === "onlineLobby") {
      if (nameEditActive) {
        if (e.key === "Enter") { nameEditActive = false; localPlayerName = getLocalName(); broadcastLobbyState(); return; }
        if (e.key === "Escape") { nameEditActive = false; return; }
        if (e.key === "Backspace") { localPlayerName = Array.from(localPlayerName || "").slice(0, -1).join(""); broadcastLobbyState(); return; }
        if (e.key && e.key.length === 1) {
          const next = sanitizePlayerName((localPlayerName || "") + e.key);
          localPlayerName = next;
          if (local) local.name = next;
          broadcastLobbyState();
        }
        return;
      }
      if (chatEditActive) {
        if (e.key === "Enter") { sendChat(); return; }
        if (e.key === "Escape") { chatEditActive = false; return; }
        if (e.key === "Backspace") { chatInput = Array.from(chatInput || "").slice(0, -1).join(""); return; }
        if (e.key && e.key.length === 1 && Array.from(chatInput).length < 80) chatInput += e.key;
        return;
      }
      if (e.key === "Enter") setOnlineReady(!onlineLocalReady);
      return;
    }
    if (state === "onlineCountdown" || state === "stageCountdown") return;
    if (state === "intro" && (e.key === "Enter" || e.key === " ")) {
      ensureIntroBgmPlaying(false);
      nextIntroScene();
      return;
    }
    if (state === "intro") return;
    if (state === "title" && (e.key === "Enter" || e.key === " ")) {
      setState("select"); playSfx("select"); return;
    }
    if (state === "select") {
      if (k === "a" || e.key === "ArrowLeft") { selectedChar = 0; playSfx("move"); }
      if (k === "d" || e.key === "ArrowRight") { selectedChar = 1; playSfx("move"); }
      if (e.key === "Enter" || e.key === " ") { setState("mode"); playSfx("select"); }
      return;
    }
    if (state === "mode") {
      if (e.ctrlKey && e.shiftKey && e.key === "Tab") { openAdminStageSelect(true); return; }
      if (e.ctrlKey && e.shiftKey && k === "t") { openAdminStageSelect(false); return; }
      if (e.key === "Enter" || e.key === " ") { playSfx("select", 1.05); startSingle(); }
      if (k === "o") { playSfx("select", 1.05); openConnectionPanel(); }
      if (k === "c") { playSfx("select", 1.05); startCompetition(); }
      if (k === "r") { playSfx("select", 1.05); openCompetitionRankPage(); }
      return;
    }
    if (state === "adminStageSelect") {
      if (e.key === "Escape") { adminTestMode = false; adminReleaseTestMode = false; setState("mode"); return; }
      if (/^[1-9]$/.test(e.key)) { startAdminStage(Number(e.key)); return; }
      if (e.key === "0") { startAdminStage(10); return; }
      return;
    }
    if (state === "playing") {
      const isHitKey = keyMatch(e, keyConfig.hit);
      const isStarKey = keyMatch(e, keyConfig.star);
      const isAutoKey = keyMatch(e, keyConfig.auto);
      if ((isHitKey || isStarKey || isAutoKey) && blockGameplayHoldRepeat(e, isAutoKey ? "auto" : (isStarKey ? "star" : "hit"))) return;

      if (isHitKey || (isStarKey && local.fUnlocked)) {
        hit(local, true, gameMode === "online", isHitKey ? keyLabel(keyConfig.hit) : keyLabel(keyConfig.star), true);
      } else if (isStarKey && !local.fUnlocked) {
        addText(330, 255, local.fCooldown > 0 ? `${keyLabel(keyConfig.star)} 쿨타임 ${local.fCooldown.toFixed(1)}s` : `${keyLabel(keyConfig.star)} 키 잠김`, "#ffc88a", 26, .8);
      } else if (isAutoKey) {
        useDonggopAutoSkill(local);
      }
      return;
    }
    if (state === "result" && e.key === "Enter") {
      proceedResult();
      return;
    }
    if (state === "ending" && (e.key === "Enter" || e.key === " ")) {
      proceedEnding();
      return;
    }
    if (state === "final" && e.key === "Enter") {
      proceedFinal();
      return;
    }
    if (state === "records" && (e.key === "Escape" || e.key === "Enter")) {
      setState("title");
      return;
    }
  }

  canvas.addEventListener("wheel", (e) => {
    if (state === "final" && gameMode === "competition") {
      const board = loadLeaderboard();
      leaderboardScroll = Math.max(0, Math.min(Math.max(0, board.length - 10), leaderboardScroll + (e.deltaY > 0 ? 1 : -1)));
      e.preventDefault();
    } else if (state === "onlineLobby" && inRect(mouse, { x: 160, y: 360, w: 960, h: 120 })) {
      const visibleChatRows = 4;
      onlineChatScroll = Math.max(0, Math.min(Math.max(0, chatMessages.length - visibleChatRows), onlineChatScroll + (e.deltaY > 0 ? 1 : -1)));
      e.preventDefault();
    } else if (state === "records") {
      const acc = currentAccount();
      const len = acc && Array.isArray(acc.records) ? acc.records.length : 0;
      recordsScroll = Math.max(0, Math.min(Math.max(0, len - 7), recordsScroll + (e.deltaY > 0 ? 1 : -1)));
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const nk = normalizeGameKey(e);
    if ((state === "mode" && e.ctrlKey && e.shiftKey && (e.key === "Tab" || String(e.key).toLowerCase() === "t")) || state === "intro" || state === "adminStageSelect" || state === "stageCountdown" || state === "onlineLobby" || state === "ending" || [" ", "ArrowLeft", "ArrowRight"].includes(e.key) || Object.values(keyConfig).map(v => normalizeKeyConfigValue(v, "")).includes(nk)) e.preventDefault();
    handleKey(e);
  });

  window.addEventListener("keyup", (e) => {
    heldGameplayKeys.delete(normalizeGameKey(e));
  });

  window.addEventListener("blur", () => {
    clearGameplayHeldKeys();
  });

  function update(dt) {
    if (introFlash > 0) introFlash = Math.max(0, introFlash - dt * 1.9);
    if (titleClickFlash > 0) titleClickFlash = Math.max(0, titleClickFlash - dt);
    if (loginNoticeTimer > 0) loginNoticeTimer = Math.max(0, loginNoticeTimer - dt);
    if (adminStageNoticeTimer > 0) adminStageNoticeTimer = Math.max(0, adminStageNoticeTimer - dt);
    if (leaderboardNoticeTimer > 0) leaderboardNoticeTimer = Math.max(0, leaderboardNoticeTimer - dt);
    if (state === "onlineCountdown" && onlineCountdownEnd > 0 && nowSec() >= onlineCountdownEnd) {
      startOnlineMatch();
      return;
    }
    if (state === "stageCountdown" && stageCountdownEnd > 0 && nowSec() >= stageCountdownEnd) {
      beginStagePlay();
      return;
    }
    if (menuOpen) return;
    if (state === "result" && result && result.autoReturnTitle) {
      result.returnTimer = (result.returnTimer || 3.0) - dt;
      if (result.returnTimer <= 0) {
        result = null;
        finalStats = [];
        stage5FailCount = 0;
        setState("title");
        return;
      }
    }
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt; p.life -= dt; p.rot = (p.rot || 0) + 480*dt;
    }
    particles = particles.filter(p => p.life > 0);
    if (particles.length > 140) particles.splice(0, particles.length - 140);
    for (const f of floating) { f.y += f.vy*dt; f.life -= dt; }
    floating = floating.filter(f => f.life > 0);

    if (state === "playing") {
      updatePlayerItems(local, dt, true);
      updatePlayerItems(remote, dt, false);
      if (gameMode === "single" || gameMode === "competition") updateAI(dt);
      else sendState(false);
      if (maybeHandleCompetitionElimination()) return;
      if (timeLeft() <= 0) finishStage();
    }
    if (state === "ending" && endingTimer > 0) {
      endingTimer -= dt;
      // 엔딩 BGM이 충분히 이어지도록 자동 전환하지 않고, ENTER / SPACE 입력으로 최종 결과로 이동합니다.
    }
  }

  function drawImageCover(img, x, y, w, h) {
    if (!img) { ctx.fillStyle="#10102a"; ctx.fillRect(x,y,w,h); return; }
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.width - sw)/2, (img.height - sh)/2, sw, sh, x, y, w, h);
  }

  function drawImageContain(img, x, y, w, h) {
    if (!img) { ctx.fillStyle="#10102a"; ctx.fillRect(x,y,w,h); return; }
    const s = Math.min(w / img.width, h / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawImageCoverRounded(img, x, y, w, h, radius=24) {
    ctx.save();
    roundRect(x, y, w, h, radius);
    ctx.clip();
    drawImageCover(img, x, y, w, h);
    ctx.restore();
  }

  function drawText(text, x, y, size=32, color="#fff", align="center", stroke=true) {
    ctx.save();
    ctx.font = `800 ${size}px Malgun Gothic, Apple SD Gothic Neo, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    if (stroke) { ctx.lineWidth = Math.max(4, size/8); ctx.strokeStyle = "rgba(0,0,0,.72)"; ctx.strokeText(text, x, y); }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundRect(x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
  }

  function drawPanel(x,y,w,h) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.56)";
    ctx.strokeStyle = "rgba(255,255,255,.78)";
    ctx.lineWidth = 2;
    roundRect(x,y,w,h,22);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawHudSignalBox(x, y, w, h, type="star", phase=0) {
    const isStar = type === "star";
    const pulse = 0.5 + 0.5 * Math.sin(phase * 7.5);
    ctx.save();
    ctx.globalAlpha = 0.68 + pulse * 0.18;
    ctx.shadowColor = isStar ? "#ff8ee4" : "#8bdfff";
    ctx.shadowBlur = 12 + pulse * 10;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (isStar) {
      g.addColorStop(0, "rgba(255,142,228,.34)");
      g.addColorStop(.55, "rgba(255,240,168,.22)");
      g.addColorStop(1, "rgba(139,223,255,.20)");
    } else {
      g.addColorStop(0, "rgba(139,223,255,.30)");
      g.addColorStop(.55, "rgba(255,240,168,.24)");
      g.addColorStop(1, "rgba(191,255,224,.20)");
    }
    ctx.fillStyle = g;
    roundRect(x, y, w, h, 15);
    ctx.fill();
    ctx.strokeStyle = isStar ? "rgba(255,240,168,.86)" : "rgba(139,223,255,.88)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 15);
    ctx.stroke();

    // 가벼운 스캔라인: 파티클을 만들지 않고 박스 안에서만 움직여 렉을 줄임
    ctx.globalAlpha = 0.24 + pulse * 0.20;
    ctx.fillStyle = "#ffffff";
    const scanX = x + 10 + ((phase * 86) % Math.max(1, w - 34));
    roundRect(scanX, y + 5, 24, h - 10, 10);
    ctx.fill();
    ctx.restore();
  }

  function drawMiniHudSparkles(x, y, w, h, phase=0, type="star") {
    const colors = type === "star"
      ? ["#fff0a8", "#ff8ee4", "#8bdfff"]
      : ["#fff0a8", "#8bdfff", "#bfffe0"];
    ctx.save();
    ctx.font = "800 14px Malgun Gothic, Apple SD Gothic Neo, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i=0; i<5; i++) {
      const sx = x + 18 + ((phase * 38 + i * (w / 4.4)) % Math.max(1, w - 36));
      const sy = y + 8 + (i % 2) * (h - 16) + Math.sin(phase * 5 + i) * 2.2;
      ctx.globalAlpha = 0.45 + 0.45 * Math.max(0, Math.sin(phase * 7 + i));
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 10;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(i % 2 ? "✦" : "★", sx, sy);
    }
    ctx.restore();
  }

  function visualNowSec() {
    return (menuOpen && state === "playing" && pauseStarted > 0) ? pauseStarted : nowSec();
  }

  function frameFor(player) {
    const c = chars[player.char];
    const vt = visualNowSec();
    if (player.donggopBuffs && player.donggopBuffs.length > 0) {
      const remaining = Math.max(...player.donggopBuffs);
      if (remaining <= 2.0) return c.autoEnd || c.frames[0];
      return c.autoFrames[Math.floor(vt) % 2] || c.frames[0];
    }
    if (player.actionTimer > 0) {
      const currentCpm = Math.max(cpm(player, true), player.remoteCpm || 0);
      const frameRate = Math.max(8, Math.min(28, currentCpm / 42));
      const idx = Math.floor(vt * frameRate) % 3;
      return c.frames[idx];
    }
    return c.frames[0];
  }

  function drawPlayer(player, x, y, isLocal) {
    const c = chars[player.char];
    const img = assets[frameFor(player)];
    ctx.save();
    ctx.globalAlpha = .55;
    ctx.fillStyle = c.accent;
    ctx.beginPath(); ctx.ellipse(x, y+78, 235, 178, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    if (img) ctx.drawImage(img, x-230, y-170, 460, 345);
    else { ctx.fillStyle=c.accent; ctx.fillRect(x-150,y-150,300,300); }
    ctx.restore();

    if (gameMode === "online") {
      const isLeft = isLocal;
      const roleLabel = isLeft ? "PLAYER 1" : "PLAYER 2";
      drawPanel(x-165, 30, 330, isLeft ? 238 : 218);
      drawText(roleLabel, x, 56, 22, c.accent);
      drawText(player.name || (isLeft ? getLocalName() : "상대"), x, 86, 28, "#fff");
      drawText(`캐릭터: ${c.name}`, x, 116, 18, c.accent);
      drawText(String(player.score), x, 158, 42);
      drawText(`COMBO ${player.combo}`, x, 196, 19);
      if (isLeft) {
        drawText(`키보드 ${cpm(player,true)} CPM`, x, 221, 17, "#fff");
        drawText(`총 동꼽 ${cpm(player,false)} CPM`, x, 242, 17, "#fff0a8");
      } else {
        drawText(`상대 ${player.remoteCpm || cpm(player,false)} CPM`, x, 224, 17, "#fff");
      }
    } else {
      drawPanel(x-165, 30, 330, isLocal ? 212 : 188);
      drawText(isLocal ? "PLAYER" : "AI", x, 58, 23, c.accent);
      drawText(player.name, x, 88, 29);
      drawText(String(player.score), x, 135, 46);
      drawText(`COMBO ${player.combo}`, x, 174, 20);
      if (isLocal) {
        drawText(`키보드 ${cpm(player,true)} CPM`, x, 200, 18, "#fff");
        drawText(`총 동꼽 ${cpm(player,false)} CPM`, x, 222, 18, "#fff0a8");
      } else {
        drawText(`AI ${player.remoteCpm || cpm(player,false)} CPM`, x, 206, 17, "#fff");
      }
    }

    if (player.starPopup > 0) {
      const popup = assets[c.star];
      const popupPhase = 1 - Math.max(0, Math.min(2, player.starPopup)) / 2;
      const scale = 0.82 + Math.sin(popupPhase*Math.PI)*0.18;
      const ww = 520*scale, hh = 390*scale;
      ctx.save();
      ctx.shadowColor = "#fff0a8";
      ctx.shadowBlur = 28;
      if (popup) ctx.drawImage(popup, x-ww/2, y-hh/2-50, ww, hh);
      drawText("별풍선 발동!", x, y-250, 36, "#fff0a8");
      ctx.restore();
    }
  }

  function drawStageCountdown() {
    drawImageCover(assets.bg,0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,.34)"; ctx.fillRect(0,0,W,H);
    if (local && remote) {
      drawPlayer(local, 330, 410, true);
      drawPlayer(remote, 950, 410, false);
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W/2,190); ctx.lineTo(W/2,520); ctx.stroke();
    }
    drawText(`${STAGES[stageIndex].name} / ${adminTestMode ? "관리자 테스트" : (gameMode === "competition" ? "사용자 경쟁전" : "AI 대전")}`, W/2, 42, 34, "#fff");
    drawText(`난이도 ${STAGES[stageIndex].rank}`, W/2, 88, 24, "#fff0a8");

    const elapsed = Math.max(0, nowSec() - stageCountdownStart);
    let msg = "게임시작 3초전";
    if (elapsed >= 1 && elapsed < 2) msg = "게임시작 2초전";
    else if (elapsed >= 2 && elapsed < 3) msg = "게임시작 1초전";
    else if (elapsed >= 3) msg = "게임 시작!";

    const pulse = 1 + Math.sin(nowSec() * 9) * 0.035;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.66)";
    ctx.strokeStyle = "rgba(255,240,168,.92)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#fff0a8";
    ctx.shadowBlur = 28;
    roundRect(315, 245, 650, 190, 30);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(W/2, 340);
    ctx.scale(pulse, pulse);
    drawText(msg, 0, 0, elapsed >= 3 ? 58 : 52, elapsed >= 3 ? "#bfffe0" : "#fff0a8", "center", true);
    ctx.restore();
    drawText("준비하세요!", W/2, 405, 28, "#bfe8ff");

    drawParticles();
  }

  function drawCompetitionDangerVfx() {
    const deficit = competitionDeficit();
    if (deficit < 500) return;
    const t = nowSec();
    const blink = Math.sin(t * 12) > 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.24 : 0.10;
    ctx.fillStyle = "#ff153f";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.lineWidth = blink ? 9 : 5;
    ctx.strokeStyle = blink ? "rgba(255,30,70,.96)" : "rgba(255,210,90,.78)";
    ctx.shadowColor = "#ff2048";
    ctx.shadowBlur = blink ? 28 : 12;
    roundRect(22, 24, W-44, H-48, 32);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(W/2, 160);
    const pulse = 1 + Math.sin(t * 14) * 0.055;
    ctx.scale(pulse, pulse);
    drawText("⚠ 위험! 탈락 위험 ⚠", 0, 0, 34, blink ? "#ff405c" : "#fff0a8", "center", true);
    drawText(`AI와 ${deficit}점 차이 · 1000점 차이면 탈락`, 0, 38, 21, "#ffffff", "center", true);
    ctx.restore();
  }

  function drawHUD() {
    const left = timeLeft();
    const mm = Math.floor(left/60).toString().padStart(2,"0");
    const ss = Math.floor(left%60).toString().padStart(2,"0");
    drawText(gameMode === "online" ? "ONLINE 1:1 대전" : `${STAGES[stageIndex].name} / ${adminTestMode ? "관리자 테스트" : (gameMode === "competition" ? "사용자 경쟁전" : "AI 대전")}`, W/2, 28, 28, "#fff");
    drawText(`${mm}:${ss}`, W/2, 76, 42, "#fff0a8");
    drawText(gameMode === "online" ? `${getLocalName()} vs ${remote ? remote.name : "상대"}` : `난이도 ${STAGES[stageIndex].rank}`, W/2, 114, 22, "#fff");

    drawPanel(220, 590, 840, 128);
    const tHud = nowSec();
    const starActive = !!local.fUnlocked;
    const maxAutoItems = maxAutoItemsForCurrentStage();
    const autoFull = local.donggopItems >= maxAutoItems;
    const bStatus = starActive
      ? `${STAR_SKILL_NAME} +${starCpmForCurrentStage()}CPM ${local.fTimer.toFixed(1)}s`
      : local.fCooldown > 0
        ? `별풍선 안터짐(${keyLabel(keyConfig.star)}쿨 ${local.fCooldown.toFixed(1)}s)`
        : `별풍선 안터짐(${keyLabel(keyConfig.star)}잠김)`;

    // 상단 조작 안내는 3구역으로 나눠 그려서 긴 문구가 서로 겹치지 않게 유지
    drawText(`${keyLabel(keyConfig.hit)}: 동꼽`, 305, 611, 16, "#ffffff");

    const starBox = { x: 392, y: 594, w: 430, h: 32 };
    if (starActive) {
      drawHudSignalBox(starBox.x, starBox.y, starBox.w, starBox.h, "star", tHud);
    }
    const starPalette = ["#fff0a8", "#ff8ee4", "#8bdfff", "#ffffff"];
    const starColor = starActive ? starPalette[Math.floor(tHud * 7) % starPalette.length] : "#ffffff";
    drawText(`${keyLabel(keyConfig.star)}(별풍선): ${bStatus}`, starBox.x + starBox.w / 2, 611, starActive ? 15 : 15, starColor);
    if (starActive) {
      drawMiniHudSparkles(starBox.x, starBox.y, starBox.w, starBox.h, tHud, "star");
      drawText("USE!", starBox.x + starBox.w - 34, starBox.y - 6, 13, "#fff0a8");
    }

    const autoBox = { x: 835, y: 594, w: 215, h: 32 };
    if (autoFull) {
      drawHudSignalBox(autoBox.x, autoBox.y, autoBox.w, autoBox.h, "auto", tHud + 0.37);
    }
    const releaseStage = isDonggopReleaseStage();
    const releaseActive = isDonggopReleaseActive(local);
    const autoPalette = ["#fff0a8", "#8bdfff", "#ffffff", "#ffd6ff"];
    const autoColor = (autoFull || releaseActive) ? autoPalette[Math.floor(tHud * 6) % autoPalette.length] : (local.donggopItems > 0 ? "#ffe5a8" : "#ffffff");
    const autoLabel = releaseStage
      ? `${keyLabel(keyConfig.auto)}: 동꼽 해방 x${local.donggopItems}/${maxAutoItems}`
      : `${keyLabel(keyConfig.auto)}: ${AUTO_SKILL_NAME} x${local.donggopItems}/${maxAutoItems}`;
    drawText(autoLabel, autoBox.x + autoBox.w / 2, 611, (autoFull || releaseActive) ? 16 : 15, autoColor);
    if (autoFull || releaseActive) {
      drawMiniHudSparkles(autoBox.x, autoBox.y, autoBox.w, autoBox.h, tHud + 0.61, "auto");
      drawText(releaseActive ? `${local.autoReleaseTimer.toFixed(1)}s` : "READY!", autoBox.x + autoBox.w - 40, autoBox.y - 6, 13, "#bfffe0");
    }

    // 키 안내 영역과 게이지 영역을 구분하는 얇은 라인
    // 별풍선/자동사냥 활성 VFX 박스 아래쪽에 살짝 띄워서 글자·게이지와 겹치지 않게 배치
    drawHudSectionDivider(245, 628, 790);

    const manual = cpm(local, true);
    const cpmRatio = Math.max(0, Math.min(1, manual / STAR_THRESHOLD));
    const sustainRatio = Math.max(0, Math.min(1, local.starSustain / STAR_SUSTAIN));

    drawText(`별풍선 ${manual}/${STAR_THRESHOLD} CPM`, 285, 640, 15, "#fff0a8", "left");
    drawBar(505, 631, 400, 16, cpmRatio, "#ff8ee4", "#fff0a8");

    drawText(`별풍리액션텐션 ${local.starSustain.toFixed(1)}/${STAR_SUSTAIN.toFixed(0)}초`, 285, 667, 15, "#bfe8ff", "left");
    drawBar(505, 658, 400, 16, sustainRatio, "#8bdfff", "#bfe8ff");

    const dongBase = local.donggopBuffs.length ? `${Math.max(...local.donggopBuffs).toFixed(1)}s · +${local.donggopBuffs.length * donggopCpmForCurrentStage()}CPM` : "대기";
    const dong = releaseActive ? `해방 ${local.autoReleaseTimer.toFixed(1)}s / ${keyLabel(keyConfig.hit)} 홀드 자동연타` : (local.donggopReleaseCycleActive ? `해방 준비: ${local.donggopReleaseCycleSpent || 0}/${local.donggopReleaseCycleTarget || maxAutoItems} 사용` : dongBase);
    const fever = local.feverTimer > 0 ? `${local.feverTimer.toFixed(1)}s` : "대기";

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2, 683);
    ctx.lineTo(W/2, 710);
    ctx.stroke();
    ctx.restore();

    drawText(`자동사냥: ${dong}`, 470, 695, 15, "#ffe5a8");
    drawText(`피버: ${fever}`, 810, 695, 15, "#ffd6ff");
  }

  function drawHudSectionDivider(x, y, w) {
    ctx.save();
    ctx.globalAlpha = 0.9;

    // 가운데는 또렷하고 양끝은 자연스럽게 사라지는 네온 구분선
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.12, "rgba(191,232,255,.36)");
    grad.addColorStop(0.5, "rgba(255,240,168,.54)");
    grad.addColorStop(0.88, "rgba(191,232,255,.36)");
    grad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.shadowColor = "rgba(191,232,255,.65)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    // 너무 강하지 않은 하단 보조선으로 패널 내부 구획감을 추가
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 48, y + 5);
    ctx.lineTo(x + w - 48, y + 5);
    ctx.stroke();

    ctx.restore();
  }

  function drawBar(x, y, w, h, ratio, color, glowColor=null) {
    const r = Math.max(0, Math.min(1, ratio));
    ctx.save();

    // 글래스 느낌의 트랙
    const track = ctx.createLinearGradient(x, y, x, y + h);
    track.addColorStop(0, "rgba(255,255,255,.22)");
    track.addColorStop(.45, "rgba(255,255,255,.08)");
    track.addColorStop(1, "rgba(0,0,0,.22)");
    ctx.fillStyle = "rgba(3, 5, 24, .58)";
    roundRect(x-2, y-2, w+4, h+4, h/2 + 3);
    ctx.fill();

    ctx.fillStyle = track;
    roundRect(x, y, w, h, h/2);
    ctx.fill();

    // 0일 때는 색상 막대를 그리지 않음
    if (r > 0.001) {
      ctx.save();
      ctx.shadowColor = glowColor || color;
      ctx.shadowBlur = 10;
      const fill = ctx.createLinearGradient(x, y, x + w, y);
      fill.addColorStop(0, color);
      fill.addColorStop(.55, glowColor || color);
      fill.addColorStop(1, "#ffffff");
      ctx.fillStyle = fill;
      roundRect(x, y, Math.max(h, w * r), h, h/2);
      ctx.fill();

      // 얇은 하이라이트 라인
      ctx.globalAlpha = .42;
      ctx.fillStyle = "#ffffff";
      roundRect(x + 3, y + 2, Math.max(0, w * r - 6), Math.max(2, h * .28), h/2);
      ctx.fill();
      ctx.restore();
    }

    // 외곽선 + 25/50/75% 작은 눈금
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, h/2);
    ctx.stroke();

    ctx.globalAlpha = .24;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (const m of [.25, .5, .75]) {
      const mx = x + w * m;
      ctx.beginPath();
      ctx.moveTo(mx, y + 3);
      ctx.lineTo(mx, y + h - 3);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1));
      if (p.kind === "coin" && assets.coin) {
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot||0)*Math.PI/180);
        ctx.drawImage(assets.coin, -p.r/2, -p.r/2, p.r, p.r);
      } else if (p.kind === "spark") {
        ctx.strokeStyle = p.color || "rgba(255,255,255,.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.r, p.y);
        ctx.lineTo(p.x + p.r, p.y);
        ctx.moveTo(p.x, p.y - p.r);
        ctx.lineTo(p.x, p.y + p.r);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color || "#fff0a8";
        ctx.shadowColor = p.color || "#fff0a8";
        ctx.shadowBlur = 12;
        drawStar(p.x, p.y, p.r || 15, p.rot || 0);
      }
      ctx.restore();
    }
    for (const f of floating) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      drawText(f.text, f.x, f.y, f.size, f.color, "center", true);
      ctx.restore();
    }
  }

  function drawStar(x,y,r,rot=0) {
    ctx.beginPath();
    for (let i=0; i<10; i++) {
      const a = -Math.PI/2 + i*Math.PI/5 + rot*Math.PI/180;
      const rr = i%2===0 ? r : r*.45;
      const px = x + Math.cos(a)*rr, py = y + Math.sin(a)*rr;
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill();
  }


  function drawSelectionHighlight() {
    const t = nowSec();
    const pulse = 0.52 + Math.sin(t * 5) * 0.12;
    // 캐릭터 선택 카드의 실제 네온 프레임 중앙에 맞춘 박스
    // 기존 박스는 좌우로 넓어 화살표와 캐릭터 외곽까지 덮어서 어긋나 보였음
    const box = selectedChar === 0
      ? {x: 344, y: 98, w: 306, h: 518, fill: "rgba(70,170,255,.20)", stroke: "rgba(120,210,255,.95)", glow: "rgba(90,205,255,.55)"}
      : {x: 654, y: 98, w: 306, h: 518, fill: "rgba(165,100,45,.22)", stroke: "rgba(238,168,88,.95)", glow: "rgba(255,185,95,.55)"};
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = box.fill;
    ctx.strokeStyle = box.stroke;
    ctx.lineWidth = 5;
    ctx.shadowColor = box.glow;
    ctx.shadowBlur = 26;
    roundRect(box.x, box.y, box.w, box.h, 28);
    ctx.fill();
    ctx.stroke();

    // 안쪽 하이라이트 라인으로 선택감만 살리고 캐릭터는 과하게 가리지 않게 처리
    ctx.globalAlpha = pulse * 0.65;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.shadowBlur = 10;
    roundRect(box.x + 10, box.y + 10, box.w - 20, box.h - 20, 22);
    ctx.stroke();
    ctx.restore();
  }



  function drawEndingVfx() {
    const t = nowSec();
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const x = 90 + i * 150 + Math.sin(t * 0.9 + i * 1.3) * 22;
      const y = 110 + ((t * 42 + i * 67) % 520);
      const r = 10 + (i % 3) * 4;
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 2 + i);
      ctx.strokeStyle = i % 2 === 0 ? "#ffffff" : (selectedChar === 0 ? "#8bdfff" : "#ffb6ea");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y % 720, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - r * .3, (y % 720) - r * .3, r * .15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fill();
    }

    for (let i = 0; i < 12; i++) {
      const x = 70 + i * 102 + Math.sin(t * 1.25 + i * 0.8) * 18;
      const y = 70 + ((i * 53 + t * 26) % 620);
      const rot = t * 45 + i * 22;
      ctx.globalAlpha = 0.36 + 0.22 * Math.sin(t * 2.8 + i);
      ctx.fillStyle = ["#fff0a8", "#8bdfff", "#ff8ee4", "#ffffff"][i % 4];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      drawStar(x, y, 6 + (i % 4), rot);
    }

    for (let i = 0; i < 10; i++) {
      const x = 80 + ((i * 111 + t * 38) % 1120);
      const y = 70 + (i % 5) * 118 + Math.sin(t * 1.7 + i) * 15;
      ctx.globalAlpha = 0.22 + 0.12 * Math.sin(t * 3.2 + i * 1.1);
      ctx.fillStyle = ["#ffd6ff", "#bfe8ff", "#fff0a8"][i % 3];
      ctx.fillRect(x, y, 5, 12);
    }
    ctx.restore();
  }


  function recordsBackRect() {
    return { id: "recordsBack", x: 485, y: 645, w: 310, h: 52, color: "#bfe8ff", label: "뒤로" };
  }

  function drawRecordsPage() {
    drawImageCover(assets.bg, 0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,.72)";
    ctx.fillRect(0,0,W,H);
    drawPanel(85, 44, 1110, 636);
    const acc = currentAccount();
    drawText("내 동꼽즈 기록", W/2, 88, 42, "#fff0a8");
    if (!acc) {
      drawText("로그인 후 사용자별 기록을 볼 수 있습니다.", W/2, 250, 28, "#fff");
    } else {
      const totals = acc.totals || {};
      drawText(`닉네임: ${acc.nickname}   로그인 상태: ${accountUsefulLabel(acc)}   ${accountSyncLabel()}`, W/2, 132, 18, "#bfe8ff");
      const nickStatus = nicknameChangeStatus(acc);
      drawText(nickStatus.canChange ? "닉네임 변경 가능" : `닉네임 변경 가능까지 ${formatNicknameCooldown(nickStatus.remainingMs)} 남음`, W/2, 154, 15, nickStatus.canChange ? "#bfffe0" : "#fff0a8");
      drawPanel(120, 160, 1040, 110);
      const items = [
        ["플레이", totals.plays || 0],
        ["승리", totals.wins || 0],
        ["최고점수", totals.bestScore || 0],
        ["최고CPM", totals.bestCpm || 0],
        ["최대콤보", totals.bestCombo || 0],
        ["최고스테이지", totals.bestStage || 0],
      ];
      items.forEach((it, idx) => {
        const x = 190 + idx * 170;
        drawText(it[0], x, 190, 17, "#fff", "center", true);
        drawText(String(it[1]), x, 230, 25, "#fff0a8", "center", true);
      });

      drawText(`저장된 키 설정: ${keyLabel(keyConfig.hit)} 동꼽 / ${keyLabel(keyConfig.star)} 별풍선 / ${keyLabel(keyConfig.auto)} 자동사냥`, W/2, 300, 20, "#bfffe0");
      const recordsPanel = { x: 120, y: 326, w: 1040, h: 260 };
      drawPanel(recordsPanel.x, recordsPanel.y, recordsPanel.w, recordsPanel.h);
      drawText("최근 게임 기록", 170, 354, 20, "#fff0a8", "left", true);
      const recs = Array.isArray(acc.records) ? acc.records : [];
      const visibleRecordRows = 7;
      const start = Math.max(0, Math.min(recordsScroll, Math.max(0, recs.length - visibleRecordRows)));
      const headerY = 388;
      const rowStartY = 418;
      const rowGap = 24;
      const rowFont = 14;
      const col = { date: 205, mode: 365, stage: 515, result: 650, score: 785, cpm: 920, combo: 1045 };
      drawText("날짜", col.date, headerY, 15, "#bfe8ff");
      drawText("모드", col.mode, headerY, 15, "#bfe8ff");
      drawText("스테이지", col.stage, headerY, 15, "#bfe8ff");
      drawText("결과", col.result, headerY, 15, "#bfe8ff");
      drawText("점수", col.score, headerY, 15, "#bfe8ff");
      drawText("CPM", col.cpm, headerY, 15, "#bfe8ff");
      drawText("콤보", col.combo, headerY, 15, "#bfe8ff");

      // 최근 기록 행은 박스 안쪽으로만 그려지게 클리핑해서 마지막 줄이 박스 밖으로 튀지 않게 처리
      ctx.save();
      roundRect(recordsPanel.x + 14, 400, recordsPanel.w - 28, recordsPanel.h - 46, 16);
      ctx.clip();
      let y = rowStartY;
      recs.slice(start, start + visibleRecordRows).forEach((r, idx) => {
        const date = (r.at || "").slice(5, 16).replace("T", " ");
        const modeLabel = r.mode === "competition" ? "경쟁전" : (r.mode === "single" ? "AI" : "기록");
        if (idx % 2 === 0) {
          ctx.save();
          ctx.fillStyle = "rgba(255,255,255,.045)";
          roundRect(150, y - 10, 970, 20, 10);
          ctx.fill();
          ctx.restore();
        }
        drawText(date, col.date, y, rowFont, "#fff", "center", true);
        drawText(modeLabel, col.mode, y, rowFont, "#fff", "center", true);
        drawText(String(r.stage || "-"), col.stage, y, rowFont, "#fff0a8", "center", true);
        drawText(r.win ? "승리" : "패배", col.result, y, rowFont, r.win ? "#bfffe0" : "#ffb0b0", "center", true);
        drawText(String(r.score || 0), col.score, y, rowFont, "#fff0a8", "center", true);
        drawText(String(r.maxCpm || 0), col.cpm, y, rowFont, "#fff0a8", "center", true);
        drawText(String(r.combo || 0), col.combo, y, rowFont, "#fff0a8", "center", true);
        y += rowGap;
      });
      ctx.restore();
      if (recs.length > visibleRecordRows) drawText("마우스 휠로 스크롤", 1040, 354, 15, "#ddd", "center", true);
    }
    const br = recordsBackRect();
    if (inRect(mouse, br)) drawHoverSelectBox(br, 0.18);
    drawText("ESC / CLICK : 뒤로", W/2, br.y + br.h/2, 22, "#bfe8ff", "center", true);
  }

  function ensureCompetitionLeaderboardFresh() {
    if (!(state === "final" && gameMode === "competition")) return;
    if (!remoteApiEnabled() || !currentGoogleIdToken) return;
    const t = nowSec();
    if (!finalLeaderboardAutoRefreshAt) {
      finalLeaderboardAutoRefreshAt = t;
      refreshRemoteLeaderboard(true);
    }
  }

  function competitionRefreshRect() {
    return { id: "competitionRefresh", x: 1012, y: 78, w: 145, h: 40, color: "#bfffe0", label: "순위 갱신" };
  }

  function openCompetitionRankPage() {
    adminTestMode = false;
    gameMode = "competition";
    result = null;
    finalStats = [];
    leaderboardScroll = 0;
    finalLeaderboardAutoRefreshAt = 0;
    leaderboardNotice = "외부 경쟁전 순위";
    leaderboardNoticeTimer = 1.6;
    setState("final");
    refreshRemoteLeaderboard(true).then(() => {
      leaderboardNotice = remoteApiEnabled() && currentGoogleIdToken ? "갱신 완료" : "로컬 순위 표시";
      leaderboardNoticeTimer = 2.2;
    });
  }

  function refreshCompetitionRankNow() {
    finalLeaderboardAutoRefreshAt = nowSec();
    leaderboardNotice = "외부 경쟁전 순위";
    leaderboardNoticeTimer = 1.4;
    refreshRemoteLeaderboard(true).then(() => {
      leaderboardNotice = remoteApiEnabled() && currentGoogleIdToken ? "갱신 완료" : "로컬 순위 표시";
      leaderboardNoticeTimer = 2.2;
    });
  }

  function drawCompetitionFinal() {
    ensureCompetitionLeaderboardFresh();
    drawImageCover(assets.bg, 0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,.74)";
    ctx.fillRect(0,0,W,H);
    drawPanel(72, 42, 1136, 642);
    const board = loadLeaderboard();
    const best = board[0];
    drawText("사용자 경쟁전 순위", W/2, 82, 38, "#fff0a8");
    drawText(`내 기록: ${getLocalName()} / 총점 ${totalRunScore(finalStats)} / 스테이지 ${Math.max(0, ...finalStats.map(r => r.stage || 0))} / 최고CPM ${bestRunCpm(finalStats)} / 최대콤보 ${bestRunCombo(finalStats)}`, W/2, 125, 19, "#bfe8ff");
    if (best) drawText(`현재 1위: ${best.nickname}  ${best.totalScore}점  ${best.reachedStage}스테이지`, W/2, 156, 20, "#ffd6ff");
    const rankSyncText = remoteApiEnabled() && currentGoogleIdToken
      ? "외부 경쟁전 랭킹 : 연동 완료"
      : "랭킹: 이 브라우저 로컬 기록";
    drawText(rankSyncText, W/2, 178, 15, remoteApiEnabled() && currentGoogleIdToken ? "#bfffe0" : "#ffd6ff");
    const refreshBtn = competitionRefreshRect();
    const refreshHover = inRect(mouse, refreshBtn);
    if (refreshHover) drawHoverSelectBox(refreshBtn, 0.16);
    ctx.save();
    ctx.fillStyle = refreshHover ? "rgba(191,255,224,.20)" : "rgba(0,0,0,.42)";
    ctx.strokeStyle = refreshHover ? "rgba(191,255,224,.95)" : "rgba(255,255,255,.62)";
    ctx.lineWidth = refreshHover ? 2.6 : 1.5;
    ctx.shadowColor = refreshHover ? "#bfffe0" : "transparent";
    ctx.shadowBlur = refreshHover ? 14 : 0;
    roundRect(refreshBtn.x, refreshBtn.y, refreshBtn.w, refreshBtn.h, 14);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    drawText("순위 갱신", refreshBtn.x + refreshBtn.w/2, refreshBtn.y + refreshBtn.h/2, 16, "#bfffe0", "center", true);
    if (leaderboardNoticeTimer > 0 && leaderboardNotice) {
      drawText(leaderboardNotice, W/2, 198, 16, leaderboardNotice === "갱신 완료" ? "#bfffe0" : "#fff0a8", "center", true);
    }

    drawPanel(110, 210, 1060, 364);
    drawText("순위", 155, 234, 17, "#bfe8ff");
    drawText("닉네임", 300, 234, 17, "#bfe8ff");
    drawText("캐릭터", 455, 234, 17, "#bfe8ff");
    drawText("스테이지", 575, 234, 17, "#bfe8ff");
    drawText("총점", 710, 234, 17, "#bfe8ff");
    drawText("최고CPM", 855, 234, 17, "#bfe8ff");
    drawText("최대콤보", 1005, 234, 17, "#bfe8ff");
    const maxStart = Math.max(0, board.length - 10);
    leaderboardScroll = Math.max(0, Math.min(leaderboardScroll, maxStart));
    let y = 272;
    for (let i = leaderboardScroll; i < Math.min(board.length, leaderboardScroll + 10); i++) {
      const r = board[i];
      const me = currentUserId && r.userId === currentUserId && r.totalScore === totalRunScore(finalStats);
      const color = i === 0 ? "#fff0a8" : (me ? "#bfffe0" : "#fff");
      if (me) {
        ctx.save();
        ctx.fillStyle = "rgba(191,255,224,.12)";
        roundRect(122, y - 16, 1025, 28, 12);
        ctx.fill();
        ctx.restore();
      }
      drawText(String(i + 1), 155, y, 17, color);
      drawText(String(r.nickname || "-"), 300, y, 17, color);
      drawText(String(r.character || "-"), 455, y, 17, color);
      drawText(`${r.reachedStage || 0}F`, 575, y, 17, color);
      drawText(String(r.totalScore || 0), 710, y, 17, color);
      drawText(String(r.bestCpm || 0), 855, y, 17, color);
      drawText(String(r.bestCombo || 0), 1005, y, 17, color);
      y += 32;
    }
    if (!board.length) drawText("아직 경쟁전 기록이 없습니다.", W/2, 360, 26, "#fff");
    if (board.length > 10) drawText("마우스 휠로 1위~100위 스크롤", W/2, 594, 18, "#fff0a8");
    const fr = finalNextRect();
    if (inRect(mouse, fr)) drawHoverSelectBox(fr, 0.18);
    drawText("ENTER : 초기화면으로", W/2, 616, 25, "#bfe8ff");
  }

  function drawFinal() {
    if (gameMode === "competition") { drawCompetitionFinal(); return; }
    drawImageCover(assets.bg, 0,0,W,H);
    ctx.fillStyle = "rgba(0,0,0,.72)";
    ctx.fillRect(0,0,W,H);
    drawPanel(135, 85, 1010, 555);
    drawText("최종 결과", W/2, 145, 44, "#fff0a8");

    const cols = {
      stage: 260,
      result: 385,
      score: 570,
      cpm: 760,
      items: 955
    };
    const headerY = 205;
    drawText("STAGE", cols.stage, headerY, 22, "#ffffff", "center", true);
    drawText("결과", cols.result, headerY, 22, "#ffffff", "center", true);
    drawText("점수", cols.score, headerY, 22, "#ffffff", "center", true);
    drawText("최고CPM", cols.cpm, headerY, 22, "#ffffff", "center", true);
    drawText("별풍선 / 동꼽 / 피버", cols.items, headerY, 22, "#ffffff", "center", true);

    let y = 255;
    for (const r of finalStats) {
      drawText(String(r.stage), cols.stage, y, 24, "#fff0a8", "center", true);
      drawText(r.win ? "승리" : "패배", cols.result, y, 24, r.win ? "#fff0a8" : "#ff9aa8", "center", true);
      drawText(`${r.localScore}:${r.remoteScore}`, cols.score, y, 22, "#fff0a8", "center", true);
      drawText(String(r.maxCpm), cols.cpm, y, 22, "#fff0a8", "center", true);
      drawText(`${r.star} / ${r.donggop} / ${r.fever}`, cols.items, y, 22, "#fff0a8", "center", true);
      y += 42;
    }
    const fr = finalNextRect();
    if (inRect(mouse, fr)) drawHoverSelectBox(fr, 0.18);
    drawText("ENTER : 초기화면으로", W/2, 610, 25, "#bfe8ff");
  }

  function render() {
    ctx.clearRect(0,0,W,H);
    if (state === "loading") {
      ctx.fillStyle = "#050512"; ctx.fillRect(0,0,W,H);
      drawText("Loading...", W/2, H/2, 42, "#fff");
    } else if (state === "intro") {
      drawIntroScreen();
    } else if (state === "title") {
      drawImageCover(assets.title || assets.bg, 0,0,W,H);
      if (inRect(mouse, titleStartRect())) {
        drawHoverSelectBox(titleStartRect(), 0.18);
        drawSmallVfxAroundRect(titleStartRect(), "#fff0a8");
      }
      drawTitleHoverVfx();
      drawParticles();
      const bob = Math.sin(nowSec()*3)*8;
      if (assets.enterKey) ctx.drawImage(assets.enterKey, 450, 585+bob, 90, 90);
      if (assets.spaceKey) ctx.drawImage(assets.spaceKey, 585, 610-bob, 260, 72);
      drawText("ENTER / SPACE", W/2, 660+bob, 38, "#fff0a8");
    } else if (state === "select") {
      drawImageCover(assets.select || assets.bg, 0,0,W,H);
      drawSelectionHighlight();
      drawSelectPopout();
      drawText("A / ← : 슈니    D / → : 다시바", W/2, 620, 34, "#fff0a8");
      drawText(`현재 선택: ${chars[currentSelectVisualChar()].name}`, W/2, 670, 30, "#fff");
    } else if (state === "mode") {
      drawModeMenuUI();
    } else if (state === "adminStageSelect") {
      drawAdminStageSelect();
    } else if (state === "connected") {
      drawImageCover(assets.bg,0,0,W,H);
      drawPanel(270,220,740,260);
      drawText("ONLINE 연결 완료", W/2, 285, 46, "#fff0a8");
      drawText("온라인 로비로 이동합니다.", W/2, 360, 28, "#fff");
    } else if (state === "onlineLobby") {
      drawOnlineLobby();
    } else if (state === "onlineCountdown") {
      drawOnlineCountdown();
    } else if (state === "stageCountdown") {
      drawStageCountdown();
    } else if (state === "playing") {
      drawImageCover(assets.bg,0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0,0,W,H);
      drawPlayer(local, 330, 410, true);
      drawPlayer(remote, 950, 410, false);
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W/2,190); ctx.lineTo(W/2,520); ctx.stroke();
      drawParticles();
      drawHUD();
      drawCompetitionDangerVfx();
    } else if (state === "result") {
      drawImageCover(assets.bg,0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,.70)"; ctx.fillRect(0,0,W,H);
      drawPanel(70, 28, 1140, 664);

      const resultChar = chars[local ? local.char : selectedChar];
      const resultImg = assets[result.win ? resultChar.win : resultChar.lose];
      if (resultImg) {
        ctx.save();
        ctx.globalAlpha = .82;
        drawImageContain(resultImg, 125, 70, 1030, 580);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.38)";
        roundRect(125, 70, 1030, 580, 26);
        ctx.fill();
        ctx.restore();
      }

      drawText(result.win ? "승리!" : "패배", W/2, 112, 52, result.win ? "#fff0a8" : "#ffb0b0");
      if (result.reason === "competition_eliminated") {
        drawText("1000점 차이로 사용자 경쟁전 탈락!", W/2, 165, 25, "#ffb0b0");
      }
      drawPanel(250, 335, 780, 245);
      drawText(`${local.name} ${result.localScore} : ${result.remoteScore} ${remote.name}`, W/2, 365, 30);
      drawText(`최대 연타 ${result.maxCpm} CPM / 키보드 ${result.maxManualCpm} CPM`, W/2, 417, 25);
      drawText(`별풍선 ${result.star}회 / 동꼽 ${result.donggop}개 / 피버 ${result.fever}회`, W/2, 467, 25);
      drawText(`최대 콤보 ${result.combo}`, W/2, 517, 25);

      let next = adminTestMode
        ? "관리자 스테이지 선택"
        : (gameMode === "competition"
          ? (result.win && stageIndex < 9 ? "다음 경쟁 스테이지" : "사용자 경쟁전 순위 보기")
          : (gameMode === "single" ? (result.win ? (stageIndex < 4 ? "다음 스테이지" : "엔딩 보기") : "재도전") : "온라인 로비"));
      if (result.autoReturnTitle) {
        drawText(`5스테이지 3회 실패 - ${Math.ceil(result.returnTimer || 3)}초 후 초기화면`, W/2, 585, 23, "#ffb3c7");
        next = "초기화면";
      } else if (gameMode === "single" && stageIndex === 4 && !result.win) {
        drawText(`5스테이지 실패 ${result.stage5FailCount || stage5FailCount}/3`, W/2, 585, 23, "#ffb3c7");
      }
      const rr = resultNextRect();
      if (inRect(mouse, rr)) drawHoverSelectBox(rr, 0.18);
      drawText(`ENTER : ${next}`, W/2, 645, 27, "#fff0a8");
    } else if (state === "ending") {
      const key = chars[selectedChar].ending;
      drawImageCover(assets[key] || assets.bg, 0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(0,0,W,H);
      drawEndingVfx();
      drawText(`${chars[selectedChar].name} 엔딩`, W/2, 80, 48, "#fff0a8");
      const er = endingNextRect();
      if (inRect(mouse, er)) drawHoverSelectBox(er, 0.18);
      drawText("ENTER / SPACE : 최종 결과", W/2, 660, 28, "#fff");
    } else if (state === "final") {
      drawFinal();
    } else if (state === "records") {
      drawRecordsPage();
    }
    drawAccountWidget();
    drawFloatingBgmVolumeControl();
    drawGlobalFullscreenButton();
    drawMenuIcon();
    if (menuOpen) drawMenuOverlay();
    requestAnimationFrame(loop);
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastFrame) / 1000 || 0.016);
    lastFrame = t;
    update(dt);
    render();
  }

  loadAccounts();
  if (currentUserId && accounts[currentUserId]) localPlayerName = sanitizePlayerName(accounts[currentUserId].nickname || currentUserId);
  loadSettings();
  applyVolumes();

  Promise.all(Object.entries(assetList).map(([k,v]) => loadImage(k,v))).then(() => {
    setState("intro");
    tryTitleAutoplay();
    requestAnimationFrame(loop);
  });
})();
