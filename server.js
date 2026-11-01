/* 문장 성분 용의 성 — 서버
   외부 패키지 없이 Node 기본 모듈만 사용합니다.
   - 학생 화면:  /
   - 교사 화면:  /teacher   (비밀번호: 환경 변수 TEACHER_PASSWORD)
   실시간 갱신은 Server-Sent Events(/events), 행동은 POST /api/* 로 보냅니다.
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SH = require('./public/shared.js');
const DEFAULT_BANK = require('./server/bank.js');

const PORT = process.env.PORT || 3000;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'dragon1234';
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const PUBLIC = path.join(__dirname, 'public');
const { STD, DMG, TREASURE, ITEMS, HEAL, MON, ASK, ASK_TEXT } = SH;

const clone = o => JSON.parse(JSON.stringify(o));
const rid = (n = 12) => crypto.randomBytes(n).toString('hex');

/* ---------------- 상태 ---------------- */
const DEFAULT_CFG = {
  status: 'lobby', groupSize: 4, turnMode: true, respawn: 'first', duration: 25,
  trapDmg: 5, trapHeal: 8, dragonHp: 3, answerMode: 'mixed', startedAt: 0, elapsed: 0, notice: ''
};
let S = {
  cfg: clone(DEFAULT_CFG),
  bank: null,          // null이면 기본 문제
  players: {},         // token -> {pid, name, joinedAt, group}
  groups: {},          // no -> 모둠 상태
  traps: {}            // no -> [층]
};
try {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  S = Object.assign(S, saved); S.cfg = Object.assign(clone(DEFAULT_CFG), saved.cfg || {});
  console.log('저장된 상태를 불러왔습니다.');
} catch (e) { /* 처음 실행 */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(S)); } catch (e) { console.error('저장 실패', e.message); }
  }, 1500);
}
const bank = () => S.bank || DEFAULT_BANK;
const teacherKeys = new Set();

