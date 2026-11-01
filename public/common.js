/* 화면 공용: 도트 스프라이트, 장면 그리기, 작은 도구들 */
const { FLOORS, STD, DMG, TREASURE, ITEMS, MON, PHASE } = window.SHARED;

/* 절반만 그리고 좌우 대칭으로 펼침 */
const HALF = {
  slime: ["........", "........", "........", "........", "........", "......oo", "....ooaa", "...oaacc", "..oaacaa", "..oaaaaa", ".oaawkaa", ".oaakkaa", ".oaaaaaa", ".oabaaar", ".obbbbbb", "..oooooo"],
  bat: ["........", "........", "........", "o.......", "oo....o.", "oao...oo", "oaao.oaa", "oaaaoaaa", "oaaaaarw", "oaabaaaa", ".oabbaaw", ".oab.oaa", "..o...oa", ".......o", "........", "........"],
  mush: ["........", "......oo", "....ooaa", "...oawwa", "..oaawwa", ".oaaaaaa", ".oaawaaa", ".oaaaaaa", ".ooooooo", "....owww", "....owkw", "....owww", "....owwr", "....owww", ".....ooo", "........"],
  goblin: ["........", ".....ooo", "o...oaaa", "oao.oaaa", ".oaoakwa", "..oaaaaa", "...oaarw", "....oaaa", "...oobbb", "..oaobbb", "..oa.obb", "..oo.obb", ".....oo.", ".....oa.", "....ooo.", "........"],
  skel: ["........", ".....ooo", "....owww", "...owwww", "...owkkw", "...owkrw", "...owwww", "....owkw", ".....ooo", "...ooowo", "..owo.ow", "..oo.oww", ".....owo", ".....ow.", "....oww.", "........"],
  ghost: ["........", ".....ooo", "....oaaa", "...oaaaa", "..oacaaa", "..oakkaa", "..oakkra", "..oaaaaa", "..oaaaak", "..oaaaak", "..oaaaaa", "..oaaaaa", "..oabaaa", "..oaboba", "..oo.oo.", "........"],
  golem: ["........", ".....ooo", "....oaaa", "....oarr", "....oaaa", "..oooobb", ".oaaoaaa", ".oaaoaca", ".oaaoaaa", ".oaaoaab", ".oooobaa", "....oaaa", "....oaao", "....oaao", "...ooaao", "........"],
  knight: ["......oo", ".....oaa", "....oaaa", "....oakk", "....oark", "....oaaa", "..oooooa", ".oaaoaac", ".oaaoaac", ".oaaoaaa", ".oooobaa", "....oaao", "....oaao", "....oaao", "...ooaao", "........"],
  lich: ["...y..y.", "...yyyyy", "...oyyyy", "..oaaaaa", "..oakkkk", "..oakrkk", "..oakkkk", ".oaaakkk", ".oabaaaa", "oabaaaca", "oabaaaca", "oaabaaaa", ".oaabaaa", ".oaaabaa", "oooooooo", "........"],
  demon: ["o.......", "oo......", ".oo.oooo", "..ooaaaa", "...oaaaa", "...oayya", "...oakya", "...oaaaa", "....oawk", "o...ooaa", "oo.oaaaa", "oaoaabaa", "oaaoaaba", ".ooaaaaa", "...ooaao", "....oooo"],
  chest: ["........", "........", "........", "........", "..oooooo", ".oaaaaaa", ".oabbbbb", ".oaaaaaa", ".oyyyyyy", ".oaaaaok", ".oaaaaoy", ".oaaaaaa", ".obbbbbb", ".ooooooo", "........", "........"],
  teacher: ["........", "....oooo", "...ohhhh", "..ohhhhh", "..ohssss", "..ohsoww", "..ohssss", "...ohsss", "....ooss", "...ooddd", "..oddddd", "..odsddd", "..odsddd", "...odddd", "...oddoo", "...ooo.."],
  dragon: ["................", "o...........oo..", "oo...........oo.", "oao...........oo", "oaao.......ooooa", "oaaao.....oaaaaa", "oaaaao...oaaaaaa", "oaabaao.oaayyaaa", "oabbbaaooaaykaaa", "oabobbaaoaaaaaaa", "oaboobbaooaaaaaa", "obo.oobaaooaaaaa", "oo...oobaaoaawaa", "o.....oobaoaaaww", ".......ooaaoaaaa", "........oaaccccc", ".......oaaacbcbc", "......oaaaacccbc", ".....oaaaaacbccc", ".....oaao.oacccc", "....oaaao.oaaccc", "....owowo..oaaaa", "....ooooo..ooooo", "................"],
  potion: ["........", "........", "....oooo", "....owww", ".....ooo", "....oaaa", "...oaaca", "..oaaaca", "..oaaaaa", "..oaaaaa", "..obaaaa", "...obbbb", "....oooo", "........", "........", "........"],
  shield: ["........", "..oooooo", ".oaaaaaa", ".oacaaay", ".oacaayy", ".oaaayyy", ".oaaayyy", ".oaaaayy", ".oaaaaay", "..oaaaaa", "..oaaaaa", "...oaaaa", "....oaaa", ".....ooo", "........", "........"],
  scroll: ["........", "........", "..oooooo", ".owwwwww", ".owkkkkk", ".owwwwww", ".owkkkkw", ".owwwwww", ".owkkkkk", ".owwwwww", ".owkkkww", ".owwwwww", "..oooooo", "........", "........", "........"]
};
const HERO = ["................", ".....oooo.......", "....oyyyyo......", "...oyooooyo.....", "...osssssoo.....", "...oseesesw.....", "....ossssow.....", ".....oooo..ow...", "...obbbbbo.ow...", "..obbbbbbbo.ow..", "..osbbcbbsoow...", "..oobbbbbboogo..", "...obboobbo.....", "...obo..obo.....", "..ooo...ooo.....", "................"];
const DEF = { o: '#1a1424', k: '#120c18', w: '#f4efe6', r: '#e23b3b', y: '#f5c542', g: '#8a8a9a', s: '#f1c7a0', h: '#3b2a20', e: '#1a1424' };
const SPR = {};
for (const k in HALF) { const h = HALF[k]; const W = Math.max(...h.map(r => r.length)); SPR[k] = h.map(r => { r = r.padStart(W, '.'); return r + [...r].reverse().join(''); }); }
SPR.hero = HERO;

