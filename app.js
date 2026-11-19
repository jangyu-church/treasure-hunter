/* ==========================================================================
   트레저 헌터 X — GitHub Pages + Firebase Realtime DB 액션 보물찾기 웹앱
   ========================================================================== */

const DEFAULT_FIREBASE_DB_URL = 'https://treasure-hunt-e306b-default-rtdb.firebaseio.com';

const STORAGE_KEY_FB_URL = 'thx_firebase_db_url';
const STORAGE_KEY_LOCAL_DB = 'thx_local_rooms_db_v2';

let deferredInstallPrompt = null;

const state = {
  mode: 'IDLE', // 'IDLE' | 'LIVE' | 'DEMO'
  backendMode: 'FIREBASE', // 'FIREBASE' | 'SERVER' | 'LOCAL'
  firebaseUrl: localStorage.getItem(STORAGE_KEY_FB_URL) || DEFAULT_FIREBASE_DB_URL || '',
  roomCode: null,
  nickname: null,
  roomData: null,
  rawRoomsCache: {},
  soundEnabled: true,
  pollTimer: null,
  sonarTimer: null,

  // 센서 & 가상 시뮬레이션 위치 상태
  sensorsConnected: false,
  geoWatchId: null,
  userLat: null,
  userLng: null,
  deviceHeading: 0,
  simulatedDistance: 120,
  simulatedAngleOffset: 36,

  // 상자 타격 액션 상태
  chestHitsRemaining: 3,
  pendingCelebration: null,

  // AR 카메라 스트림
  arStream: null,
  arScanInterval: null,

  // 관리자 비밀번호
  adminPass: '1234'
};

/* ==================== 0. 기본 시드 데이터 (GODISLOVE & JESUS0691) ==================== */
function getInitialSeedRooms() {
  return {
    'GODISLOVE': {
      code: 'GODISLOVE',
      title: '성경 보물찾기 · 사랑의 성전 탐험',
      subtitle: '말씀 퀴즈를 풀고 황금 레이더와 AR 스캐너로 숨겨진 보물을 찾으세요!',
      theme: 'golden',
      createdAt: new Date().toISOString(),
      treasures: [
        {
          id: 't1',
          name: '솔로몬의 지혜의 황금 상자',
          points: 500,
          rarity: 'LEGENDARY',
          icon: '👑',
          lat: 37.5665,
          lng: 126.9780,
          hint: '본당 입구 오른쪽 커다란 느티나무 아래 화분 뒤를 살펴보세요. (확인코드: EDEN01)',
          confirmCode: 'EDEN01',
          quiz: {
            question: '"다만 너는 너의 이웃을 네 ( _____ )처럼 사랑하여라." 빈칸에 들어갈 한 글자는? (레위기 19:18)',
            answers: ['몸', '자신', '네몸'],
            hint: '한 글자입니다. 예수님이 두 번째 큰 계명으로 인용하셨습니다.'
          },
          claimedBy: null,
          claimedAt: null
        },
        {
          id: 't2',
          name: '다윗의 승리의 물맷돌 성배',
          points: 350,
          rarity: 'EPIC',
          icon: '🏆',
          lat: 37.5671,
          lng: 126.9786,
          hint: '야외 벤치 3번째 의자 아래쪽 기둥에 QR/코드 스티커가 붙어 있습니다. (확인코드: DAVID7)',
          confirmCode: 'DAVID7',
          quiz: {
            question: '소년 다윗이 거인 골리앗을 쓰러뜨릴 때 시냇가에서 고른 매끄러운 돌은 몇 개였을까요? (숫자만 입력)',
            answers: ['5', '5개', '다섯', '다섯개'],
            hint: '손가락 한쪽 손의 개수와 같습니다. (사무엘상 17:40)'
          },
          claimedBy: null,
          claimedAt: null
        },
        {
          id: 't3',
          name: '모세의 기적의 지팡이 크리스탈',
          points: 400,
          rarity: 'EPIC',
          icon: '💎',
          lat: 37.5659,
          lng: 126.9774,
          hint: '분수대(또는 식수대) 맞은편 안내판 뒤편을 확인해 보세요. (확인코드: MOSES3)',
          confirmCode: 'MOSES3',
          quiz: {
            question: '출애굽 당시 이스라엘 백성이 건넌 바다의 이름은 무엇일까요?',
            answers: ['홍해', '홍해바다'],
            hint: '붉을 홍(紅) 자를 쓰는 바다입니다.'
          },
          claimedBy: null,
          claimedAt: null
        },
        {
          id: 't4',
          name: '에덴의 생명나무 황금 열매',
          points: 600,
          rarity: 'MYTHIC',
          icon: '🌟',
          lat: 37.5668,
          lng: 126.9772,
          hint: '산책로 계단 난간 첫 번째 기둥 안쪽을 확인하세요. (확인코드: LIFE99)',
          confirmCode: 'LIFE99',
          quiz: {
            question: '성령의 9가지 열매 중 첫 번째로 언급되는 열매는 무엇일까요? (갈라디아서 5:22)',
            answers: ['사랑'],
            hint: '믿음, 소망, 그리고 이 중에 제일은 이것입니다.'
          },
          claimedBy: null,
          claimedAt: null
        }
      ],
      participants: {},
      feed: [
        {
          id: 'f0',
          type: 'SYSTEM',
          message: '✨ [성경 보물찾기 · 사랑의 성전 탐험 (방 코드: GODISLOVE)] 게임방이 열렸습니다!',
          timestamp: new Date().toISOString()
        }
      ]
    },
    'JESUS0691': {
      code: 'JESUS0691',
      title: '장유교회 액션 보물찾기 · 황금 면류관',
      subtitle: '실시간 GPS 소나 레이더와 AR 카메라로 숨겨진 황금 유물을 탈환하라!',
      theme: 'cyber',
      createdAt: new Date().toISOString(),
      treasures: [
        {
          id: 'g1',
          name: '생명수의 코어 크리스탈',
          points: 500,
          rarity: 'MYTHIC',
          icon: '🔮',
          lat: 37.5665,
          lng: 126.9780,
          hint: '중앙 광장 시계탑(또는 큰 나무) 남쪽 3걸음 아래를 확인하세요! (확인코드: CORE01)',
          confirmCode: 'CORE01',
          quiz: {
            question: '나침반에서 동쪽(East)을 가리키는 알파벳 이니셜은 무엇일까요?',
            answers: ['E', 'e', '동', '동쪽'],
            hint: 'North(N), South(S), West(W), 그리고 East(?)'
          },
          claimedBy: null,
          claimedAt: null
        },
        {
          id: 'g2',
          name: '진리의 황금 나침반',
          points: 400,
          rarity: 'LEGENDARY',
          icon: '🧭',
          lat: 37.5670,
          lng: 126.9785,
          hint: '휴게 데크 나무 기둥 뒤쪽에 숨겨져 있습니다! (확인코드: SUN777)',
          confirmCode: 'SUN777',
          quiz: {
            question: '지구에서 가장 가까운 항성(스스로 빛을 내는 별)의 이름은 무엇일까요?',
            answers: ['태양', '해', 'SUN'],
            hint: '낮에 하늘에서 밝게 빛나는 별입니다.'
          },
          claimedBy: null,
          claimedAt: null
        },
        {
          id: 'g3',
          name: '언약의 에메랄드 성배',
          points: 350,
          rarity: 'EPIC',
          icon: '🏆',
          lat: 37.5661,
          lng: 126.9776,
          hint: '정원 바위 옆 초록색 상자를 찾아보세요! (확인코드: DRG888)',
          confirmCode: 'DRG888',
          quiz: {
            question: '1시간은 몇 분일까요? (숫자만 입력)',
            answers: ['60', '60분'],
            hint: '1분은 60초, 1시간은 ○○분입니다.'
          },
          claimedBy: null,
          claimedAt: null
        }
      ],
      participants: {},
      feed: [
        {
          id: 'f1',
          type: 'SYSTEM',
          message: '⚡ [장유교회 액션 보물찾기 (방 코드: JESUS0691)] 탐험이 시작되었습니다!',
          timestamp: new Date().toISOString()
        }
      ]
    }
  };
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3200);
}

/* ==================== 1. 통합 데이터 엔진 (Firebase Realtime DB + Local Server + GitHub Pages Static) ==================== */
function normalizeFirebaseUrl(url) {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (clean.endsWith('.json')) {
    clean = clean.replace(/\/[^/]*\.json$/, '');
  }
  return clean;
}

function updateCloudBadge() {
  const pill = document.getElementById('cloud-status-pill');
  const text = document.getElementById('cloud-status-text');
  if (!pill || !text) return;

  const fbUrl = normalizeFirebaseUrl(state.firebaseUrl);
  if (fbUrl) {
    state.backendMode = 'FIREBASE';
    pill.classList.add('firebase');
    text.textContent = 'LIVE';
  } else if (state.backendMode === 'LOCAL') {
    pill.classList.remove('firebase');
    text.textContent = 'LOCAL';
  } else {
    pill.classList.remove('firebase');
    text.textContent = 'LIVE';
  }
}