/* ---------------- 게임 규칙 ---------------- */
function freshGroup(no, members) {
  return { no, members: members || [], floor: 1, hp: 100, items: { potion: 0, hint: 0, shield: 0 }, shieldOn: false, phase: 'ready',
    q: null, mhp: 1, turn: 0, turnAt: Date.now(), deaths: 0, correct: 0, wrong: 0, trapsDone: [], got: [], hidden: [], hintOn: false,
    ev: { seq: 0, type: '', amt: 0 }, log: [], clearedAt: 0, best: 1 };
}
const optsOf = q => q.type === 'pick' ? STD : q.type === 'choice' ? q.opts : [];
const correctIdx = q => q.type === 'pick' ? STD.indexOf(q.a) : q.a;
const plain = s => String(s || '').replace(/[\[\]]/g, '');
const norm = s => String(s || '').replace(/[\s.,·!?'"“”‘’()\[\]①②③④⑤⑥]/g, '').replace(/(개|번)$/, '');

function resolveMode(q, key) {
  if (q.type === 'text') return 'text';
  const short = q.type === 'choice' && q.opts.every(o => !o.includes('[') && plain(o).length <= 6);
  if (q.type === 'choice') {
    if (q.form === 'text' || (S.cfg.answerMode === 'text' && short)) return 'text';
    return 'choice';
  }
  // pick
  if (q.form === 'choice' || q.form === 'text') return q.form;
  if (S.cfg.answerMode === 'choice') return 'choice';
  if (S.cfg.answerMode === 'text') return 'text';
  if (key === 'trap' || +key <= 5) return 'choice';
  return Math.random() < 0.5 ? 'text' : 'choice';
}
function pickQ(key, prevId) {
  const b = bank(); let pool = key === 'trap' ? b.trap : b.floors[key];
  if (!pool || !pool.length) pool = key === 'trap' ? DEFAULT_BANK.trap : DEFAULT_BANK.floors[key];
  let c = pool.filter(q => q.id !== prevId); if (!c.length) c = pool;
  const q = clone(c[Math.floor(Math.random() * c.length)]);
  q.mode = resolveMode(q, key);
  return q;
}
function checkAnswer(q, body) {
  if (q.mode === 'choice') return Number(body.choice) === correctIdx(q);
  const input = String(body.text || '').slice(0, 200);
  if (q.type === 'pick') return norm(input) === norm(q.a);
  if (q.type === 'choice') return norm(input) === norm(plain(q.opts[q.a])) || norm(input) === String(q.a + 1);
  const ans = Array.isArray(q.a) ? q.a : [q.a];
  if (!q.multi) return ans.some(x => norm(x) === norm(input));
  const toks = input.split(/[\s,·/]+/).map(norm).filter(Boolean);
  const need = ans.map(norm);
  if (/차례대로|순서대로/.test(q.ask || '')) return toks.length === need.length && need.every((n, i) => toks[i] === n);
  return toks.length === need.length && need.every(n => toks.includes(n));
}
const nameOfPid = pid => { for (const p of Object.values(S.players)) if (p.pid === pid) return p.name; return '모험가'; };
function ev(g, type, amt) { g.ev = { seq: (g.ev?.seq || 0) + 1, type, amt: amt || 0 }; }
function addLog(g, t) { g.log = [t, ...(g.log || [])].slice(0, 6); }
function hurt(g, amt) { if (g.shieldOn) { g.shieldOn = false; return 0; } g.hp = Math.max(0, g.hp - amt); return amt; }
function die(g) { g.phase = 'dead'; g.deaths = (g.deaths || 0) + 1; g.q = null; addLog(g, `💀 ${g.floor}층에서 쓰러졌다`); }
function startFight(g) { g.phase = 'fight'; g.mhp = g.floor === 20 ? (S.cfg.dragonHp || 3) : 1; g.q = pickQ(g.floor); g.hidden = []; g.hintOn = false; }
function newQ(g, key) { g.q = pickQ(key, g.q?.id); g.hidden = []; g.hintOn = false; }
function enterFloor(g, f) {
  g.floor = f; g.best = Math.max(g.best || 1, f); g.hidden = []; g.hintOn = false;
  const traps = S.traps[g.no] || [];
  if (traps.includes(f) && !g.trapsDone.includes(f)) {
    g.trapsDone.push(f); const d = hurt(g, S.cfg.trapDmg); ev(g, 'trap', d);
    addLog(g, `🪤 ${f}층 덫! ${d ? '-' + d : '방패로 막음'}`);
    if (g.hp <= 0) { die(g); return g; }
    g.phase = 'trap'; g.q = pickQ('trap');
  } else startFight(g);
  return g;
}
function nextTurn(g) { g.turn = (g.turn || 0) + 1; g.turnAt = Date.now(); }
function applyAnswer(g, ok, pid) {
  const nm = nameOfPid(pid);
  if (g.phase === 'trap') {
    if (ok) { const h = S.cfg.trapHeal; g.hp = Math.min(100, g.hp + h); ev(g, 'heal', h); addLog(g, `🩹 ${nm} 정답! 체력 +${h}`); startFight(g); }
    else { ev(g, 'miss'); addLog(g, `❌ ${nm} 오답. 다른 문제로 다시!`); newQ(g, 'trap'); }
  } else if (g.phase === 'fight') {
    if (ok) {
      g.correct++; g.mhp--;
      if (g.mhp > 0) { ev(g, 'hit'); addLog(g, `⚔️ ${nm} 정답! 용에게 일격 (남은 체력 ${g.mhp})`); newQ(g, g.floor); }
      else {
        ev(g, 'kill'); g.q = null;
        if (g.floor === 20) { g.phase = 'cleared'; g.clearedAt = Date.now(); addLog(g, `👑 ${nm}의 마지막 일격! 용을 물리쳤다`); }
        else if (TREASURE[g.floor] && !g.got.includes(g.floor)) {
          g.phase = 'treasure'; g.got.push(g.floor);
          for (const [k, v] of Object.entries(TREASURE[g.floor])) g.items[k] = (g.items[k] || 0) + v;
          addLog(g, `🎁 ${nm} 정답! ${g.floor}층 보물 상자 발견`);
        } else { g.phase = 'won'; addLog(g, `⚔️ ${nm} 정답! ${MON[g.floor].n} 처치`); }
      }
    } else {
      g.wrong++; const d = hurt(g, DMG(g.floor)); ev(g, 'hurt', d);
      addLog(g, d ? `💥 ${nm} 오답… ${MON[g.floor].n}의 공격 -${d}` : `🛡️ ${nm} 오답, 방패가 막았다`);
      if (g.hp <= 0) die(g); else newQ(g, g.floor);
    }
  }
  nextTurn(g);
}
function respawnFloor(g) {
  if (S.cfg.respawn === 'checkpoint') { const c = [5, 10, 15].filter(x => (g.got || []).includes(x)); return c.length ? Math.max(...c) + 1 : 1; }
  return 1;
}
function revive(g) {
  const f = respawnFloor(g);
  g.hp = 100; g.shieldOn = false; g.hidden = []; g.hintOn = false;
  if (f === 1) { g.items = { potion: 0, hint: 0, shield: 0 }; g.got = []; }
  addLog(g, `✨ 부활! ${f}층부터 다시 도전`); ev(g, 'heal', 100);
  enterFloor(g, f);
}
function useItem(g, k) {
  if (!ITEMS[k] || !(g.items[k] > 0)) return false;
  if (k === 'potion') { if (g.hp >= 100 || g.phase === 'dead' || g.phase === 'cleared') return false; const h = HEAL.potion; g.hp = Math.min(100, g.hp + h); ev(g, 'heal', h); }
  else if (k === 'shield') { if (g.shieldOn) return false; g.shieldOn = true; }
  else if (k === 'hint') {
    if (g.hintOn || !g.q) return false; g.hintOn = true;
    if (g.q.mode === 'choice') {
      const opts = optsOf(g.q); const ci = correctIdx(g.q);
      const wrong = opts.map((_, i) => i).filter(i => i !== ci).sort(() => Math.random() - 0.5);
      g.hidden = wrong.slice(0, Math.min(2, wrong.length - 1));
    }
  }
  g.items[k]--; addLog(g, `🎒 ${ITEMS[k].name} 사용`); return true;
}

/* ---------------- 모둠 배정 ---------------- */
const playersList = () => Object.values(S.players).sort((a, b) => a.joinedAt - b.joinedAt);
function membersOf(no) { return playersList().filter(p => p.group === no).map(p => p.pid); }
function syncMembers(no) {
  if (!no) return;
  if (!S.groups[no]) S.groups[no] = freshGroup(no, []);
  S.groups[no].members = membersOf(no);
}
function assignGroup() {
  const size = Math.max(1, S.cfg.groupSize || 4);
  let n = 1; while (membersOf(n).length >= size) n++;
  return n;
}

/* ---------------- 화면으로 보낼 데이터 ---------------- */
function remaining(now) {
  const c = S.cfg; const total = (c.duration || 25) * 60000;
  const el = (c.elapsed || 0) + (c.status === 'playing' && c.startedAt ? now - c.startedAt : 0);
  return Math.max(0, total - el);
}
function publicCfg(now) {
  const c = S.cfg;
  return { status: c.status, turnMode: c.turnMode, respawn: c.respawn, trapDmg: c.trapDmg, trapHeal: c.trapHeal, dragonHp: c.dragonHp, notice: c.notice, remaining: remaining(now), duration: c.duration };
}
function studentQ(g) {
  const q = g.q; if (!q) return null;
  let ask = q.ask || ASK;
  if (q.type === 'pick' && q.mode === 'text' && ask === ASK) ask = ASK_TEXT;
  return { id: q.id, type: q.type, mode: q.mode, ask, s: q.s, opts: q.mode === 'choice' ? optsOf(q) : null, multi: !!q.multi, hint: g.hintOn ? (q.hint || '') : null };
}
function studentView(token) {
  const now = Date.now(); const p = S.players[token];
  const out = { now, cfg: publicCfg(now), me: p ? { name: p.name, group: p.group, pid: p.pid } : null, group: null };
  if (p && p.group && S.groups[p.group]) {
    const g = S.groups[p.group]; const mem = g.members || [];
    const cur = mem.length ? mem[(g.turn || 0) % mem.length] : null;
    const view = clone(g); view.q = studentQ(g);
    view.members = mem.map(pid => ({ name: nameOfPid(pid), me: pid === p.pid, turn: pid === cur }));
    view.myTurn = !S.cfg.turnMode || mem.length <= 1 || cur === p.pid;
    view.canTakeover = !view.myTurn && now - (g.turnAt || 0) > 35000;
    view.respawnFloor = respawnFloor(g);
    out.group = view;
  }
  return out;
}
function teacherView() {
  const now = Date.now();
  const online = {}; for (const c of clients) if (c.token) online[c.token] = true;
  return {
    now, cfg: Object.assign({}, S.cfg, { remaining: remaining(now) }),
    players: playersList().map(p => ({ pid: p.pid, name: p.name, group: p.group, online: !!online[tokenOfPid(p.pid)] })),
    groups: S.groups, traps: S.traps, bank: bank(), customBank: !!S.bank
  };
}
function tokenOfPid(pid) { for (const [t, p] of Object.entries(S.players)) if (p.pid === pid) return t; return null; }

/* ---------------- 실시간 전송 (SSE) ---------------- */
const clients = new Set(); // {res, role, token}
let pushPending = false;
function pushAll() {
  if (pushPending) return; pushPending = true;
  setImmediate(() => {
    pushPending = false; let tv = null;
    for (const c of clients) {
      try {
        if (c.role === 'teacher') { tv = tv || JSON.stringify(teacherView()); c.res.write(`data: ${tv}\n\n`); }
        else c.res.write(`data: ${JSON.stringify(studentView(c.token))}\n\n`);
      } catch (e) { /* 끊어진 연결 */ }
    }
  });
}
setInterval(() => { for (const c of clients) { try { c.res.write(': ping\n\n'); } catch (e) {} } }, 20000);
setInterval(pushAll, 5000); // 시계와 '대신 풀기' 버튼 갱신

/* ---------------- 요청 처리 ---------------- */
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve) => {
    let data = ''; req.on('data', ch => { data += ch; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
  });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function serveFile(res, file) {
  const fp = path.join(PUBLIC, file);
  if (!fp.startsWith(PUBLIC)) return send(res, 404, { error: 'not found' });
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(buf);
  });
}