function drawSprite(ctx, rows, pal, x, y, s, tint) {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]; if (ch === '.') continue;
      ctx.fillStyle = tint || (pal && pal[ch]) || DEF[ch] || '#ff00ff';
      ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s);
    }
  }
}
const ICONS = {};
function iconURL(key, rows, pal) {
  if (ICONS[key]) return ICONS[key];
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  drawSprite(c.getContext('2d'), rows, pal, 0, 0, 1);
  return (ICONS[key] = c.toDataURL());
}
const monIcon = f => iconURL('m' + f, SPR[MON[f].b], MON[f].p);
const ITEM_ICON = {
  potion: () => iconURL('ip', SPR.potion, { a: '#e5544b', b: '#8e2b2b', c: '#ffb3ad' }),
  hint: () => iconURL('ih', SPR.scroll, {}),
  shield: () => iconURL('is', SPR.shield, { a: '#5c7fd6', c: '#a9c2ff' })
};

/* ---------- 장면 ---------- */
const SW = 192, SH = 108;
const TIER = f => f <= 5 ? 0 : f <= 11 ? 1 : f <= 16 ? 2 : f <= 19 ? 3 : 4;
const WALL = [['#3a3f55', '#2b2f42', '#4a5070'], ['#3d3550', '#2c263b', '#4f4566'], ['#4a2f3a', '#36212a', '#5e3b48'], ['#4a1f1f', '#331414', '#612a28'], ['#2a0f14', '#1a080b', '#3d1519']];
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = { floor: 1, phase: 'ready', anim: null };
const TEACHER_PAL = { d: '#4f8a6a', h: '#3b2a20', s: '#f1c7a0', w: '#bfe3ff' };