async function fetchAllRoomsMap() {
  const fbUrl = normalizeFirebaseUrl(state.firebaseUrl);

  if (fbUrl) {
    const res = await fetch(`${fbUrl}/rooms.json`);
    if (!res.ok) throw new Error('Firebase DB 접속 실패');
    let rooms = await res.json();

    // 비어있거나 구버전 샘플 방(9B64641F / GOLD2026)만 있고 새 방(GODISLOVE / JESUS0691)이 없을 경우 자동 마이그레이션!
    const needsMigration =
      !rooms ||
      Object.keys(rooms).length === 0 ||
      ((rooms['9B64641F'] || rooms['GOLD2026']) && !rooms['GODISLOVE'] && !rooms['JESUS0691']);

    if (needsMigration) {
      const seed = getInitialSeedRooms();
      // 만약 사용자가 추가로 만든 커스텀 방이 있다면 유지하고 9B64641F/GOLD2026만 GODISLOVE/JESUS0691로 교체
      const merged = { ...(rooms || {}), ...seed };
      delete merged['9B64641F'];
      delete merged['GOLD2026'];
      rooms = merged;
      await fetch(`${fbUrl}/rooms.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rooms)
      });
    }

    Object.values(rooms).forEach(r => {
      r.treasures = Array.isArray(r.treasures) ? r.treasures : Object.values(r.treasures || {});
      r.participants = r.participants || {};
      r.feed = Array.isArray(r.feed) ? r.feed : Object.values(r.feed || {});
    });
    state.rawRoomsCache = rooms;
    state.backendMode = 'FIREBASE';
    updateCloudBadge();
    return rooms;
  }

  state.backendMode = 'LOCAL';
  updateCloudBadge();
  const saved = localStorage.getItem(STORAGE_KEY_LOCAL_DB);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.rawRoomsCache = parsed;
      return parsed;
    } catch (_) {}
  }
  const seed = getInitialSeedRooms();
  localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(seed));
  state.rawRoomsCache = seed;
  return seed;
}

async function saveSingleRoomToCloudOrLocal(room) {
  const fbUrl = normalizeFirebaseUrl(state.firebaseUrl);
  if (fbUrl) {
    await fetch(`${fbUrl}/rooms/${encodeURIComponent(room.code)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room)
    });
    state.rawRoomsCache[room.code] = room;
    return;
  }

  state.rawRoomsCache[room.code] = room;
  localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(state.rawRoomsCache));
}

function buildPlayerRoomView(room, nickname) {
  const treasures = Array.isArray(room.treasures) ? room.treasures : Object.values(room.treasures || {});
  const participants = room.participants || {};
  const feed = Array.isArray(room.feed) ? room.feed : Object.values(room.feed || {});

  const totalTreasures = treasures.length;
  const unclaimed = treasures.filter(t => !t.claimedBy);
  const claimed = treasures.filter(t => t.claimedBy);

  const player = nickname && participants[nickname] ? participants[nickname] : null;
  let activeTreasure = null;

  if (player && player.targetTreasureId) {
    const t = treasures.find(item => item.id === player.targetTreasureId);
    if (t && !t.claimedBy) {
      activeTreasure = {
        id: t.id,
        name: t.name,
        points: t.points,
        rarity: t.rarity || 'LEGENDARY',
        icon: t.icon || '💎',
        lat: t.lat,
        lng: t.lng,
        hint: player.quizSolved ? t.hint : null,
        quiz: {
          question: t.quiz.question,
          hint: t.quiz.hint
        },
        quizSolved: !!player.quizSolved
      };
    } else if (t && t.claimedBy && t.claimedBy !== nickname) {
      activeTreasure = {
        id: t.id,
        name: t.name,
        stolenBy: t.claimedBy,
        stolenAt: t.claimedAt
      };
    }
  }

  const leaderboard = Object.values(participants)
    .map(p => ({
      nickname: p.nickname,
      score: p.score || 0,
      foundCount: (p.foundTreasures || []).length,
      lastActive: p.lastActive
    }))
    .sort((a, b) => b.score - a.score || b.foundCount - a.foundCount);

  const myTreasures = treasures
    .filter(t => t.claimedBy === nickname)
    .map(t => ({
      id: t.id,
      name: t.name,
      points: t.points,
      rarity: t.rarity,
      icon: t.icon,
      claimedAt: t.claimedAt
    }));

  return {
    code: room.code,
    title: room.title,
    subtitle: room.subtitle,
    theme: room.theme || 'golden',
    totalCount: totalTreasures,
    remainingCount: unclaimed.length,
    claimedCount: claimed.length,
    allComplete: unclaimed.length === 0,
    player: player
      ? {
          nickname: player.nickname,
          score: player.score || 0,
          foundCount: myTreasures.length,
          quizSolved: !!player.quizSolved,
          targetTreasureId: player.targetTreasureId
        }
      : null,
    activeTreasure,
    myTreasures,
    claimedList: claimed,
    leaderboard: leaderboard.slice(0, 15),
    feed: feed.slice(-12).reverse()
  };
}

function assignRandomTreasureClient(room, player, excludeId = null) {
  let unclaimed = room.treasures.filter(t => !t.claimedBy);
  if (unclaimed.length === 0) {
    player.targetTreasureId = null;
    player.quizSolved = false;
    return null;
  }
  if (excludeId && unclaimed.length > 1) {
    unclaimed = unclaimed.filter(t => t.id !== excludeId);
  }
  const chosen = unclaimed[Math.floor(Math.random() * unclaimed.length)];
  player.targetTreasureId = chosen.id;
  player.quizSolved = false;
  return chosen;
}

/* ==================== 2. 웹 오디오 신디사이저 & 진동 피드백 ==================== */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function triggerVibration(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

function playSonarPing(distance = 100) {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const clamped = Math.max(5, Math.min(200, distance));
  const freq = 520 + (1 - clamped / 200) * 680;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.16);

  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.19);

  if (distance <= 25) {
    triggerVibration([35]);
  }
}

function playQuizSuccessSound() {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const now = ctx.currentTime + idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  });
  triggerVibration([40, 30, 70]);
}

function playChestHitSound() {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
  gain.gain.setValueAtTime(0.26, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
  triggerVibration([60]);
}

function playVictoryFanfare() {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const melody = [
    { f: 523.25, d: 0.12, t: 0 },
    { f: 659.25, d: 0.12, t: 0.12 },
    { f: 783.99, d: 0.12, t: 0.24 },
    { f: 1046.5, d: 0.35, t: 0.36 },
    { f: 987.77, d: 0.12, t: 0.72 },
    { f: 1046.5, d: 0.5, t: 0.85 }
  ];
  melody.forEach(n => {
    const now = ctx.currentTime + n.t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, now);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + n.d + 0.02);
  });
  triggerVibration([80, 40, 80, 40, 160]);
}

function playErrorSound() {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.setValueAtTime(145, now + 0.12);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/* ==================== 3. 배경 황금 파티클 & 폭죽 컨페티 캔버스 ==================== */
function initBackgroundParticles() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 55 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2.4 + 0.7,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -Math.random() * 0.55 - 0.15,
    alpha: Math.random() * 0.65 + 0.2,
    color: Math.random() > 0.35 ? '#fde047' : '#34d399'
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

let confettiPieces = [];
let confettiAnimating = false;

function launchConfettiBurst() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#fde047', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#ffffff'];
  for (let i = 0; i < 130; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 14 + 4;
    confettiPieces.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: Math.random() * 9 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 14,
      alpha: 1
    });
  }

  if (!confettiAnimating) {
    confettiAnimating = true;
    function step() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32;
        p.rot += p.vRot;
        p.alpha -= 0.011;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      });
      confettiPieces = confettiPieces.filter(p => p.alpha > 0);
      if (confettiPieces.length > 0) {
        requestAnimationFrame(step);
      } else {
        confettiAnimating = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(step);
  }
}

/* ==================== 4. GPS 거리 & 방위각 계산 ==================== */
function computeDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function computeBearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* ==================== 5. 소나 비프 루프 & 레이더 UI 업데이트 ==================== */
function stopSonarLoop() {
  if (state.sonarTimer) {
    clearTimeout(state.sonarTimer);
    state.sonarTimer = null;
  }
}

function startSonarLoop() {
  stopSonarLoop();
  function tick() {
    const radarStage = document.getElementById('stage-radar');
    if (state.mode === 'IDLE' || !radarStage || radarStage.classList.contains('hidden')) {
      return;
    }
    const dist = getCurrentDistance();
    playSonarPing(dist);

    const nextInterval = Math.max(360, Math.min(2200, dist * 16));
    state.sonarTimer = setTimeout(tick, nextInterval);
  }
  state.sonarTimer = setTimeout(tick, 700);
}

function getCurrentDistance() {
  const t = state.roomData?.activeTreasure;
  if (state.sensorsConnected && state.userLat != null && t && t.lat != null) {
    return computeDistanceMeters(state.userLat, state.userLng, t.lat, t.lng);
  }
  return state.simulatedDistance;
}

function getCurrentRelativeAngle() {
  const t = state.roomData?.activeTreasure;
  if (state.sensorsConnected && state.userLat != null && t && t.lat != null) {
    const bearing = computeBearingDegrees(state.userLat, state.userLng, t.lat, t.lng);
    return (bearing - state.deviceHeading + 360) % 360;
  }
  return (state.simulatedAngleOffset + 360) % 360;
}