function studentAct(token, body) {
  const p = S.players[token]; if (!p) return { error: '먼저 이름을 입력해 입장해 주세요.' };
  const g = S.groups[p.group]; if (!g) return { error: '모둠이 아직 없어요.' };
  if (S.cfg.status !== 'playing') return { error: '지금은 게임이 진행 중이 아니에요.' };
  const t = body.type;
  if (t === 'answer') {
    if (!(g.phase === 'fight' || g.phase === 'trap') || !g.q || g.q.id !== body.qid) return { error: '이미 다른 모둠원이 답했어요.' };
    const mem = g.members || []; const cur = mem.length ? mem[(g.turn || 0) % mem.length] : null;
    if (S.cfg.turnMode && mem.length > 1 && cur !== p.pid) return { error: '내 차례가 아니에요.' };
    applyAnswer(g, checkAnswer(g.q, body), p.pid);
  } else if (t === 'enter') { if (g.phase !== 'ready') return {}; enterFloor(g, g.floor); }
  else if (t === 'next') { if (!(g.phase === 'won' || g.phase === 'treasure') || body.floor !== g.floor) return {}; addLog(g, `🚪 ${g.floor + 1}층으로 올라갔다`); enterFloor(g, g.floor + 1); }
  else if (t === 'revive') { if (g.phase !== 'dead') return {}; revive(g); }
  else if (t === 'item') { if (!useItem(g, body.item)) return { error: '지금은 그 아이템을 쓸 수 없어요.' }; }
  else if (t === 'takeover') {
    const i = (g.members || []).indexOf(p.pid); if (i < 0) return {};
    if (Date.now() - (g.turnAt || 0) < 35000) return { error: '아직 차례를 넘길 수 없어요.' };
    g.turn = i; g.turnAt = Date.now();
  } else return { error: '알 수 없는 행동' };
  save(); pushAll(); return { ok: true };
}