function drawScene(ctx, t) {
  const f = scene.floor, tier = TIER(f), [wa, wb, wc] = WALL[tier];
  ctx.clearRect(0, 0, SW, SH);
  ctx.fillStyle = wb; ctx.fillRect(0, 0, SW, SH);
  for (let y = 0; y < 78; y += 8) {
    const off = (y / 8) % 2 ? 8 : 0;
    for (let x = -off; x < SW; x += 16) { ctx.fillStyle = ((x * 7 + y * 3 + f * 5) % 5 === 0) ? wc : wa; ctx.fillRect(x + 1, y + 1, 14, 6); }
  }
  if (tier <= 1) {
    ctx.fillStyle = '#0d0b1f'; ctx.fillRect(86, 14, 20, 26); ctx.fillRect(88, 12, 16, 2);
    ctx.fillStyle = '#f6f0c8'; ctx.fillRect(96, 18, 6, 6); ctx.fillStyle = '#0d0b1f'; ctx.fillRect(98, 18, 4, 4);
    ctx.fillStyle = wb; ctx.fillRect(95, 14, 2, 26); ctx.fillRect(86, 26, 20, 2);
  }
  if (tier >= 3) { const g = 0.5 + 0.5 * Math.sin(t / 900); ctx.fillStyle = `rgba(255,${90 + g * 40 | 0},40,${0.16 + g * 0.08})`; ctx.fillRect(0, 60, SW, 18); }
  ctx.fillStyle = tier === 4 ? '#6a1020' : '#5a2a7a'; ctx.fillRect(84, 44, 24, 22);
  ctx.fillStyle = '#1a1424'; ctx.fillRect(84, 66, 8, 3); ctx.fillRect(100, 66, 8, 3);
  ctx.fillStyle = '#f5c542'; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText(String(f), 96, 59);
  // 횃불 (천천히 일렁임)
  for (const tx of [30, 160]) {
    ctx.fillStyle = '#4a3020'; ctx.fillRect(tx, 34, 3, 10);
    const h = REDUCED ? 0 : Math.round(Math.sin(t / 420 + tx) * 1);
    ctx.fillStyle = '#ff9b2a'; ctx.fillRect(tx - 1, 29 - h, 5, 6 + h); ctx.fillStyle = '#ffe14f'; ctx.fillRect(tx, 31 - h, 3, 3);
    ctx.fillStyle = 'rgba(255,180,60,.08)'; ctx.fillRect(tx - 14, 20, 31, 30);
  }
  ctx.fillStyle = tier === 4 ? '#2b0d10' : '#2a2236'; ctx.fillRect(0, 78, SW, 30);
  for (let x = 0; x < SW; x += 16) { ctx.fillStyle = '#1c1626'; ctx.fillRect(x, 78, 1, 30); }
  ctx.fillStyle = '#1c1626'; ctx.fillRect(0, 78, SW, 2); ctx.fillRect(0, 92, SW, 1);

  const A = scene.anim, at = A ? (t - A.t0) : 99999;
  const shakeX = (dur, amp) => (at < dur && !REDUCED) ? Math.sin(at / 30) * amp * (1 - at / dur) : 0;

  // 영웅
  let hx = 26; const hy = 46;
  if (A && A.type === 'hit' && at < 500) hx += Math.sin(Math.min(at, 250) / 250 * Math.PI) * 48;
  if (A && A.type === 'kill' && at < 500) hx += Math.sin(Math.min(at, 250) / 250 * Math.PI) * 48;
  if (A && (A.type === 'hurt' || A.type === 'trap')) hx += shakeX(500, 4);
  if (scene.phase === 'dead') {
    ctx.save(); ctx.translate(hx + 16, hy + 32); ctx.rotate(-Math.PI / 2);
    drawSprite(ctx, SPR.hero, { b: '#3557b0', c: '#f5c542' }, -16, -16, 2, '#6a5a7a'); ctx.restore();
  } else drawSprite(ctx, SPR.hero, { b: '#3557b0', c: '#f5c542' }, hx, hy, 2);
  if (A && (A.type === 'hit' || A.type === 'kill') && at > 150 && at < 380) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(128, 58, 20, -1.1, 0.6); ctx.stroke();
  }
  if (A && A.type === 'heal' && at < 900) { // 초록 빛 알갱이가 떠오름
    ctx.fillStyle = '#7dff9a';
    for (let i = 0; i < 6; i++) { const px = hx + 4 + i * 5, py = hy + 28 - (at / 900) * 26 - (i % 3) * 4; ctx.fillRect(px, py, 2, 2); }
  }

  if (scene.phase === 'treasure') drawSprite(ctx, SPR.chest, { a: '#9a5a2a', b: '#6a3a18' }, 120, 58, 2);
  if (scene.phase === 'cleared') {
    drawSprite(ctx, SPR.teacher, TEACHER_PAL, 124, 46, 2);
    ctx.fillStyle = '#f5c542';
    for (let i = 0; i < 8; i++) { const a = t / 900 + i; ctx.fillRect(140 + Math.cos(a) * 30 | 0, 40 + Math.sin(a * 1.3) * 20 | 0, 2, 2); }
  }

  const m = MON[f];
  const killing = A && A.type === 'kill' && at < 800;
  const showMon = ['fight', 'trap', 'ready', 'dead'].includes(scene.phase) || killing;
  if (showMon) {
    const rows = SPR[m.b], w = rows[0].length;
    const s = (f === 20 || f >= 12) ? 3 : 2;
    const size = w * s, hh = rows.length * s;
    let mx = (f === 20 ? SW - 6 - size : SW - 26 - size);
    let my = 78 - hh + 2 + (f >= 12 && f < 20 ? 2 : 0);
    // 평소: 좌우로 천천히 흔들림
    if (!REDUCED) mx += Math.sin(t / 650) * 2;
    let alpha = 1;
    if (A && A.type === 'hurt' && at < 450) mx -= Math.sin(Math.min(at, 220) / 220 * Math.PI) * 40;   // 공격하러 다가옴
    if (A && A.type === 'hit') mx += shakeX(520, 5);                                                    // 맞으면 좌우로 흔들림
    if (killing) { mx += shakeX(400, 5) + Math.max(0, at - 350) / 450 * 24; alpha = Math.max(0, 1 - Math.max(0, at - 300) / 500); } // 밀려나며 사라짐
    if (f >= 17) {
      const g = 0.45 + 0.15 * Math.sin(t / 900);
      ctx.fillStyle = f === 20 ? `rgba(255,60,40,${g * 0.35 * alpha})` : `rgba(190,40,255,${g * 0.3 * alpha})`;
      ctx.beginPath(); ctx.ellipse(mx + size / 2, my + hh / 2, size * 0.62, hh * 0.6, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = (scene.phase === 'trap' ? 0.35 : 1) * alpha;
    drawSprite(ctx, rows, m.p, mx, my, s);
    if (m.crown) { ctx.fillStyle = '#ffd34f'; const cx = mx + size / 2 - 6, cy = my + 8 * s; ctx.fillRect(cx, cy - 6, 12, 4); ctx.fillRect(cx, cy - 9, 2, 3); ctx.fillRect(cx + 5, cy - 10, 2, 4); ctx.fillRect(cx + 10, cy - 9, 2, 3); }
    ctx.globalAlpha = 1;
    if (f === 20 && scene.phase !== 'cleared') { // 감옥 속 선생님
      drawSprite(ctx, SPR.teacher, TEACHER_PAL, 64, 56, 1);
      ctx.fillStyle = '#8a8a9a'; for (let i = 0; i < 5; i++) ctx.fillRect(62 + i * 5, 54, 1, 22); ctx.fillRect(61, 54, 22, 1); ctx.fillRect(61, 75, 22, 1);
    }
  }
  if (scene.phase === 'trap') {
    ctx.fillStyle = '#b8c2d6';
    for (let i = 0; i < 6; i++) { const x = 18 + i * 7; ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x + 3, 72); ctx.lineTo(x + 6, 80); ctx.fill(); }
  }
}
let rafOn = false, sceneCanvas = null, lastDraw = 0;
function loop(t) {
  if (!sceneCanvas || !document.body.contains(sceneCanvas)) { rafOn = false; return; }
  if (t - lastDraw > 50) { lastDraw = t; drawScene(sceneCanvas.getContext('2d'), t); }
  requestAnimationFrame(loop);
}
function mountScene(canvas, floor, phase) { scene.floor = floor; scene.phase = phase; sceneCanvas = canvas; if (!rafOn) { rafOn = true; requestAnimationFrame(loop); } }
function popNumber(text, cls, side) {
  const host = document.getElementById('scene'); if (!host) return;
  const d = document.createElement('div'); d.className = 'dmg ' + cls; d.textContent = text;
  d.style.left = side === 'hero' ? '16%' : '68%'; d.style.top = '34%';
  host.appendChild(d); setTimeout(() => d.remove(), 1200);
}
function playEvent(ev) {
  scene.anim = { type: ev.type, t0: performance.now() };
  const host = document.getElementById('scene');
  if (ev.type === 'hurt' || ev.type === 'trap') {
    if (host && !REDUCED) { host.classList.remove('shake'); void host.offsetWidth; host.classList.add('shake'); }
    popNumber(ev.amt ? '-' + ev.amt : '방어!', ev.amt ? 'red' : 'gold', 'hero');
  }
  if (ev.type === 'hit' || ev.type === 'kill') popNumber('명중!', 'gold', 'mon');
  if (ev.type === 'heal') popNumber('+' + ev.amt, 'green', 'hero');
  if (ev.type === 'miss') popNumber('다시!', 'gold', 'hero');
}

/* ---------- 도구 ---------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const markup = s => esc(s).replace(/\[([^\]]+)\]/g, '<u class="mark">$1</u>');
const mmss = ms => { const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const hpClass = hp => hp > 50 ? '' : hp > 25 ? 'mid' : 'low';
let toastT;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
}
async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); j._status = r.status; return j;
  } catch (e) { return { error: '서버에 연결하지 못했어요. 인터넷을 확인해 주세요.', _status: 0 }; }
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