function updateRadarVisuals() {
  const dist = getCurrentDistance();
  const relAngle = getCurrentRelativeAngle();

  const distEl = document.getElementById('radar-distance-num');
  const arrowEl = document.getElementById('radar-direction-arrow');
  const dialEl = document.getElementById('compass-dial-ring');
  const blipEl = document.getElementById('radar-target-blip');
  const heatWrap = document.getElementById('radar-heat-container');
  const heatFill = document.getElementById('heat-meter-fill');
  const heatText = document.getElementById('heat-status-text');
  const heatChip = document.getElementById('radar-heat-chip');
  const guideText = document.getElementById('radar-guidance-text');

  if (distEl) distEl.textContent = dist;
  if (arrowEl) arrowEl.style.transform = `rotate(${relAngle}deg)`;
  if (dialEl) dialEl.style.transform = `rotate(${-state.deviceHeading}deg)`;

  if (blipEl) {
    const normRadius = Math.min(40, Math.max(12, (dist / 150) * 40));
    const rad = ((relAngle - 90) * Math.PI) / 180;
    const xPct = 50 + Math.cos(rad) * normRadius;
    const yPct = 50 + Math.sin(rad) * normRadius;
    blipEl.style.left = `${xPct}%`;
    blipEl.style.top = `${yPct}%`;
  }

  const heatPercent = Math.max(10, Math.min(100, Math.round((1 - dist / 160) * 100)));
  if (heatFill) heatFill.style.width = `${heatPercent}%`;

  if (dist <= 20) {
    if (heatWrap) heatWrap.setAttribute('data-heat', 'hot');
    if (heatText) heatText.textContent = '⚡ RED HOT! 보물이 바로 코앞에 있습니다!';
    if (heatChip) heatChip.textContent = '🔥 RED HOT · 보물 근접 경보!';
  } else if (dist <= 75) {
    if (heatWrap) heatWrap.setAttribute('data-heat', 'warm');
    if (heatText) heatText.textContent = '🔥 WARM (보물 신호가 점점 강해집니다!)';
    if (heatChip) heatChip.textContent = '📡 추적 중 · SONAR LOCK-ON';
  } else {
    if (heatWrap) heatWrap.setAttribute('data-heat', 'cold');
    if (heatText) heatText.textContent = '❄️ COLD (화살표 방향으로 이동하세요)';
    if (heatChip) heatChip.textContent = '🛰️ 장거리 소나 탐색 중';
  }

  if (guideText) {
    if (dist <= 15) {
      guideText.innerHTML = '🎉 <strong>보물 반경 15m 이내 진입!</strong> 은신처 힌트를 보거나 <strong>AR 카메라 스캐너</strong>를 켜세요!';
    } else if (relAngle <= 22 || relAngle >= 338) {
      guideText.textContent = '⬆️ 정면 방향 정확히 일치! 그대로 직진하세요!';
    } else if (relAngle < 180) {
      guideText.textContent = `↪️ 오른쪽으로 약 ${Math.round(relAngle)}° 방향을 돌려 이동하세요.`;
    } else {
      guideText.textContent = `↩️ 왼쪽으로 약 ${Math.round(360 - relAngle)}° 방향을 돌려 이동하세요.`;
    }
  }

  const arDist = document.getElementById('ar-hud-dist');
  if (arDist) arDist.textContent = `DIST: ${dist}m`;
}

/* ==================== 6. 실제 스마트폰 GPS & 나침반 센서 연결 ==================== */
async function connectRealSensors() {
  const btn = document.getElementById('btn-connect-sensors');

  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    } catch (err) {
      console.warn('방향 센서 권한 요청 실패:', err);
    }
  } else {
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
  }

  if ('geolocation' in navigator) {
    if (btn) btn.textContent = '🛰️ GPS 위성 신호 수신 중...';
    state.geoWatchId = navigator.geolocation.watchPosition(
      pos => {
        state.sensorsConnected = true;
        state.userLat = pos.coords.latitude;
        state.userLng = pos.coords.longitude;
        if (btn) btn.textContent = '✅ 실제 GPS · 나침반 연결됨';
        updateRadarVisuals();
      },
      err => {
        console.warn('GPS 연결 오차 또는 거부:', err);
        if (btn) btn.textContent = '🕹️ 가상 레이더 시뮬레이션 작동 중';
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );
  }
}

function handleOrientation(event) {
  let heading = null;
  if (typeof event.webkitCompassHeading === 'number') {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === 'number') {
    heading = (360 - event.alpha) % 360;
  }
  if (heading !== null) {
    state.deviceHeading = Math.round(heading);
    updateRadarVisuals();
  }
}