function teacherAct(body) {
  const t = body.type, now = Date.now(), c = S.cfg;
  const G = no => S.groups[no];
  switch (t) {
    case 'start':
      if (c.status === 'ended') { for (const g of Object.values(S.groups)) { const x = freshGroup(g.no, g.members); x.ev = { seq: (g.ev?.seq || 0) + 1, type: '', amt: 0 }; S.groups[g.no] = x; } S.traps = {}; }
      Object.assign(c, { status: 'playing', startedAt: now, elapsed: 0 }); break;
    case 'pause': if (c.status === 'playing') Object.assign(c, { status: 'paused', elapsed: (c.elapsed || 0) + (now - c.startedAt), startedAt: 0 }); break;
    case 'resume': if (c.status === 'paused') Object.assign(c, { status: 'playing', startedAt: now }); break;
    case 'end': Object.assign(c, { status: 'ended', elapsed: (c.elapsed || 0) + (c.status === 'playing' ? now - c.startedAt : 0), startedAt: 0 }); break;
    case 'settings': {
      const v = body.cfg || {}; const num = (x, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(+x) ? Math.round(+x) : d));
      c.groupSize = num(v.groupSize, 1, 8, c.groupSize); c.duration = num(v.duration, 5, 90, c.duration); c.dragonHp = num(v.dragonHp, 1, 6, c.dragonHp);
      c.trapDmg = num(v.trapDmg, 0, 30, c.trapDmg); c.trapHeal = num(v.trapHeal, 0, 30, c.trapHeal);
      if (['first', 'checkpoint'].includes(v.respawn)) c.respawn = v.respawn;
      if (['mixed', 'choice', 'text'].includes(v.answerMode)) c.answerMode = v.answerMode;
      if (typeof v.turnMode === 'boolean') c.turnMode = v.turnMode;
      break;
    }
    case 'notice': c.notice = String(body.text || '').slice(0, 80); break;
    case 'trap': {
      const no = +body.group, f = +body.floor; if (!(f >= 2 && f <= 19)) break;
      const g = G(no); if (g && g.trapsDone.includes(f)) return { error: '이미 발동한 덫이에요.' };
      const set = new Set(S.traps[no] || []); set.has(f) ? set.delete(f) : set.add(f); S.traps[no] = [...set].sort((a, b) => a - b); break;
    }
    case 'alltrap': case 'autotrap': {
      const gs = Object.values(S.groups).filter(g => g.phase !== 'cleared'); if (!gs.length) return { message: '모둠이 없어요.' };
      const avg = gs.reduce((s, g) => s + g.floor, 0) / gs.length; let n = 0;
      for (const g of gs) {
        let f;
        if (t === 'alltrap') f = +body.floor; else { if (g.floor < avg + 2) continue; f = Math.min(19, g.floor + 1); if (f <= g.floor) continue; }
        if (!(f >= 2 && f <= 19)) continue;
        const set = new Set(S.traps[g.no] || []); if (set.has(f) || g.trapsDone.includes(f)) continue;
        set.add(f); S.traps[g.no] = [...set].sort((a, b) => a - b); n++;
      }
      save(); pushAll();
      return { message: n ? `덫 ${n}개를 설치했어요.` : (t === 'autotrap' ? '평균보다 2층 이상 앞선 모둠이 없어요.' : '새로 설치할 덫이 없어요.') };
    }
    case 'group': {
      const g = G(+body.group); if (!g) break;
      if (body.act === 'heal') { g.hp = Math.min(100, g.hp + 20); if (g.phase === 'dead') startFight(g); ev(g, 'heal', 20); addLog(g, '🌟 선생님의 축복! 체력 +20'); }
      if (body.act === 'potion') { g.items.potion = (g.items.potion || 0) + 1; addLog(g, '🌟 선생님이 회복 물약을 보냈다'); }
      if (body.act === 'down' && g.floor > 1) enterFloor(g, g.floor - 1);
      if (body.act === 'up' && g.floor < 20) enterFloor(g, g.floor + 1);
      if (body.act === 'reset') { const x = freshGroup(g.no, g.members); x.ev = { seq: (g.ev?.seq || 0) + 1, type: '', amt: 0 }; S.groups[g.no] = x; }
      break;
    }
    case 'move': {
      const tk = tokenOfPid(body.pid); if (!tk) break; const from = S.players[tk].group, to = +body.group; if (!(to >= 1 && to <= 40)) break;
      S.players[tk].group = to; syncMembers(from); syncMembers(to); break;
    }
    case 'kick': { const tk = tokenOfPid(body.pid); if (!tk) break; const from = S.players[tk].group; delete S.players[tk]; syncMembers(from); break; }
    case 'resetAll': S.players = {}; S.groups = {}; S.traps = {}; Object.assign(c, { status: 'lobby', startedAt: 0, elapsed: 0, notice: '' }); break;
    case 'bank': {
      const b = body.bank;
      if (!b || typeof b !== 'object' || !b.floors || !Array.isArray(b.trap)) return { error: '문제 형식이 맞지 않아요.' };
      for (let f = 1; f <= 20; f++) if (b.floors[f] && !Array.isArray(b.floors[f])) return { error: `${f}층 문제 형식이 맞지 않아요.` };
      S.bank = b; break;
    }
    case 'bankReset': S.bank = null; break;
    default: return { error: '알 수 없는 명령' };
  }
  save(); pushAll(); return { ok: true };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (req.method === 'GET') {
    if (p === '/' || p === '/index.html') return serveFile(res, 'student.html');
    if (p === '/teacher' || p === '/teacher/') return serveFile(res, 'teacher.html');
    if (p === '/health') return send(res, 200, { ok: true });
    if (p === '/events') {
      const role = url.searchParams.get('role');
      if (role === 'teacher' && !teacherKeys.has(url.searchParams.get('key') || '')) return send(res, 401, { error: 'login' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 2000\n\n');
      const c = { res, role: role === 'teacher' ? 'teacher' : 'student', token: role === 'teacher' ? null : (url.searchParams.get('token') || '') };
      clients.add(c); req.on('close', () => { clients.delete(c); pushAll(); });
      if (c.role === 'teacher') res.write(`data: ${JSON.stringify(teacherView())}\n\n`);
      else res.write(`data: ${JSON.stringify(studentView(c.token))}\n\n`);
      pushAll(); return;
    }
    if (/^\/[\w.-]+\.(js|css|svg|png|ico)$/.test(p)) return serveFile(res, p.slice(1));
    res.writeHead(404); return res.end('Not found');
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    if (p === '/api/join') {
      const name = String(body.name || '').trim().slice(0, 16);
      let token = String(body.token || '');
      if (S.players[token]) { if (name) S.players[token].name = name; }
      else {
        if (!name) return send(res, 400, { error: '이름을 입력해 주세요.' });
        token = rid(16);
        S.players[token] = { pid: rid(6), name, joinedAt: Date.now(), group: 0 };
        const no = assignGroup(); S.players[token].group = no; syncMembers(no);
      }
      save(); pushAll(); return send(res, 200, { token });
    }
    if (p === '/api/act') { const r = studentAct(String(body.token || ''), body); return send(res, r.error ? 400 : 200, r); }
    if (p === '/api/login') {
      if (String(body.password || '') !== TEACHER_PASSWORD) return send(res, 401, { error: '비밀번호가 맞지 않아요.' });
      const key = rid(16); teacherKeys.add(key); return send(res, 200, { key });
    }
    if (p === '/api/teacher') {
      if (!teacherKeys.has(String(body.key || ''))) return send(res, 401, { error: 'login' });
      const r = teacherAct(body); return send(res, r.error ? 400 : 200, r);
    }
  }
  res.writeHead(404); res.end('Not found');
});
server.keepAliveTimeout = 65000;
server.listen(PORT, () => {
  console.log(`문장 성분 용의 성: http://localhost:${PORT}  (교사: /teacher)`);
  if (!process.env.TEACHER_PASSWORD) console.log('주의: TEACHER_PASSWORD가 설정되지 않아 기본 비밀번호 dragon1234를 씁니다.');
});
