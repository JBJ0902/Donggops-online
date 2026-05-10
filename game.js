(() => {
  "use strict";

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
  const FEVER_STEP = 50;
  const FEVER_DURATION = 8.0;
  const FEVER_CPM = 180;

  const assets = {};
  const assetList = {
    title: "assets/images/title_screen.webp",
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
    starIcon: "assets/images/star_balloon.webp",
    donggopIcon: "assets/images/excuse_icon.webp",
    enterKey: "assets/images/enter_key.webp",
    spaceKey: "assets/images/space_key.webp",
  };

  const audio = {};
  const audioFiles = {
    titleBgm: "assets/audio/bgm.mp3",
    selectBgm: "assets/audio/select_bgm.mp3",
    stage1: "assets/audio/stage1_bgm.mp3",
    stage2: "assets/audio/stage2_bgm.mp3",
    stage3: "assets/audio/stage3_bgm.mp3",
    stage4: "assets/audio/stage4_bgm.mp3",
    stage5: "assets/audio/stage5_bgm.mp3",
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
  let keyConfig = { hit: " ", star: "b", auto: "5" };
  let waitingKeyAction = null;

  function makeAudio(key, src, volume, loop=false) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    a.loop = loop;
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

  const ONLINE_DURATIONS = [120, 180, 240, 300];
  const ONLINE_BGM_OPTIONS = [
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

  function keyMatch(e, key) {
    return normalizeGameKey(e) === key;
  }

  function bgmEffectiveVolume() {
    return bgmMuted ? 0 : bgmVolume;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("donggop_settings") || "{}");
      if (typeof saved.bgmVolume === "number") bgmVolume = Math.max(0, Math.min(1, saved.bgmVolume));
      if (typeof saved.sfxVolume === "number") sfxVolume = Math.max(0, Math.min(1, saved.sfxVolume));
      if (typeof saved.bgmMuted === "boolean") bgmMuted = saved.bgmMuted;
      if (saved.keyConfig) {
        keyConfig.hit = saved.keyConfig.hit || keyConfig.hit;
        keyConfig.star = saved.keyConfig.star || keyConfig.star;
        keyConfig.auto = saved.keyConfig.auto || keyConfig.auto;
      }
    } catch {}
  }

  function saveSettings() {
    try {
      localStorage.setItem("donggop_settings", JSON.stringify({ bgmVolume, sfxVolume, bgmMuted, keyConfig }));
    } catch {}
  }

  function nowSec() { return performance.now() / 1000; }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    applyVolumes();
    switchBgmForState();
  }

  function tryTitleAutoplay() {
    if (audioUnlocked) return;
    const a = audio.titleBgm;
    if (!a) return;
    try {
      a.volume = bgmEffectiveVolume();
      const p = a.play();
      if (p) {
        p.then(() => {
          audioUnlocked = true;
          currentBgm = a;
        }).catch(() => {});
      }
    } catch {}
  }

  function applyVolumes() {
    for (const [key, a] of Object.entries(audio)) {
      const isBgm = key.includes("Bgm") || key.startsWith("stage");
      a.volume = isBgm ? bgmEffectiveVolume() : sfxVolume;
    }
    if (currentBgm) currentBgm.volume = bgmEffectiveVolume();
  }

  function playSfx(key, volMul=1) {
    const a = audio[key];
    if (!a || !audioUnlocked) return;
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
    if (currentBgm === a) return;
    stopBgm();
    currentBgm = a;
    try {
      a.volume = bgmEffectiveVolume();
      a.currentTime = 0;
      a.play().catch(()=>{});
    } catch {}
  }

  function switchBgmForState() {
    if (!audioUnlocked) return;
    if (state === "title") playBgm("titleBgm");
    else if (state === "select" || state === "mode" || state === "connected" || state === "onlineLobby") playBgm("selectBgm");
    else if (state === "onlineCountdown") playBgm(onlineBgmKey || "stage1");
    else if (state === "playing") playBgm(gameMode === "online" ? (onlineBgmKey || "stage1") : `stage${stageIndex + 1}`);
    else stopBgm();
  }

  function setState(s) {
    state = s;
    switchBgmForState();
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
    menuButtons.push({id, x, y, w, h});
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawText(label, x + w/2, y + h/2, 21, "#fff", "center", true);
  }

  function menuRect() {
    // 온라인 로비에서는 큰 로비 UI와 겹치지 않도록 오른쪽 바깥 여백에 배치
    if (state === "onlineLobby") return { x: 1178, y: 620, w: 92, h: 48 };
    return { x: 1158, y: 654, w: 104, h: 48 };
  }

  function drawMenuIcon() {
    if (state === "loading") return;
    const { x, y, w, h } = menuRect();
    const label = (state === "playing" && gameMode === "online") ? "LOBBY" : "MENU";
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.58)";
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 15);
    ctx.fill();
    ctx.stroke();
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
        `${keyLabel(keyConfig.hit)}: 동꼽 / ${keyLabel(keyConfig.star)}: 별풍선 터짐(B활성) 때 사용 / ${keyLabel(keyConfig.auto)}: 동꼽(자동사냥) 사용`,
        `별풍선: ${keyLabel(keyConfig.hit)} 순수 키보드 연타 660CPM 이상을 5초 유지하면 ${keyLabel(keyConfig.star)}키 활성 + 자동 +500CPM`,
        "동꼽(자동사냥): 1000CPM 3초 유지 시 획득, 사용하면 13초간 자동 +300CPM",
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
      drawText(waitingKeyAction ? "원하는 새 키를 누르세요. ESC / ENTER는 취소입니다." : "바꿀 항목을 선택하세요.", W/2, 268, 20, "#fff0a8");
      const keyRows = [
        ["setHitKey", "동꼽 키", keyConfig.hit],
        ["setStarKey", "별풍선 키", keyConfig.star],
        ["setAutoKey", "동꼽(자동사냥) 키", keyConfig.auto],
      ];
      let y = 318;
      for (const [id, label, key] of keyRows) {
        drawText(`${label}: ${keyLabel(key)}`, 470, y+17, 24, "#fff", "center", true);
        menuButton(id, 685, y-10, 210, 50, "변경");
        y += 72;
      }
      menuButton("settings", 450, 560, 180, 50, "설정으로");
      menuButton("resume", 660, 560, 180, 50, "계속하기");
      return;
    }

    drawText(`BGM 볼륨 ${bgmMuted ? "음소거" : (bgmVolume*100).toFixed(0) + "%"}`, W/2, 245, 28, "#fff");
    menuButton("bgmDown", 360, 278, 120, 46, "BGM -");
    menuButton("bgmUp", 800, 278, 120, 46, "BGM +");
    drawVolumeBar(525, 290, 230, 22, bgmMuted ? 0 : bgmVolume, "#8bdfff");
    menuButton("bgmMute", 540, 328, 200, 44, bgmMuted ? "BGM 음소거 해제" : "BGM 음소거");

    drawText(`효과음 볼륨 ${(sfxVolume*100).toFixed(0)}%`, W/2, 408, 28, "#fff");
    menuButton("sfxDown", 360, 441, 120, 46, "효과음 -");
    menuButton("sfxUp", 800, 441, 120, 46, "효과음 +");
    drawVolumeBar(525, 453, 230, 22, sfxVolume, "#ff8ee4");

    menuButton("keySettings", 175, 560, 155, 50, "키 설정");
    menuButton("help", 365, 560, 150, 50, "게임 설명");
    menuButton("fullscreen", 550, 560, 180, 50, "전체화면(F11)");
    menuButton("resume", 765, 560, 150, 50, "계속하기");
    menuButton("title", 950, 560, 155, 50, (gameMode === "online" && connected) ? "온라인 로비" : "초기화면");
  }

  function drawVolumeBar(x, y, w, h, ratio, color) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.15)";
    roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(x, y, w * Math.max(0, Math.min(1, ratio)), h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.65)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 10);
    ctx.stroke();
    ctx.restore();
  }


  function inRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
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
    return sanitizePlayerName(localPlayerName || chars[selectedChar].name);
  }

  function ensureOnlinePlayers() {
    localPlayerName = getLocalName();
    if (!local) local = defaultPlayer(selectedChar, "left", localPlayerName);
    local.char = selectedChar;
    local.name = localPlayerName;
    if (!remote) remote = defaultPlayer(1 - selectedChar, "right", "상대");
  }

  function onlineBgmLabel() {
    const item = ONLINE_BGM_OPTIONS.find(o => o.key === onlineBgmKey) || ONLINE_BGM_OPTIONS[2];
    return item.label;
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
    if (chatMessages.length > 8) chatMessages.splice(0, chatMessages.length - 8);
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
    onlineLobbyButtons.push({ id, x, y, w, h, disabled });
    ctx.save();
    ctx.globalAlpha = disabled ? .45 : 1;
    ctx.fillStyle = fill;
    ctx.strokeStyle = disabled ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.82)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawText(label, x + w/2, y + h/2, 18, disabled ? "#aaa" : "#fff", "center", true);
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

    // 로비 전체 배치 재정렬: 채팅, 옵션, MENU 버튼이 서로 겹치지 않도록 영역 분리
    drawPanel(92, 38, 1068, 650);
    drawText("온라인 1:1 대전 로비", W/2, 75, 38, "#fff0a8");
    drawText(role === "host" ? "방장" : "참가자", W/2, 112, 23, role === "host" ? "#bfe8ff" : "#ffd6ff");

    ensureOnlinePlayers();
    const lReady = onlineLocalReady ? "READY" : "대기";
    const rReady = onlineRemoteReady ? "READY" : "대기";

    if (onlineNotice) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.42)";
      ctx.strokeStyle = "rgba(255,240,168,.50)";
      ctx.lineWidth = 1.5;
      roundRect(250, 126, 780, 32, 14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawText(onlineNotice, W/2, 142, 16, "#fff0a8", "center", true);
    }

    drawPanel(150, 165, 440, 155);
    drawText("내 정보", 370, 190, 23, chars[selectedChar].accent);
    drawText(`캐릭터: ${chars[selectedChar].name}`, 370, 219, 19, "#fff");
    drawInputBox("nameInput", 190, 242, 360, 42, getLocalName(), nameEditActive, "닉네임 입력");
    drawText(`상태: ${lReady}`, 370, 303, 20, onlineLocalReady ? "#b6ffb6" : "#fff0a8");

    const rc = remote ? chars[remote.char] || chars[1-selectedChar] : chars[1-selectedChar];
    drawPanel(690, 165, 440, 155);
    drawText("상대 정보", 910, 190, 23, rc.accent);
    drawText(`캐릭터: ${remote ? chars[remote.char].name : "대기 중"}`, 910, 219, 19, "#fff");
    drawText(remote ? remote.name : "상대 접속 대기", 910, 262, 25, "#fff");
    drawText(`상태: ${rReady}`, 910, 303, 20, onlineRemoteReady ? "#b6ffb6" : "#fff0a8");

    drawPanel(150, 335, 980, 178);
    drawText("로비 채팅", 235, 360, 19, "#bfe8ff", "left");
    let cy = 388;
    for (const m of chatMessages.slice(-4)) {
      const line = `${m.who}: ${m.text}`;
      drawText(line.length > 48 ? line.slice(0, 47) + "…" : line, 180, cy, 16, m.color || "#fff", "left", true);
      cy += 25;
    }
    drawInputBox("chatInput", 180, 466, 775, 40, chatInput, chatEditActive, "메시지 입력 후 ENTER 또는 전송");
    lobbyButton("sendChat", 970, 466, 120, 40, "전송", "#5a2ac6");

    lobbyButton("ready", 210, 548, 180, 52, onlineLocalReady ? "준비 취소" : "READY", onlineLocalReady ? "#5a5a5a" : "#bd3ee8");
    lobbyButton("lobbyBack", 420, 548, 160, 52, "나가기", "#3b3b4f");

    drawPanel(610, 530, 520, 145);
    if (role !== "host") drawText("시간과 BGM은 방장만 변경할 수 있습니다.", 870, 550, 15, "#d8d8e8");
    drawText(`플레이 시간: ${Math.round(onlineDuration/60)}분`, 760, 580, 19, "#fff");
    lobbyButton("durPrev", 870, 560, 48, 38, "◀", "#2d225e", role !== "host");
    lobbyButton("durNext", 924, 560, 48, 38, "▶", "#2d225e", role !== "host");
    drawText(`BGM: ${onlineBgmLabel()}`, 630, 640, 17, "#fff0a8", "left");
    lobbyButton("bgmPrev", 870, 620, 48, 38, "◀", "#2d225e", role !== "host");
    lobbyButton("bgmNext", 924, 620, 48, 38, "▶", "#2d225e", role !== "host");
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
        else if (b.id === "bgmMute") { bgmMuted = !bgmMuted; applyVolumes(); saveSettings(); }
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
        else if (b.id === "sfxDown") { sfxVolume = Math.max(0, sfxVolume - 0.05); applyVolumes(); saveSettings(); }
        else if (b.id === "sfxUp") { sfxVolume = Math.min(1, sfxVolume + 0.05); applyVolumes(); saveSettings(); playSfx("coin"); }
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
      handleMenuClick(p.x, p.y);
      return;
    }
    if (state === "title") {
      const h = getTitleHotspot(p);
      if (h) { openTitleLink(h); return; }
    }
    if (state === "onlineLobby") {
      if (handleOnlineLobbyClick(p.x, p.y)) return;
    }
    const mr = menuRect();
    if (p.x >= mr.x && p.x <= mr.x + mr.w && p.y >= mr.y && p.y <= mr.y + mr.h) {
      if (state === "playing" && gameMode === "online") onlineReturnLobby(true, "온라인 로비로 돌아왔습니다.");
      else openMenu();
    }
  });

  canvas.addEventListener("mousemove", (evt) => {
    mouse = canvasPoint(evt);
    const overTitleLink = !!getTitleHotspot(mouse);
    const overLobbyButton = state === "onlineLobby" && onlineLobbyButtons.some(b => !b.disabled && inRect(mouse, b));
    const mr = menuRect();
    const overMenu = !menuOpen && mouse.x >= mr.x && mouse.x <= mr.x + mr.w && mouse.y >= mr.y && mouse.y <= mr.y + mr.h;
    canvas.style.cursor = (overTitleLink || overLobbyButton || overMenu) ? "pointer" : "default";
  });

  canvas.addEventListener("mouseleave", () => {
    mouse = { x: -999, y: -999 };
    canvas.style.cursor = "default";
  });


  window.addEventListener("pointerdown", () => {
    if (state === "title") unlockAudio();
  }, { once: true });

  function startSingle() {
    gameMode = "single";
    stage5FailCount = 0;
    closePeer();
    local = defaultPlayer(selectedChar, "left");
    remote = defaultPlayer(1 - selectedChar, "right", "AI " + chars[1 - selectedChar].name);
    finalStats = [];
    startStage(0);
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
    particles = [];
    floating = [];
    aiAcc = 0;
    aiSurge = 0;
    aiCatchupActive = false;
    result = null;
    stageStart = nowSec();
    setState("playing");
    addText(W/2, 170, `${STAGES[idx].name} 시작!`, "#fff0a8", 42, 1.3);
    if (gameMode === "online" && broadcast) sendMsg({ type: "stage_start", stage: idx });
  }

  function finishStage() {
    result = {
      win: local.score >= remote.score,
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
    };
    if (gameMode !== "online") finalStats.push(result);
    playSfx(result.win ? "resultWin" : "resultLose", 1.0);
    setState("result");
  }

  function timeLeft() {
    const baseNow = (menuOpen && state === "playing" && pauseStarted > 0) ? pauseStarted : nowSec();
    return Math.max(0, stageDuration - (baseNow - stageStart));
  }

  function updateAI(dt) {
    if (gameMode !== "single" || state !== "playing") return;
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
        if (isLocal) addText(330, 250, "B 키 종료", "#ffe0b0", 26, .9);
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
        addText(330, 230, "별풍선 터짐! B활성 +500CPM", "#ffd6ff", 32, 1.2);
        playSfx("starActivate", 1.15);
        sendMsg({ type: "item", item: "star" });
      }

      if (manual >= DONGGOP_THRESHOLD) player.donggopSustain += dt;
      else player.donggopSustain = 0;
      if (player.donggopSustain >= DONGGOP_SUSTAIN) {
        player.donggopSustain = 0;
        if (player.donggopItems < 5) {
          player.donggopItems++;
          player.donggopEarned++;
          addText(330, 305, "동꼽(자동사냥) 획득! 5번", "#bfe8ff", 28, 1.0);
          playSfx("ready");
        } else {
          addText(330, 305, "동꼽(자동사냥) 최대 5개", "#ffd08a", 26, .9);
        }
      }

      if (player.donggopBuffs.length > 0 || player.feverTimer > 0 || player.fUnlocked) {
        const starBonus = player.fUnlocked ? 500 : 0;
        const bonus = (player.donggopBuffs.length * DONGGOP_CPM + starBonus + (player.feverTimer > 0 ? FEVER_CPM : 0)) / 60;
        player.autoAcc = (player.autoAcc || 0) + bonus * dt;
        const count = Math.floor(player.autoAcc);
        player.autoAcc -= count;
        for (let i=0; i<Math.min(count, 20); i++) hit(player, false, gameMode === "online", "auto", false);
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
      <p class="ok">방식: 수동 WebRTC P2P 코드 교환</p>
      <p>1명은 <b>방 만들기</b>, 다른 1명은 <b>방 참가</b>를 누르세요.</p>
      <p class="warn">VPN, 회사/학교 방화벽, LTE/5G 일부 환경에서는 WebRTC P2P 연결이 실패할 수 있습니다.</p>
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

  function handleKey(e) {
    if (waitingKeyAction) {
      const nk = normalizeGameKey(e);
      if (e.key !== "Escape" && e.key !== "Enter" && nk) {
        const used = Object.entries(keyConfig).find(([name, val]) => val === nk && name !== waitingKeyAction);
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
      if (state === "playing" && gameMode === "online" && !menuOpen) onlineReturnLobby(true, "온라인 로비로 돌아왔습니다.");
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
    if (state === "onlineCountdown") return;
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
      if (e.key === "Enter" || e.key === " ") startSingle();
      if (k === "o") openConnectionPanel();
      return;
    }
    if (state === "playing") {
      if (keyMatch(e, keyConfig.hit) || (keyMatch(e, keyConfig.star) && local.fUnlocked)) {
        hit(local, true, gameMode === "online", keyMatch(e, keyConfig.hit) ? keyLabel(keyConfig.hit) : keyLabel(keyConfig.star), true);
      } else if (keyMatch(e, keyConfig.star) && !local.fUnlocked) {
        addText(330, 255, local.fCooldown > 0 ? `${keyLabel(keyConfig.star)} 쿨타임 ${local.fCooldown.toFixed(1)}s` : `${keyLabel(keyConfig.star)} 키 잠김`, "#ffc88a", 26, .8);
      } else if (keyMatch(e, keyConfig.auto)) {
        if (local.fUnlocked) addText(330, 300, `자동사냥은 ${keyLabel(keyConfig.star)}와 중복 불가`, "#ffd08a", 25, .9);
        else if (local.donggopItems <= 0) addText(330, 300, "동꼽(자동사냥) 없음", "#eee", 25, .8);
        else {
          local.donggopItems--;
          local.donggopBuffs.push(DONGGOP_DURATION);
          addText(330, 300, "동꼽(자동사냥) 발동! +300CPM", "#bfe8ff", 32, 1.0);
          playSfx("item");
          sendMsg({ type: "item", item: "donggop" });
        }
      }
      return;
    }
    if (state === "result" && e.key === "Enter") {
      if (result && result.autoReturnTitle) {
        result = null;
        finalStats = [];
        stage5FailCount = 0;
        setState("title");
      } else if (gameMode === "single") {
        if (result.win && stageIndex < STAGES.length - 1) startStage(stageIndex + 1);
        else if (!result.win) startStage(stageIndex);
        else {
          endingTimer = 5;
          setState("ending");
        }
      } else {
        onlineReturnLobby(true, "대전이 끝났습니다. 다시 READY를 누르면 새 대전을 시작합니다.");
      }
      return;
    }
    if (state === "ending" && e.key === "Enter") {
      setState("final");
      return;
    }
    if (state === "final" && e.key === "Enter") {
      result = null;
      finalStats = [];
      stage5FailCount = 0;
      setState("title");
      return;
    }
  }

  window.addEventListener("keydown", (e) => {
    const nk = normalizeGameKey(e);
    if (state === "onlineLobby" || [" ", "ArrowLeft", "ArrowRight"].includes(e.key) || Object.values(keyConfig).includes(nk)) e.preventDefault();
    handleKey(e);
  });

  function update(dt) {
    if (titleClickFlash > 0) titleClickFlash = Math.max(0, titleClickFlash - dt);
    if (state === "onlineCountdown" && onlineCountdownEnd > 0 && nowSec() >= onlineCountdownEnd) {
      startOnlineMatch();
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
      if (gameMode === "single") updateAI(dt);
      else sendState(false);
      if (timeLeft() <= 0) finishStage();
    }
    if (state === "ending") {
      endingTimer -= dt;
      if (endingTimer <= 0) setState("final");
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

  function frameFor(player) {
    const c = chars[player.char];
    if (player.donggopBuffs && player.donggopBuffs.length > 0) {
      const remaining = Math.max(...player.donggopBuffs);
      if (remaining <= 2.0) return c.autoEnd || c.frames[0];
      return c.autoFrames[Math.floor(nowSec()) % 2] || c.frames[0];
    }
    if (player.actionTimer > 0) {
      const currentCpm = Math.max(cpm(player, true), player.remoteCpm || 0);
      const frameRate = Math.max(8, Math.min(28, currentCpm / 42));
      const idx = Math.floor(nowSec() * frameRate) % 3;
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
      const roleLabel = isLeft ? "PLAYER" : "P2";
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

  function drawHUD() {
    const left = timeLeft();
    const mm = Math.floor(left/60).toString().padStart(2,"0");
    const ss = Math.floor(left%60).toString().padStart(2,"0");
    drawText(gameMode === "single" ? `${STAGES[stageIndex].name} / AI 대전` : "ONLINE 1:1 대전", W/2, 28, 28, "#fff");
    drawText(`${mm}:${ss}`, W/2, 76, 42, "#fff0a8");
    drawText(gameMode === "single" ? `난이도 ${STAGES[stageIndex].rank}` : `${getLocalName()} vs ${remote ? remote.name : "상대"}`, W/2, 114, 22, "#fff");

    drawPanel(220, 590, 840, 128);
    const bStatus = local.fUnlocked
      ? `별풍선 터짐(B활성) ${local.fTimer.toFixed(1)}s`
      : local.fCooldown > 0
        ? `별풍선 안터짐(B쿨 ${local.fCooldown.toFixed(1)}s)`
        : "별풍선 안터짐(B잠김)";
    drawText(`${keyLabel(keyConfig.hit)}: 동꼽   ${keyLabel(keyConfig.star)}(별풍선): ${bStatus}   ${keyLabel(keyConfig.auto)}: 동꼽(자동사냥) x${local.donggopItems}/5`, W/2, 611, 17, "#fff");

    const manual = cpm(local, true);
    const cpmRatio = Math.max(0, Math.min(1, manual / STAR_THRESHOLD));
    const sustainRatio = Math.max(0, Math.min(1, local.starSustain / STAR_SUSTAIN));

    drawText(`별풍선 ${manual}/${STAR_THRESHOLD} CPM`, 285, 640, 15, "#fff0a8", "left");
    drawBar(505, 631, 400, 16, cpmRatio, "#ff8ee4", "#fff0a8");

    drawText(`별풍리액션텐션 ${local.starSustain.toFixed(1)}/${STAR_SUSTAIN.toFixed(0)}초`, 285, 667, 15, "#bfe8ff", "left");
    drawBar(505, 658, 400, 16, sustainRatio, "#8bdfff", "#bfe8ff");

    const dong = local.donggopBuffs.length ? `${Math.max(...local.donggopBuffs).toFixed(1)}s` : "대기";
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

  function drawFinal() {
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
    drawText("ENTER : 초기화면으로", W/2, 610, 25, "#bfe8ff");
  }

  function render() {
    ctx.clearRect(0,0,W,H);
    if (state === "loading") {
      ctx.fillStyle = "#050512"; ctx.fillRect(0,0,W,H);
      drawText("Loading...", W/2, H/2, 42, "#fff");
    } else if (state === "title") {
      drawImageCover(assets.title || assets.bg, 0,0,W,H);
      drawTitleHoverVfx();
      drawParticles();
      const bob = Math.sin(nowSec()*3)*8;
      if (assets.enterKey) ctx.drawImage(assets.enterKey, 450, 585+bob, 90, 90);
      if (assets.spaceKey) ctx.drawImage(assets.spaceKey, 585, 610-bob, 260, 72);
      drawText("ENTER / SPACE", W/2, 660+bob, 38, "#fff0a8");
    } else if (state === "select") {
      drawImageCover(assets.select || assets.bg, 0,0,W,H);
      drawSelectionHighlight();
      drawText("A / ← : 슈니    D / → : 다시바", W/2, 620, 34, "#fff0a8");
      drawText(`현재 선택: ${chars[selectedChar].name}`, W/2, 670, 30, "#fff");
    } else if (state === "mode") {
      drawImageCover(assets.bg,0,0,W,H);
      drawPanel(220,155,840,410);
      drawText("동꼽즈 게임 모드", W/2, 220, 48, "#fff");
      drawText(`선택 캐릭터: ${chars[selectedChar].name}`, W/2, 285, 32, "#fff0a8");
      drawText("ENTER / SPACE : 싱글 플레이 AI 대전", W/2, 370, 32, "#bfe8ff");
      drawText("O : ONLINE 1:1 대전", W/2, 425, 32, "#ffd6ff");
      drawText("우측 하단 MENU 또는 ESC : 볼륨 / 설명 / 일시정지", W/2, 500, 21, "#fff0a8");
    } else if (state === "connected") {
      drawImageCover(assets.bg,0,0,W,H);
      drawPanel(270,220,740,260);
      drawText("ONLINE 연결 완료", W/2, 285, 46, "#fff0a8");
      drawText("온라인 로비로 이동합니다.", W/2, 360, 28, "#fff");
    } else if (state === "onlineLobby") {
      drawOnlineLobby();
    } else if (state === "onlineCountdown") {
      drawOnlineCountdown();
    } else if (state === "playing") {
      drawImageCover(assets.bg,0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0,0,W,H);
      drawPlayer(local, 330, 410, true);
      drawPlayer(remote, 950, 410, false);
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W/2,190); ctx.lineTo(W/2,520); ctx.stroke();
      drawParticles();
      drawHUD();
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
      drawPanel(250, 335, 780, 245);
      drawText(`${local.name} ${result.localScore} : ${result.remoteScore} ${remote.name}`, W/2, 365, 30);
      drawText(`최대 연타 ${result.maxCpm} CPM / 키보드 ${result.maxManualCpm} CPM`, W/2, 417, 25);
      drawText(`별풍선 ${result.star}회 / 동꼽 ${result.donggop}개 / 피버 ${result.fever}회`, W/2, 467, 25);
      drawText(`최대 콤보 ${result.combo}`, W/2, 517, 25);

      let next = gameMode === "single" ? (result.win ? (stageIndex < 4 ? "다음 스테이지" : "엔딩 보기") : "재도전") : "온라인 로비";
      if (result.autoReturnTitle) {
        drawText(`5스테이지 3회 실패 - ${Math.ceil(result.returnTimer || 3)}초 후 초기화면`, W/2, 585, 23, "#ffb3c7");
        next = "초기화면";
      } else if (stageIndex === 4 && !result.win) {
        drawText(`5스테이지 실패 ${result.stage5FailCount || stage5FailCount}/3`, W/2, 585, 23, "#ffb3c7");
      }
      drawText(`ENTER : ${next}`, W/2, 645, 27, "#fff0a8");
    } else if (state === "ending") {
      const key = chars[selectedChar].ending;
      drawImageCover(assets[key] || assets.bg, 0,0,W,H);
      ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(0,0,W,H);
      drawEndingVfx();
      drawText(`${chars[selectedChar].name} 엔딩`, W/2, 80, 48, "#fff0a8");
      drawText("ENTER : 최종 결과", W/2, 660, 28, "#fff");
    } else if (state === "final") {
      drawFinal();
    }
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

  loadSettings();
  applyVolumes();

  Promise.all(Object.entries(assetList).map(([k,v]) => loadImage(k,v))).then(() => {
    setState("title");
    tryTitleAutoplay();
    requestAnimationFrame(loop);
  });
})();