/* ==================== 7. 빠른 참여 오픈 방 로드 ==================== */
async function loadQuickRooms() {
  const container = document.getElementById('quick-rooms-list');
  if (!container) return;

  try {
    const roomsMap = await fetchAllRoomsMap();
    const rooms = Object.values(roomsMap);

    container.innerHTML = rooms
      .map(r => {
        const treasures = Array.isArray(r.treasures) ? r.treasures : Object.values(r.treasures || {});
        const rem = treasures.filter(t => !t.claimedBy).length;
        return `
          <div class="quick-room-item" data-quick-code="${r.code}">
            <div class="quick-room-top">
              <span class="quick-room-code">방 코드: ${r.code}</span>
              <span class="quick-room-rem">남은 보물 ${rem} / ${treasures.length}</span>
            </div>
            <div class="quick-room-name">${r.title}</div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-quick-code]').forEach(el => {
      el.addEventListener('click', () => {
        const code = el.getAttribute('data-quick-code');
        openJoinModal(code);
      });
    });
  } catch (e) {
    console.error('방 목록 로드 실패:', e);
  }
}

/* ==================== 8. 방 입장 & 체험 모드(Demo) & 실시간 동기화 ==================== */
function openJoinModal(prefillCode = '') {
  const modal = document.getElementById('modal-join');
  const codeInput = document.getElementById('input-join-code');
  const errEl = document.getElementById('join-error-msg');
  if (errEl) errEl.classList.add('hidden');
  if (codeInput && prefillCode) codeInput.value = prefillCode;
  if (modal) modal.classList.remove('hidden');
}

function startDemoMode() {
  stopPolling();
  state.mode = 'DEMO';
  state.roomCode = 'DEMO';
  state.nickname = '황금탐험가';
  state.simulatedDistance = 120;
  state.simulatedAngleOffset = 35;

  state.roomData = {
    code: 'DEMO',
    title: '✨ 황금 숲속의 비밀 · 액션 체험 모드',
    subtitle: '실내·PC에서도 퀴즈 봉인 해제, 소나 레이더 사운드, AR 카메라와 상자 타격을 모두 체험해 보세요!',
    theme: 'golden',
    totalCount: 1,
    remainingCount: 1,
    claimedCount: 0,
    allComplete: false,
    player: {
      nickname: '황금탐험가',
      score: 0,
      foundCount: 0,
      quizSolved: false,
      targetTreasureId: 'demo_1'
    },
    activeTreasure: {
      id: 'demo_1',
      name: '엘도라도의 황금 태양 성배',
      points: 777,
      rarity: 'MYTHIC',
      icon: '🏆',
      lat: 37.5665,
      lng: 126.978,
      hint: '커다란 나무 옆 황금빛 상자를 찾아보세요! (체험용 현장 확인 코드는 FOREST 입니다)',
      confirmCode: 'FOREST',
      quiz: {
        question: '나침반에서 북쪽(North)을 가리키는 알파벳 한 글자는 무엇일까요? (정답: N 또는 북쪽)',
        hint: '알파벳 N 또는 한글로 "북쪽"을 입력해 보세요!'
      },
      quizSolved: false
    },
    myTreasures: [],
    claimedList: [],
    leaderboard: [
      { nickname: '황금탐험가 (나)', score: 0, foundCount: 0 },
      { nickname: '다윗용사', score: 350, foundCount: 1 }
    ],
    feed: [
      {
        id: 'df1',
        message: '🎮 액션 체험 모드가 시작되었습니다! 먼저 퀴즈를 풀어 황금 소나 레이더를 가동하세요!'
      }
    ]
  };

  switchTab('explore');
  renderActiveHuntView();
}

async function joinLiveRoom(code, nickname) {
  const errEl = document.getElementById('join-error-msg');
  const cleanCode = (code || '').trim().toUpperCase();
  const cleanNick = (nickname || '').trim();

  if (!cleanCode || !cleanNick) return;

  try {
    const roomsMap = await fetchAllRoomsMap();
    const room = roomsMap[cleanCode];
    if (!room) {
      errEl.textContent = '존재하지 않는 게임방 코드입니다. (예: GODISLOVE 또는 JESUS0691)';
      errEl.classList.remove('hidden');
      playErrorSound();
      return;
    }

    room.participants = room.participants || {};
    room.feed = Array.isArray(room.feed) ? room.feed : Object.values(room.feed || {});

    if (!room.participants[cleanNick]) {
      room.participants[cleanNick] = {
        nickname: cleanNick,
        score: 0,
        foundTreasures: [],
        targetTreasureId: null,
        quizSolved: false,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      room.feed.push({
        id: `f_${Date.now()}`,
        type: 'JOIN',
        message: `🧭 새로운 탐험가 [${cleanNick}]님이 모험에 합류했습니다!`,
        timestamp: new Date().toISOString()
      });
    }

    const player = room.participants[cleanNick];
    player.lastActive = new Date().toISOString();
    const currentTarget = room.treasures.find(t => t.id === player.targetTreasureId);
    if (!currentTarget || currentTarget.claimedBy) {
      assignRandomTreasureClient(room, player);
    }

    await saveSingleRoomToCloudOrLocal(room);
    const viewData = buildPlayerRoomView(room, cleanNick);

    state.mode = 'LIVE';
    state.roomCode = viewData.code;
    state.nickname = cleanNick;
    state.roomData = viewData;
    state.simulatedDistance = 105;
    state.simulatedAngleOffset = 28;

    document.getElementById('modal-join').classList.add('hidden');
    if (viewData.theme) setVisualTheme(viewData.theme);
    switchTab('explore');
    renderActiveHuntView();
    startLivePolling();
  } catch (err) {
    errEl.textContent = `연결 오류: ${err.message}`;
    errEl.classList.remove('hidden');
  }
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

function startLivePolling() {
  stopPolling();
  state.pollTimer = setInterval(async () => {
    if (state.mode !== 'LIVE' || !state.roomCode || !state.nickname) return;
    try {
      const roomsMap = await fetchAllRoomsMap();
      const room = roomsMap[state.roomCode];
      if (!room) return;
      const fresh = buildPlayerRoomView(room, state.nickname);

      if (fresh.activeTreasure && fresh.activeTreasure.stolenBy) {
        const stolenName = fresh.activeTreasure.name;
        const thief = fresh.activeTreasure.stolenBy;
        showAlertModal(
          '☁️',
          'A STEP TOO LATE',
          '아앗! 한발 늦은 순간!',
          `추적 중이던 [${stolenName}] 보물을 방금 [${thief}]님이 먼저 발견했습니다! 다음 남은 보물로 타겟을 재설정합니다.`
        );
        await joinLiveRoom(state.roomCode, state.nickname);
        return;
      }

      state.roomData = fresh;
      renderSidebarAndMetaOnly();
      if (fresh.allComplete) {
        renderActiveHuntView();
      }
    } catch (_) {}
  }, 2500);
}

/* ==================== 9. 액티브 탐험 화면 렌더링 ==================== */
function renderActiveHuntView() {
  const landingEl = document.getElementById('explore-landing');
  const activeEl = document.getElementById('explore-active');
  if (state.mode === 'IDLE' || !state.roomData) {
    landingEl.classList.remove('hidden');
    activeEl.classList.add('hidden');
    stopSonarLoop();
    return;
  }

  landingEl.classList.add('hidden');
  activeEl.classList.remove('hidden');

  const d = state.roomData;
  document.getElementById('active-room-badge').textContent =
    state.mode === 'DEMO' ? '🎮 DEMO MODE' : `방 코드 · ${d.code}`;
  document.getElementById('active-room-title').textContent = d.title;
  document.getElementById('active-room-subtitle').textContent = d.subtitle;
  document.getElementById('active-player-name').textContent = state.nickname;
  document.getElementById('active-player-score').textContent = `${d.player?.score || 0} PTS`;

  const stageQuiz = document.getElementById('stage-quiz');
  const stageRadar = document.getElementById('stage-radar');
  const stageFinale = document.getElementById('stage-finale');

  stageQuiz.classList.add('hidden');
  stageRadar.classList.add('hidden');
  stageFinale.classList.add('hidden');

  if (d.allComplete || !d.activeTreasure) {
    stageFinale.classList.remove('hidden');
    stopSonarLoop();
  } else if (!d.activeTreasure.quizSolved) {
    stageQuiz.classList.remove('hidden');
    stopSonarLoop();
    const t = d.activeTreasure;
    document.getElementById('quiz-remaining-pill').textContent = `남은 보물 ${d.remainingCount} / ${d.totalCount}`;
    document.getElementById('quiz-treasure-icon').textContent = t.icon || '👑';
    document.getElementById('quiz-treasure-rarity').textContent = t.rarity || 'LEGENDARY';
    document.getElementById('quiz-treasure-name').textContent = t.name;
    document.getElementById('quiz-treasure-pts').textContent = `+${t.points || 300} PTS 획득 가능`;
    document.getElementById('quiz-question-text').textContent = t.quiz.question;
    document.getElementById('quiz-hint-text').textContent = t.quiz.hint || '힌트가 없습니다.';
    document.getElementById('quiz-hint-box').classList.add('hidden');
    document.getElementById('quiz-feedback-msg').classList.add('hidden');
    document.getElementById('input-quiz-answer').value = '';

    const skipQuizBtn = document.getElementById('btn-skip-quiz-target');
    if (skipQuizBtn) {
      skipQuizBtn.style.display = d.remainingCount > 1 ? 'inline-flex' : 'none';
    }
  } else {
    stageRadar.classList.remove('hidden');
    const t = d.activeTreasure;
    document.getElementById('radar-remaining-pill').textContent = `남은 보물 ${d.remainingCount} / ${d.totalCount}`;
    document.getElementById('radar-treasure-rarity').textContent = t.rarity || 'LEGENDARY';
    document.getElementById('radar-treasure-icon').textContent = t.icon || '👑';
    document.getElementById('radar-treasure-name').textContent = t.name;
    document.getElementById('radar-treasure-pts').textContent = `+${t.points || 300} PTS`;

    updateRadarVisuals();
    startSonarLoop();
  }

  renderSidebarAndMetaOnly();
  renderCollectionVault();
}

function renderSidebarAndMetaOnly() {
  const d = state.roomData;
  if (!d) return;

  document.getElementById('active-player-score').textContent = `${d.player?.score || 0}점`;
  const foundCnt = d.myTreasures?.length || 0;
  document.getElementById('my-treasure-badge').textContent = foundCnt;
  const mBadge = document.getElementById('m-treasure-badge');
  if (mBadge) mBadge.textContent = foundCnt;
  document.getElementById('sidebar-my-found').textContent = `${foundCnt}개 발견`;

  const pct = d.totalCount > 0 ? Math.round((d.claimedCount / d.totalCount) * 100) : 100;
  document.getElementById('room-progress-fill').style.width = `${Math.max(8, pct)}%`;
  document.getElementById('room-progress-text').textContent = `전체 ${d.totalCount}개 중 남은 보물 ${d.remainingCount}개`;

  const syncEl = document.getElementById('sync-indicator-text');
  if (syncEl) {
    syncEl.textContent = normalizeFirebaseUrl(state.firebaseUrl)
      ? '🔥 Firebase 실시간 동기화'
      : '⚡ 실시간 동기화 중';
  }

  const hintTextEl = document.getElementById('location-hint-text');
  if (d.activeTreasure && d.activeTreasure.quizSolved) {
    hintTextEl.textContent = d.activeTreasure.hint || '주변 지형지물을 살펴보세요!';
  } else {
    hintTextEl.textContent = '🔒 먼저 STEP 1 퀴즈 봉인을 해제하면 보물 은신처의 결정적 힌트가 공개됩니다!';
  }

  const skipWrap = document.getElementById('skip-target-wrap');
  if (skipWrap) {
    skipWrap.style.display = d.remainingCount > 1 ? 'block' : 'none';
  }

  const lbEl = document.getElementById('leaderboard-mini');
  if (lbEl) {
    const list = d.leaderboard || [];
    lbEl.innerHTML =
      list.length === 0
        ? '<p class="card-sub">아직 참여 기록이 없습니다.</p>'
        : list
            .map(
              (p, i) => `
          <div class="leader-row">
            <div>
              <span class="leader-rank">#${i + 1}</span>
              <strong>${p.nickname}</strong>
              <span style="font-size:11px; color:#94a3b8;">(${p.foundCount}개 발견)</span>
            </div>
            <span class="leader-pts">${p.score} PTS</span>
          </div>
        `
            )
            .join('');
  }

  const feedEl = document.getElementById('live-feed-list');
  if (feedEl) {
    const feeds = d.feed || [];
    feedEl.innerHTML = feeds.map(f => `<div class="feed-item">${f.message}</div>`).join('');
  }
}

/* ==================== 10. 퀴즈 제출 & 건너뛰기 & 현장 확인 코드 인증 ==================== */
async function handleQuizSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('input-quiz-answer');
  const feedback = document.getElementById('quiz-feedback-msg');
  const ans = (input.value || '').trim();
  if (!ans) return;

  if (state.mode === 'DEMO') {
    const norm = ans.toLowerCase();
    if (['n', '북', '북쪽', 'north'].includes(norm)) {
      playQuizSuccessSound();
      state.roomData.activeTreasure.quizSolved = true;
      state.roomData.player.quizSolved = true;
      state.roomData.feed.unshift({
        id: 'df2',
        message: '🔓 퀴즈 봉인 해제 성공! 소나 레이더 주파수가 연결되었습니다!'
      });
      renderActiveHuntView();
    } else {
      playErrorSound();
      feedback.textContent = '아쉽네요! 정답은 N 또는 북쪽 입니다.';
      feedback.className = 'quiz-feedback error';
      feedback.classList.remove('hidden');
    }
    return;
  }

  const roomsMap = await fetchAllRoomsMap();
  const room = roomsMap[state.roomCode];
  if (!room) return;
  const player = room.participants[state.nickname];
  const target = room.treasures.find(t => t.id === player?.targetTreasureId);
  if (!target || target.claimedBy) {
    assignRandomTreasureClient(room, player);
    await saveSingleRoomToCloudOrLocal(room);
    state.roomData = buildPlayerRoomView(room, state.nickname);
    renderActiveHuntView();
    return;
  }

  const normInput = ans.replace(/\s+/g, '').toLowerCase();
  const valid = (target.quiz.answers || []).map(a => String(a).replace(/\s+/g, '').toLowerCase());
  if (!valid.includes(normInput)) {
    playErrorSound();
    feedback.textContent = '아쉽네요! 정답이 아닙니다. 힌트를 참고하여 다시 도전해 보세요!';
    feedback.className = 'quiz-feedback error';
    feedback.classList.remove('hidden');
    return;
  }

  player.quizSolved = true;
  room.feed.push({
    id: `f_${Date.now()}`,
    type: 'QUIZ',
    message: `🔓 [${state.nickname}]님이 퀴즈 봉인을 해제하고 [${target.name}] 레이더 추적을 시작했습니다!`,
    timestamp: new Date().toISOString()
  });
  await saveSingleRoomToCloudOrLocal(room);
  playQuizSuccessSound();
  state.roomData = buildPlayerRoomView(room, state.nickname);
  renderActiveHuntView();
}

async function handleSkipTarget() {
  if (state.mode !== 'LIVE') return;

  const roomsMap = await fetchAllRoomsMap();
  const room = roomsMap[state.roomCode];
  if (!room) return;
  const player = room.participants[state.nickname];
  assignRandomTreasureClient(room, player, player.targetTreasureId);
  await saveSingleRoomToCloudOrLocal(room);
  state.roomData = buildPlayerRoomView(room, state.nickname);
  state.simulatedDistance = Math.floor(Math.random() * 80) + 55;
  state.simulatedAngleOffset = Math.floor(Math.random() * 140) - 70;
  showToast('🔄 다른 보물로 추적 주파수를 변경했습니다!');
  renderActiveHuntView();
}

function openClaimModal() {
  const modal = document.getElementById('modal-claim');
  const input = document.getElementById('input-claim-code');
  const errEl = document.getElementById('claim-error-msg');
  const helper = document.getElementById('claim-code-helper');

  errEl.classList.add('hidden');
  input.value = '';

  if (state.mode === 'DEMO') {
    helper.textContent = '💡 체험 모드 안내: 현장 확인 코드에 FOREST 를 입력해 보세요!';
    helper.classList.remove('hidden');
  } else if (state.roomData?.activeTreasure?.hint) {
    helper.textContent = `💡 힌트: ${state.roomData.activeTreasure.hint}`;
    helper.classList.remove('hidden');
  } else {
    helper.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  input.focus();
}

async function submitClaimCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  const errEl = document.getElementById('claim-error-msg');
  if (!code) return;

  if (state.mode === 'DEMO') {
    if (code === 'FOREST') {
      document.getElementById('modal-claim').classList.add('hidden');
      closeARModal();
      const t = state.roomData.activeTreasure;
      state.roomData.myTreasures.push({
        id: t.id,
        name: t.name,
        points: t.points,
        rarity: t.rarity,
        icon: t.icon,
        claimedAt: new Date().toISOString()
      });
      state.roomData.player.score += t.points;
      state.roomData.remainingCount = 0;
      state.roomData.claimedCount = 1;
      state.roomData.allComplete = true;
      state.roomData.activeTreasure = null;

      openInteractiveChestCelebration(t, true);
    } else {
      playErrorSound();
      errEl.textContent = '체험용 확인 코드는 FOREST 입니다!';
      errEl.classList.remove('hidden');
    }
    return;
  }

  const roomsMap = await fetchAllRoomsMap();
  const room = roomsMap[state.roomCode];
  if (!room) return;
  const player = room.participants[state.nickname];
  const matched = room.treasures.find(t => t.confirmCode.toUpperCase() === code);

  if (!matched) {
    playErrorSound();
    errEl.textContent = '현장 확인 코드가 일치하지 않습니다! 코드를 다시 확인해 주세요.';
    errEl.classList.remove('hidden');
    return;
  }

  if (matched.claimedBy) {
    document.getElementById('modal-claim').classList.add('hidden');
    closeARModal();
    assignRandomTreasureClient(room, player);
    await saveSingleRoomToCloudOrLocal(room);
    state.roomData = buildPlayerRoomView(room, state.nickname);
    renderActiveHuntView();
    showAlertModal(
      '☁️',
      'A STEP TOO LATE',
      '아앗, 한발 늦은 순간!',
      `조금 전 [${matched.claimedBy}]님이 먼저 이 보물을 발견했습니다!`
    );
    return;
  }

  matched.claimedBy = state.nickname;
  matched.claimedAt = new Date().toISOString();
  player.score = (player.score || 0) + (matched.points || 300);
  player.foundTreasures = player.foundTreasures || [];
  player.foundTreasures.push(matched.id);

  room.feed.push({
    id: `f_${Date.now()}`,
    type: 'CLAIM',
    message: `🎉 팡파레! [${state.nickname}]님이 ${matched.icon || '💎'} [${matched.name}] 보물을 최초로 발견했습니다! (+${matched.points || 300}점)`,
    timestamp: new Date().toISOString()
  });

  assignRandomTreasureClient(room, player);
  const rem = room.treasures.filter(t => !t.claimedBy).length;
  await saveSingleRoomToCloudOrLocal(room);

  document.getElementById('modal-claim').classList.add('hidden');
  closeARModal();
  state.roomData = buildPlayerRoomView(room, state.nickname);
  openInteractiveChestCelebration(matched, rem === 0);
}

/* ==================== 11. 화려한 보물상자 타격 & 폭죽 오픈 연출 ==================== */
function openInteractiveChestCelebration(treasure, isFinale = false) {
  stopSonarLoop();
  state.chestHitsRemaining = 3;
  state.pendingCelebration = { treasure, isFinale };

  const modal = document.getElementById('modal-celebration');
  const tapStage = document.getElementById('chest-tap-stage');
  const openedStage = document.getElementById('chest-opened-stage');
  const counterEl = document.getElementById('chest-hit-counter');

  tapStage.classList.remove('hidden');
  openedStage.classList.add('hidden');
  counterEl.textContent = '황금 봉인 내구도: ⚡⚡⚡ (3회 터치!)';

  modal.classList.remove('hidden');
  playChestHitSound();
}

function handleChestTap(instant = false) {
  const chestIcon = document.getElementById('chest-3d-icon');
  const counterEl = document.getElementById('chest-hit-counter');

  chestIcon.classList.remove('chest-hit-shake');
  void chestIcon.offsetWidth;
  chestIcon.classList.add('chest-hit-shake');

  if (instant) {
    state.chestHitsRemaining = 0;
  } else {
    state.chestHitsRemaining -= 1;
  }

  if (state.chestHitsRemaining > 0) {
    playChestHitSound();
    const bolts = '⚡'.repeat(state.chestHitsRemaining);
    counterEl.textContent = `황금 봉인 내구도: ${bolts} (${state.chestHitsRemaining}회 남음!)`;
    return;
  }

  playVictoryFanfare();
  launchConfettiBurst();

  const tapStage = document.getElementById('chest-tap-stage');
  const openedStage = document.getElementById('chest-opened-stage');
  tapStage.classList.add('hidden');
  openedStage.classList.remove('hidden');

  const t = state.pendingCelebration?.treasure || {
    name: '황금 보물 상자',
    points: 500,
    rarity: 'LEGENDARY',
    icon: '👑'
  };

  document.getElementById('celeb-treasure-icon').textContent = t.icon || '👑';
  document.getElementById('celeb-treasure-rarity').textContent = t.rarity || 'LEGENDARY';
  document.getElementById('celeb-treasure-name').textContent = t.name;
  document.getElementById('celeb-treasure-pts').textContent = `+${t.points || 500} PTS 획득!`;

  renderActiveHuntView();
}

function showAlertModal(icon, kicker, title, desc) {
  document.getElementById('alert-modal-icon').textContent = icon;
  document.getElementById('alert-modal-kicker').textContent = kicker;
  document.getElementById('alert-modal-title').textContent = title;
  document.getElementById('alert-modal-desc').textContent = desc;
  document.getElementById('modal-alert').classList.remove('hidden');
}

/* ==================== 12. AR 카메라 HUD & QR 스캐너 ==================== */
async function openARModal() {
  const modal = document.getElementById('modal-ar');
  const video = document.getElementById('ar-video');
  const t = state.roomData?.activeTreasure;

  document.getElementById('ar-hud-target').textContent = `TARGET: ${t ? t.name : '황금 보물'}`;
  document.getElementById('ar-hud-dist').textContent = `DIST: ${getCurrentDistance()}m`;
  document.getElementById('ar-treasure-emoji').textContent = t?.icon || '🎁';

  modal.classList.remove('hidden');

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      state.arStream = stream;
      video.srcObject = stream;
      video.style.opacity = '1';

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        state.arScanInterval = setInterval(async () => {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              if (raw) {
                clearInterval(state.arScanInterval);
                submitClaimCode(raw);
              }
            }
          } catch (_) {}
        }, 600);
      }
    } catch (err) {
      video.style.opacity = '0';
    }
  } else {
    video.style.opacity = '0';
  }
}

function closeARModal() {
  const modal = document.getElementById('modal-ar');
  modal.classList.add('hidden');
  if (state.arScanInterval) {
    clearInterval(state.arScanInterval);
    state.arScanInterval = null;
  }
  if (state.arStream) {
    state.arStream.getTracks().forEach(track => track.stop());
    state.arStream = null;
  }
}

function triggerSimulatedARScan() {
  if (state.mode === 'DEMO') {
    submitClaimCode('FOREST');
    return;
  }
  const t = state.roomData?.activeTreasure;
  if (t && t.hint) {
    const match = t.hint.match(/([A-Z0-9]{4,10})/);
    if (match) {
      submitClaimCode(match[1]);
      return;
    }
  }
  closeARModal();
  openClaimModal();
}

/* ==================== 13. 내 보물함 렌더링 ==================== */
function renderCollectionVault() {
  const d = state.roomData;
  const scoreEl = document.getElementById('vault-total-score');
  const countEl = document.getElementById('vault-total-count');
  const roomEl = document.getElementById('vault-current-room');
  const gridEl = document.getElementById('vault-treasures-grid');

  const myTreasures = d?.myTreasures || [];
  if (scoreEl) scoreEl.textContent = `${d?.player?.score || 0} PTS`;
  if (countEl) countEl.textContent = `${myTreasures.length} 개`;
  if (roomEl) roomEl.textContent = d ? d.title : '참여 중인 방 없음';

  if (!gridEl) return;
  if (myTreasures.length === 0) {
    gridEl.innerHTML = `
      <div class="stage-card" style="grid-column: 1 / -1; text-align:center;">
        <div style="font-size:52px; margin-bottom:10px;">🗝️</div>
        <h3>아직 발견한 보물이 없습니다</h3>
        <p style="color:#94a3b8; margin:8px 0 18px;">탐험하기 탭에서 퀴즈를 풀고 첫 번째 황금 보물을 차지해 보세요!</p>
      </div>
    `;
    return;
  }

  gridEl.innerHTML = myTreasures
    .map(
      t => `
      <div class="treasure-trophy-card">
        <div class="trophy-icon">${t.icon || '👑'}</div>
        <span class="rarity-tag">${t.rarity || 'LEGENDARY'}</span>
        <h3 style="margin-top:10px;">${t.name}</h3>
        <div class="trophy-pts">+${t.points || 300} PTS</div>
      </div>
    `
    )
    .join('');
}

/* ==================== 14. 관리자 스튜디오 (초대 링크, GPS 위치 찍기, 엑셀 다운로드, QR 인쇄) ==================== */
function getRoomInviteUrl(code) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?join=${encodeURIComponent(code)}`;
}

async function copyInviteLink(code) {
  const url = getRoomInviteUrl(code);
  try {
    await navigator.clipboard.writeText(url);
    showToast(`🔗 초대 링크 복사 완료! (${url})`);
  } catch (_) {
    prompt('아래 초대 링크를 복사해 카톡/단톡방에 공유하세요:', url);
  }
}

function downloadRoomCSV(room) {
  const treasures = Array.isArray(room.treasures) ? room.treasures : Object.values(room.treasures || {});
  const participants = Object.values(room.participants || {}).sort((a, b) => (b.score || 0) - (a.score || 0));

  let csv = '\uFEFF';
  csv += `[${room.title}] 게임방 결과 리포트 (방 코드: ${room.code})\n\n`;
  csv += '=== 1. 참가자 랭킹 및 점수 ===\n';
  csv += '순위,탐험가 별명,총 점수(PTS),발견한 보물 수,최근 활동 시각\n';
  participants.forEach((p, idx) => {
    csv += `${idx + 1},"${p.nickname}",${p.score || 0},${(p.foundTreasures || []).length},"${p.lastActive || ''}"\n`;
  });

  csv += '\n=== 2. 보물별 최초 발견자 기록 ===\n';
  csv += '보물 번호,보물 이름,배점(PTS),현장 확인 코드,위도(Lat),경도(Lng),최초 발견자,발견 시각\n';
  treasures.forEach((t, idx) => {
    csv += `${idx + 1},"${t.name}",${t.points || 300},"${t.confirmCode}",${t.lat},${t.lng},"${t.claimedBy || '미발견'}","${t.claimedAt || '-'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `보물찾기결과_${room.code}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast(`📊 [${room.code}] 결과 엑셀(CSV) 파일이 다운로드되었습니다!`);
}

async function loadAdminRooms() {
  try {
    const roomsMap = await fetchAllRoomsMap();
    document.getElementById('admin-login-box').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');

    const fbInput = document.getElementById('input-firebase-url');
    if (fbInput) fbInput.value = state.firebaseUrl;

    const listEl = document.getElementById('admin-rooms-list');
    const rooms = Object.values(roomsMap);

    listEl.innerHTML = rooms
      .map(r => {
        const treasures = Array.isArray(r.treasures) ? r.treasures : Object.values(r.treasures || {});
        const rem = treasures.filter(t => !t.claimedBy).length;
        const pCount = Object.keys(r.participants || {}).length;
        return `
          <div class="admin-room-card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <strong style="font-size:17px;">${r.title}</strong>
              <span class="quick-room-code">방 코드: ${r.code}</span>
            </div>
            <p style="font-size:13px; color:#94a3b8; margin:6px 0;">
              총 보물 ${treasures.length}개 · 남은 보물 ${rem}개 · 참가자 ${pCount}명
            </p>
            <div class="admin-room-actions">
              <button type="button" class="btn-secondary-sm" data-admin-join="${r.code}">🚀 방 입장</button>
              <button type="button" class="btn-secondary-sm" data-admin-share="${r.code}">🔗 초대링크 복사</button>
              <button type="button" class="btn-secondary-sm" data-admin-entry-qr="${r.code}">📱 입장용 QR</button>
              <button type="button" class="btn-secondary-sm" data-admin-qr="${r.code}">🖨️ 보물 QR스티커</button>
              <button type="button" class="btn-secondary-sm" data-admin-csv="${r.code}">📊 결과 엑셀(CSV)</button>
              <button type="button" class="btn-secondary-sm" data-admin-reset="${r.code}">🔄 초기화</button>
              <button type="button" class="btn-danger-sm" data-admin-delete="${r.code}">🗑️ 삭제</button>
            </div>
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('[data-admin-join]').forEach(btn => {
      btn.addEventListener('click', () => openJoinModal(btn.getAttribute('data-admin-join')));
    });

    listEl.querySelectorAll('[data-admin-share]').forEach(btn => {
      btn.addEventListener('click', () => copyInviteLink(btn.getAttribute('data-admin-share')));
    });

    listEl.querySelectorAll('[data-admin-entry-qr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-admin-entry-qr');
        const room = roomsMap[code];
        if (room) showRoomEntryQRModal(room);
      });
    });

    listEl.querySelectorAll('[data-admin-qr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-admin-qr');
        const room = roomsMap[code];
        if (room) showQRPrintModal(room);
      });
    });

    listEl.querySelectorAll('[data-admin-csv]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-admin-csv');
        const room = roomsMap[code];
        if (room) downloadRoomCSV(room);
      });
    });

    listEl.querySelectorAll('[data-admin-reset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-admin-reset');
        const room = roomsMap[code];
        if (!room) return;

        room.treasures.forEach(t => {
          t.claimedBy = null;
          t.claimedAt = null;
        });
        room.participants = {};
        room.feed = [
          {
            id: `f_${Date.now()}`,
            type: 'SYSTEM',
            message: `🔄 관리자가 [${room.title}] 방을 초기화했습니다!`,
            timestamp: new Date().toISOString()
          }
        ];
        await saveSingleRoomToCloudOrLocal(room);
        showToast(`🔄 [${code}] 방의 모든 보물과 기록이 초기화되었습니다!`);
        loadAdminRooms();
        loadQuickRooms();
      });
    });

    listEl.querySelectorAll('[data-admin-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-admin-delete');
        const fbUrl = normalizeFirebaseUrl(state.firebaseUrl);
        if (fbUrl) {
          await fetch(`${fbUrl}/rooms/${encodeURIComponent(code)}.json`, { method: 'DELETE' });
        }
        delete state.rawRoomsCache[code];
        localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(state.rawRoomsCache));
        showToast(`🗑️ [${code}] 방이 삭제되었습니다.`);
        loadAdminRooms();
        loadQuickRooms();
      });
    });

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function showRoomEntryQRModal(room) {
  const modal = document.getElementById('modal-qr-print');
  const titleEl = document.getElementById('qr-modal-title');
  const subEl = document.getElementById('qr-modal-subtitle');
  const container = document.getElementById('qr-cards-container');
  const inviteUrl = getRoomInviteUrl(room.code);

  titleEl.textContent = `📱 [${room.title}] 참가자 입장용 초대 QR 코드`;
  subEl.textContent = '참가자들이 스마트폰 카메라로 이 QR을 찍으면 방 코드가 자동 입력되어 즉시 입장할 수 있습니다!';

  container.innerHTML = `
    <div class="qr-sticker-card" style="grid-column: 1 / -1; max-width: 360px; margin: 0 auto;">
      <div style="font-size:12px; font-weight:800; color:#64748b;">JOIN EXPEDITION ROOM</div>
      <h4 style="font-size:20px; margin:6px 0;">🧭 ${room.title}</h4>
      <div class="qr-code-box">
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}"
          alt="Room Join QR"
          width="210"
          height="210"
        />
      </div>
      <div style="font-size:12px; color:#475569;">방 참여 코드</div>
      <div class="qr-confirm-code" style="font-size:26px;">${room.code}</div>
      <p style="font-size:11px; color:#64748b; margin-top:8px; word-break:break-all;">${inviteUrl}</p>
    </div>
  `;
  modal.classList.remove('hidden');
}

function showQRPrintModal(room) {
  const modal = document.getElementById('modal-qr-print');
  const titleEl = document.getElementById('qr-modal-title');
  const subEl = document.getElementById('qr-modal-subtitle');
  const container = document.getElementById('qr-cards-container');

  titleEl.textContent = `🖨️ [${room.title}] 현장 부착용 보물 QR & 확인 코드 스티커`;
  subEl.textContent = '이 카드를 인쇄하여 실제 보물 은신처에 붙여 두세요. 참가자들이 AR 카메라로 QR을 찍거나 확인 코드를 입력해 보물을 획득합니다.';

  const treasures = Array.isArray(room.treasures) ? room.treasures : Object.values(room.treasures || {});
  container.innerHTML = treasures
    .map(
      (t, idx) => `
      <div class="qr-sticker-card">
        <div style="font-size:11px; font-weight:800; color:#64748b;">${room.title} (보물 #${idx + 1})</div>
        <h4>${t.icon || '💎'} ${t.name}</h4>
        <div class="qr-code-box">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(t.confirmCode)}"
            alt="QR ${t.confirmCode}"
            width="130"
            height="130"
          />
        </div>
        <div style="font-size:11px; color:#475569;">현장 확인 코드</div>
        <div class="qr-confirm-code">${t.confirmCode}</div>
      </div>
    `
    )
    .join('');

  modal.classList.remove('hidden');
}

function generateRandomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function addAdminTreasureFormRow(defaults = {}) {
  const container = document.getElementById('admin-treasure-rows');
  const idx = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'admin-treasure-item';
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <strong style="color:#fde047;">💎 보물 #${idx}</strong>
      ${idx > 1 ? '<button type="button" class="btn-danger-sm btn-remove-trow">삭제</button>' : ''}
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label>보물 이름</label>
        <input type="text" class="t-name" value="${defaults.name || `황금 보물상자 #${idx}`}" required />
      </div>
      <div class="form-group">
        <label>현장 확인 코드 (상자에 적을 코드)</label>
        <input type="text" class="t-code" value="${defaults.confirmCode || `GOLD0${idx}`}" required />
      </div>
    </div>

    <div class="gps-capture-row">
      <span style="font-size:12px; font-weight:800; color:#6ee7b7;">🛰️ 보물 GPS 좌표:</span>
      <input type="number" step="any" class="t-lat" value="${defaults.lat || (37.5665 + idx * 0.0004).toFixed(6)}" placeholder="위도(Lat)" required />
      <input type="number" step="any" class="t-lng" value="${defaults.lng || (126.9780 + idx * 0.0004).toFixed(6)}" placeholder="경도(Lng)" required />
      <button type="button" class="btn-gps-pick">📍 내 현재 GPS 위치 찍기</button>
    </div>

    <div class="form-group">
      <label>미션 퀴즈 문제</label>
      <input type="text" class="t-question" value="${defaults.question || '나침반에서 북쪽을 뜻하는 알파벳은?'}" required />
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label>퀴즈 정답 (쉼표로 복수 정답 가능)</label>
        <input type="text" class="t-answers" value="${defaults.answers || 'N, 북쪽'}" required />
      </div>
      <div class="form-group">
        <label>퀴즈 힌트</label>
        <input type="text" class="t-qhint" value="${defaults.qhint || 'North의 첫 글자입니다.'}" />
      </div>
    </div>
    <div class="form-group">
      <label>보물 은신처 힌트 (퀴즈 통과 후 공개)</label>
      <input type="text" class="t-hint" value="${defaults.hint || '본당 입구 큰 나무 아래를 확인하세요.'}" required />
    </div>
  `;

  const remBtn = div.querySelector('.btn-remove-trow');
  if (remBtn) {
    remBtn.addEventListener('click', () => div.remove());
  }

  const gpsBtn = div.querySelector('.btn-gps-pick');
  const latInput = div.querySelector('.t-lat');
  const lngInput = div.querySelector('.t-lng');
  gpsBtn.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      showToast('⚠️ 이 브라우저에서는 GPS를 지원하지 않습니다.');
      return;
    }
    gpsBtn.textContent = '🛰️ 위성 수신 중...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        latInput.value = pos.coords.latitude.toFixed(6);
        lngInput.value = pos.coords.longitude.toFixed(6);
        gpsBtn.textContent = '✅ 현재 위치 입력됨!';
        showToast(`📍 현재 GPS 좌표(${latInput.value}, ${lngInput.value})가 입력되었습니다!`);
      },
      () => {
        gpsBtn.textContent = '📍 내 현재 GPS 위치 찍기';
        showToast('⚠️ GPS 권한이 거부되었거나 실내입니다. 수동 입력 또는 야외에서 다시 시도하세요.');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });

  container.appendChild(div);
}

/* ==================== 15. 스마트폰 & PC 앱 설치(PWA) 기능 ==================== */
function initPWAInstall() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const note = document.getElementById('install-direct-note');
    if (note) {
      note.textContent = '✅ 이 기기는 원클릭 자동 앱 설치를 지원합니다! 위 버튼을 누르면 즉시 바탕화면에 설치됩니다.';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('🎉 트레저 헌터 X 앱이 기기에 성공적으로 설치되었습니다!');
    document.getElementById('modal-install').classList.add('hidden');
  });
}

function openInstallModal() {
  document.getElementById('modal-install').classList.remove('hidden');
}

async function triggerPWAInstallPrompt() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('📲 앱 설치가 시작되었습니다!');
    }
    deferredInstallPrompt = null;
  } else {
    showToast('💡 아래 기기별(갤럭시·아이폰·PC) 안내에 따라 [홈 화면에 추가 / 앱 설치]를 눌러주세요!');
  }
}

/* ==================== 16. 탭 및 테마 전환 & 초기화 ==================== */
function switchTab(tabName) {
  document.querySelectorAll('.nav-tab, .m-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.add('hidden');
  });
  const target = document.getElementById(`view-${tabName}`);
  if (target) target.classList.remove('hidden');

  if (tabName === 'collection') {
    renderCollectionVault();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setVisualTheme(rawTheme) {
  const themeMap = {
    golden: 'deungbul',
    cyber: 'kodak',
    emerald: 'heavenin',
    deungbul: 'deungbul',
    kodak: 'kodak',
    heavenin: 'heavenin'
  };
  const theme = themeMap[rawTheme] || 'deungbul';
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-set-theme') === theme);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initBackgroundParticles();
  initPWAInstall();
  updateCloudBadge();
  loadQuickRooms();

  const newCodeInput = document.getElementById('admin-new-code');
  if (newCodeInput) newCodeInput.value = generateRandomRoomCode();

  document.getElementById('btn-gen-random-code').addEventListener('click', () => {
    newCodeInput.value = generateRandomRoomCode();
    showToast(`🎲 새 랜덤 방 코드 [${newCodeInput.value}] 가 생성되었습니다!`);
  });

  addAdminTreasureFormRow({
    name: '솔로몬의 황금 성배',
    confirmCode: 'STAR01',
    question: '"네 이웃을 네 ( ___ )과 같이 사랑하라" 빈칸에 들어갈 한 글자는?',
    answers: '몸, 자신',
    qhint: '한 글자입니다.',
    hint: '강단 오른쪽 화분 뒤를 확인하세요!'
  });

  // 네비게이션 탭 이벤트
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  document.querySelectorAll('[data-go-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-go-tab')));
  });

  document.getElementById('btn-home-logo').addEventListener('click', () => switchTab('explore'));

  // 테마 변경 버튼
  document.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => setVisualTheme(btn.getAttribute('data-set-theme')));
  });

  // 📲 앱 다운로드(설치) 모달 열기 버튼들
  document.getElementById('btn-header-install').addEventListener('click', openInstallModal);
  document.getElementById('btn-hero-install').addEventListener('click', openInstallModal);
  document.getElementById('btn-guide-install').addEventListener('click', openInstallModal);
  document.getElementById('btn-trigger-pwa-install').addEventListener('click', triggerPWAInstallPrompt);

  // 사운드 토글
  const soundBtn = document.getElementById('btn-sound-toggle');
  soundBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundBtn.classList.toggle('active', state.soundEnabled);
    soundBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
    showToast(state.soundEnabled ? '🔊 사운드가 켜졌습니다' : '🔇 사운드가 꺼졌습니다');
    if (state.soundEnabled) playSonarPing(40);
  });

  // 랜딩 CTA 버튼
  document.getElementById('btn-open-join-modal').addEventListener('click', () => openJoinModal('GODISLOVE'));
  document.getElementById('btn-start-demo').addEventListener('click', startDemoMode);

  // 액티브 방 초대링크 복사
  document.getElementById('btn-share-active-room').addEventListener('click', () => {
    if (state.roomCode) copyInviteLink(state.roomCode);
  });

  // 모달 닫기 공통
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close-modal');
      document.getElementById(id).classList.add('hidden');
    });
  });

  // 방 입장 폼
  document.getElementById('form-join-room').addEventListener('submit', e => {
    e.preventDefault();
    const code = document.getElementById('input-join-code').value.trim().toUpperCase();
    const nick = document.getElementById('input-join-nickname').value.trim();
    joinLiveRoom(code, nick);
  });

  // 탐험 나가기
  document.getElementById('btn-leave-room').addEventListener('click', () => {
    stopPolling();
    stopSonarLoop();
    state.mode = 'IDLE';
    state.roomData = null;
    renderActiveHuntView();
    loadQuickRooms();
  });

  document.getElementById('btn-finale-home').addEventListener('click', () => {
    stopPolling();
    state.mode = 'IDLE';
    state.roomData = null;
    renderActiveHuntView();
    loadQuickRooms();
  });

  // 퀴즈 제출 & 힌트 & 건너뛰기
  document.getElementById('form-quiz-answer').addEventListener('submit', handleQuizSubmit);
  document.getElementById('btn-toggle-quiz-hint').addEventListener('click', () => {
    document.getElementById('quiz-hint-box').classList.toggle('hidden');
  });
  document.getElementById('btn-skip-quiz-target').addEventListener('click', handleSkipTarget);
  document.getElementById('btn-skip-radar-target').addEventListener('click', handleSkipTarget);

  // 은신처 힌트 토글
  document.getElementById('btn-toggle-location-hint').addEventListener('click', () => {
    document.getElementById('location-hint-box').classList.toggle('hidden');
  });

  // 센서 연결 & 가상 시뮬레이터 액션 버튼
  document.getElementById('btn-connect-sensors').addEventListener('click', connectRealSensors);

  document.getElementById('btn-sim-step').addEventListener('click', () => {
    state.simulatedDistance = Math.max(4, state.simulatedDistance - 20);
    state.simulatedAngleOffset = Math.round(state.simulatedAngleOffset * 0.6);
    playSonarPing(state.simulatedDistance);
    updateRadarVisuals();
  });

  document.getElementById('btn-sim-turn').addEventListener('click', () => {
    state.simulatedAngleOffset = 0;
    playSonarPing(state.simulatedDistance);
    updateRadarVisuals();
  });

  document.getElementById('btn-sim-close').addEventListener('click', () => {
    state.simulatedDistance = 5;
    state.simulatedAngleOffset = 0;
    playSonarPing(5);
    updateRadarVisuals();
  });

  // 보물 발견 확인 코드 모달
  document.getElementById('btn-open-claim-modal').addEventListener('click', openClaimModal);
  document.getElementById('form-claim-code').addEventListener('submit', e => {
    e.preventDefault();
    const code = document.getElementById('input-claim-code').value;
    submitClaimCode(code);
  });

  // AR 카메라 모달
  document.getElementById('btn-open-ar-modal').addEventListener('click', openARModal);
  document.getElementById('btn-sidebar-ar').addEventListener('click', openARModal);
  document.getElementById('btn-close-ar').addEventListener('click', closeARModal);
  document.getElementById('ar-floating-treasure').addEventListener('click', triggerSimulatedARScan);
  document.getElementById('btn-ar-sim-scan').addEventListener('click', triggerSimulatedARScan);
  document.getElementById('btn-ar-manual-code').addEventListener('click', () => {
    closeARModal();
    openClaimModal();
  });

  // 보물상자 타격 & 축하 모달
  document.getElementById('btn-tap-chest').addEventListener('click', () => handleChestTap(false));
  document.getElementById('btn-instant-open-chest').addEventListener('click', () => handleChestTap(true));
  document.getElementById('btn-celeb-next').addEventListener('click', () => {
    document.getElementById('modal-celebration').classList.add('hidden');
    if (state.pendingCelebration?.isFinale) {
      showAlertModal(
        '🏆',
        'ADVENTURE COMPLETE',
        '탐험 종료, 모두 수고했어요!',
        '이번 탐험 방의 모든 보물이 발견되었습니다! 내 보물함과 실시간 랭킹을 확인해 보세요!'
      );
    }
    renderActiveHuntView();
  });

  document.getElementById('btn-alert-ok').addEventListener('click', () => {
    document.getElementById('modal-alert').classList.add('hidden');
  });

  // 가이드 탭 3대 순간 연출 미리보기 버튼
  document.getElementById('btn-preview-claim').addEventListener('click', () => {
    openInteractiveChestCelebration(
      {
        name: '솔로몬의 지혜의 황금 상자 (미리보기)',
        points: 500,
        rarity: 'MYTHIC',
        icon: '👑'
      },
      false
    );
  });

  document.getElementById('btn-preview-late').addEventListener('click', () => {
    playErrorSound();
    showAlertModal(
      '☁️',
      'A STEP TOO LATE',
      '아앗, 한발 늦은 순간!',
      '간발의 차이로 다른 탐험가가 먼저 확인 코드를 입력해 보물을 차지했습니다! 다음 보물로 레이더가 즉시 전환됩니다.'
    );
  });

  document.getElementById('btn-preview-finale').addEventListener('click', () => {
    playVictoryFanfare();
    launchConfettiBurst();
    showAlertModal(
      '🏆',
      'ADVENTURE FINALE',
      '탐험 종료, 모두 수고했어요!',
      '숨겨진 모든 황금 보물이 발견되었습니다! 함께 땀 흘리며 뛰어준 모든 탐험가들에게 박수를 보냅니다!'
    );
  });

  // 관리자 파이어베이스 설정 이벤트
  document.getElementById('btn-toggle-fb-guide').addEventListener('click', () => {
    document.getElementById('fb-guide-collapse').classList.toggle('hidden');
  });

  document.getElementById('btn-save-firebase-url').addEventListener('click', async () => {
    const raw = document.getElementById('input-firebase-url').value.trim();
    const clean = normalizeFirebaseUrl(raw);
    if (!clean || !clean.startsWith('https://')) {
      alert('올바른 Firebase Realtime Database 주소(https://...)를 입력해 주세요.');
      return;
    }
    state.firebaseUrl = clean;
    localStorage.setItem(STORAGE_KEY_FB_URL, clean);
    try {
      await fetchAllRoomsMap();
      showToast('🔥 파이어베이스 실시간 클라우드 DB 연동에 성공했습니다!');
      loadAdminRooms();
      loadQuickRooms();
    } catch (err) {
      alert(`파이어베이스 연결 실패: ${err.message}`);
    }
  });

  document.getElementById('btn-reset-cloud-seed').addEventListener('click', async () => {
    const fbUrl = normalizeFirebaseUrl(state.firebaseUrl);
    const seed = getInitialSeedRooms();
    if (fbUrl) {
      await fetch(`${fbUrl}/rooms.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seed)
      });
    }
    state.rawRoomsCache = seed;
    localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(seed));
    showToast('✨ 기본 게임방 [GODISLOVE] 및 [JESUS0691]로 클라우드가 복원되었습니다!');
    loadAdminRooms();
    loadQuickRooms();
  });

  document.getElementById('btn-refresh-admin-rooms').addEventListener('click', () => {
    loadAdminRooms();
    showToast('🔄 게임방 목록을 새로고침했습니다.');
  });

  // 관리자 로그인 및 방 생성
  document.getElementById('form-admin-login').addEventListener('submit', e => {
    e.preventDefault();
    state.adminPass = document.getElementById('input-admin-pass').value.trim();
    loadAdminRooms();
  });

  document.getElementById('btn-add-treasure-row').addEventListener('click', () => {
    addAdminTreasureFormRow();
  });

  document.getElementById('form-create-room').addEventListener('submit', async e => {
    e.preventDefault();
    const code = (document.getElementById('admin-new-code').value.trim() || generateRandomRoomCode()).toUpperCase();
    const theme = document.getElementById('admin-new-theme').value;
    const title = document.getElementById('admin-new-title').value.trim();
    const subtitle = document.getElementById('admin-new-subtitle').value.trim() || '퀴즈를 풀고 레이더와 AR 카메라로 보물을 찾으세요!';

    const rows = Array.from(document.querySelectorAll('#admin-treasure-rows .admin-treasure-item'));
    const treasures = rows.map((row, idx) => ({
      id: `t_${Date.now()}_${idx}`,
      name: row.querySelector('.t-name').value.trim(),
      confirmCode: row.querySelector('.t-code').value.trim().toUpperCase(),
      lat: Number(row.querySelector('.t-lat').value) || 37.5665,
      lng: Number(row.querySelector('.t-lng').value) || 126.9780,
      hint: row.querySelector('.t-hint').value.trim(),
      points: 400 + idx * 100,
      rarity: idx === 0 ? 'MYTHIC' : 'LEGENDARY',
      icon: idx % 2 === 0 ? '👑' : '💎',
      quiz: {
        question: row.querySelector('.t-question').value.trim(),
        answers: row.querySelector('.t-answers').value.split(',').map(s => s.trim()).filter(Boolean),
        hint: row.querySelector('.t-qhint').value.trim()
      },
      claimedBy: null,
      claimedAt: null
    }));

    const newRoomObj = {
      code,
      title,
      subtitle,
      theme,
      createdAt: new Date().toISOString(),
      treasures,
      participants: {},
      feed: [
        {
          id: `f_${Date.now()}`,
          type: 'SYSTEM',
          message: `✨ [${title}] 게임방이 개설되었습니다!`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    await saveSingleRoomToCloudOrLocal(newRoomObj);
    playVictoryFanfare();
    showToast(`🎉 새 게임방 [${title}] (코드: ${code}) 생성 완료!`);
    document.getElementById('admin-new-code').value = generateRandomRoomCode();
    loadAdminRooms();
    loadQuickRooms();
  });

  document.getElementById('btn-print-cards').addEventListener('click', () => {
    window.print();
  });

  // URL 파라미터 ?join=방코드 자동 감지
  const params = new URLSearchParams(window.location.search);
  const joinParam = params.get('join');
  if (joinParam) {
    openJoinModal(joinParam.toUpperCase());
  }
});
