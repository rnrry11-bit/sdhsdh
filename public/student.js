/* 학생 화면 */
const app = document.getElementById('app');
const St = { token: lsGet('dc_token'), state: null, recvAt: 0, es: null, busy: false, seenSeq: null, draft: '', draftQ: null, joining: false };

function connect() {
  if (St.es) St.es.close();
  const es = new EventSource('/events?role=student&token=' + encodeURIComponent(St.token || ''));
  St.es = es;
  es.onmessage = e => {
    const d = JSON.parse(e.data); St.state = d; St.recvAt = Date.now(); setConn(true);
    if (St.token && !d.me) { St.token = null; lsSet('dc_token', null); } // 서버가 초기화됨
    render();
  };
  es.onerror = () => setConn(false);
}
function setConn(ok) {
  let el = document.querySelector('.conn');
  if (ok) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'conn'; el.textContent = '연결이 끊겼어요. 다시 연결하는 중…'; document.body.appendChild(el); }
}
function remainingNow() {
  const c = St.state?.cfg; if (!c) return 0;
  return Math.max(0, c.remaining - (c.status === 'playing' ? Date.now() - St.recvAt : 0));
}
setInterval(() => document.querySelectorAll('[data-clock]').forEach(el => el.textContent = mmss(remainingNow())), 1000);

async function act(body) {
  if (St.busy) return; St.busy = true; render();
  const r = await post('/api/act', Object.assign({ token: St.token }, body));
  if (r.error) toast(r.error);
  setTimeout(() => { St.busy = false; render(); }, r.error ? 0 : 400);
}

/* ---------- 화면 ---------- */
function render() {
  const d = St.state;
  if (!d) return;
  // 입력 중인 답은 다시 그려도 지켜 줌
  const ans = document.getElementById('answer'); if (ans) St.draft = ans.value;
  const hadFocus = document.activeElement && document.activeElement.id;
  if (!d.me) renderJoin();
  else if (!d.group) app.innerHTML = `<div class="box center col" style="padding:32px 16px"><h2>모둠을 배정하는 중…</h2></div>`;
  else if (d.cfg.status === 'lobby') renderLobby(d);
  else renderGame(d);
  const ans2 = document.getElementById('answer');
  if (ans2) { ans2.value = St.draft; if (hadFocus === 'answer' && !ans2.disabled) ans2.focus(); }
  if (hadFocus === 'nick') { const n = document.getElementById('nick'); if (n) n.focus(); }
  document.getElementById('ov').innerHTML = d.cfg.status === 'paused' && d.group ? `<div class="overlay"><div class="box col center"><h2>잠시 멈춤</h2><p class="muted">선생님 설명을 들어 주세요.</p></div></div>` : '';
}

function renderJoin() {
  if (document.getElementById('joinf')) return;
  app.innerHTML = `
  <section class="hero">
    <div class="col">
      <p class="kicker">국어 · 문장 성분 원정</p>
      <h1>용에게 잡혀간 선생님을 구하라</h1>
      <p class="muted">20층 성을 오르며 문장 성분 문제를 풀어 몬스터를 물리치세요. 틀리면 공격을 받고, 체력이 0이 되면 처음부터 다시 올라가야 해요.</p>
    </div>
    <canvas id="titlecv" width="${SW}" height="${SH}" class="pixelimg" aria-label="용과 감옥에 갇힌 선생님"></canvas>
  </section>
  <form class="box col" id="joinf">
    <h3>원정대 등록</h3>
    <label class="f" for="nick">번호와 이름<input type="text" id="nick" maxlength="16" placeholder="예: 12번 김민지" autocomplete="off" required></label>
    <button class="btn" type="submit" id="joinbtn">성에 입장하기</button>
    <p class="muted" style="font-size:13px">입장한 순서대로 모둠이 정해져요.</p>
  </form>`;
  mountScene(document.getElementById('titlecv'), 20, 'ready');
  document.getElementById('joinf').onsubmit = async e => {
    e.preventDefault(); if (St.joining) return;
    const name = document.getElementById('nick').value.trim(); if (!name) return;
    St.joining = true; document.getElementById('joinbtn').disabled = true;
    const r = await post('/api/join', { name });
    St.joining = false;
    if (r.error || !r.token) { toast(r.error || '입장하지 못했어요. 다시 시도해 주세요.'); document.getElementById('joinbtn').disabled = false; return; }
    St.token = r.token; lsSet('dc_token', r.token); connect();
  };
}

function memberChips(g) {
  return `<div class="members">${(g.members || []).map(m => `<span class="${m.me ? 'me' : ''} ${m.turn && St.state.cfg.turnMode ? 'now' : ''}">${esc(m.name)}${m.me ? ' (나)' : ''}</span>`).join('')}</div>`;
}

function renderLobby(d) {
  const g = d.group, c = d.cfg;
  app.innerHTML = `
  <section class="box col">
    <p class="kicker">${g.no}모둠 배정 완료</p>
    <h2>${esc(d.me.name)}, 원정대에 합류했어요</h2>
    ${memberChips(g)}
    <p class="muted">선생님이 시작하면 1층 문이 열려요. 기다리는 동안 규칙을 확인하세요.</p>
  </section>
  <canvas id="titlecv" width="${SW}" height="${SH}" class="pixelimg" style="width:100%;border:3px solid var(--line)" aria-label="성 1층"></canvas>
  <section class="box col">
    <h3>원정 규칙</h3>
    <div class="col" style="gap:6px;font-size:14px">
      <p>❤️ 모둠 체력은 100. 틀리면 그 층 몬스터의 공격력만큼 깎여요. (1~5층 3 · 6~11층 5 · 12~16층 10 · 17~19층 15 · 용 20)</p>
      <p>✍️ 버튼을 고르는 객관식과 답을 직접 쓰는 단답형이 섞여 나와요. 단답형은 띄어쓰기와 문장 부호를 신경 쓰지 않아도 돼요.</p>
      ${c.turnMode ? '<p>🔁 문제는 모둠원이 돌아가며 풀어요. 내 차례가 아니어도 함께 의논하세요.</p>' : ''}
      <p>🎁 5층, 10층, 15층 보물 상자에서 회복 물약(체력 +10), 현자의 힌트, 수호의 방패를 얻어요.</p>
      <p>🪤 덫을 밟으면 체력 ${c.trapDmg}이 깎이고, 치료 문제를 맞히면 ${c.trapHeal} 회복해요.</p>
      <p>💀 쓰러지면 ${c.respawn === 'checkpoint' ? '마지막 보물 층 다음 층' : '1층'}부터 다시 시작해요.</p>
      <p>🐉 20층 용은 ${c.dragonHp}번 맞혀야 쓰러져요.</p>
    </div>
  </section>`;
  mountScene(document.getElementById('titlecv'), 1, 'ready');
}

function renderGame(d) {
  const g = d.group, c = d.cfg, f = g.floor, m = MON[f];
  const live = c.status === 'playing';
  if ((g.q?.id || null) !== St.draftQ) { St.draft = ''; St.draftQ = g.q?.id || null; }
  const towerRows = Array.from({ length: FLOORS }, (_, i) => i + 1).map(n => `<div class="${n === f ? 'cur' : n < f ? 'done' : ''}" title="${n}층 ${esc(MON[n].n)}"><img class="pixelimg" src="${monIcon(n)}" alt="">${n}${TREASURE[n] ? '★' : ''}</div>`).join('');
  const itemBtns = Object.keys(ITEMS).map(k => {
    const n = g.items?.[k] || 0; const on = (k === 'shield' && g.shieldOn) || (k === 'hint' && g.hintOn);
    const usable = live && !St.busy && n > 0 && !['dead', 'cleared', 'ready'].includes(g.phase)
      && !(k === 'hint' && (!g.q || g.hintOn)) && !(k === 'shield' && g.shieldOn) && !(k === 'potion' && g.hp >= 100);
    return `<button class="item ${on ? 'on' : ''}" data-item="${k}" ${usable ? '' : 'disabled'} title="${ITEMS[k].desc}"><img class="pixelimg" src="${ITEM_ICON[k]()}" alt="">${ITEMS[k].name}<span class="n">×${n}</span></button>`;
  }).join('');
  app.innerHTML = `
  <div class="box tight hud">
    <div class="col" style="gap:6px">
      <div class="row" style="gap:8px">
        <span class="pill gold">${g.no}모둠</span>
        <span class="px">${f}F / 20F</span>
        ${g.shieldOn ? '<span class="pill sky">방패 준비</span>' : ''}
        <span class="spacer"></span>
        <span class="px" style="color:var(--gold)" data-clock>${mmss(remainingNow())}</span>
      </div>
      <div class="hpbar ${hpClass(g.hp)}" role="meter" aria-valuenow="${g.hp}" aria-valuemin="0" aria-valuemax="100" aria-label="체력"><i style="width:${g.hp}%"></i><b>HP ${g.hp}/100</b></div>
    </div>
    <div class="items">${itemBtns}</div>
  </div>
  ${c.notice ? `<div class="note">📢 선생님: ${esc(c.notice)}</div>` : ''}
  <div class="stage">
    <div class="scene" id="scene">
      <canvas id="cv" width="${SW}" height="${SH}" class="pixelimg" aria-label="${f}층 ${esc(m.n)}"></canvas>
      ${['fight', 'trap', 'ready'].includes(g.phase) ? `<div class="mon-tag">${g.phase === 'trap' ? '🪤 가시 덫' : esc(m.n)} <span class="px">${g.phase === 'trap' ? '' : 'ATK ' + DMG(f)}</span></div>` : ''}
      ${f === 20 && g.phase === 'fight' ? `<div class="mhp">${Array.from({ length: c.dragonHp }, (_, i) => `<i class="${i >= g.mhp ? 'gone' : ''}"></i>`).join('')}</div>` : ''}
    </div>
    <div class="tower" aria-label="성 지도">${towerRows}</div>
  </div>
  <div id="panel">${panelHTML(d)}</div>
  <div class="box tight col"><div class="row"><h3 style="font-size:16px">원정대</h3><span class="spacer"></span><span class="muted" style="font-size:12px">정답 ${g.correct || 0} · 오답 ${g.wrong || 0} · 쓰러짐 ${g.deaths || 0}</span></div>${memberChips(g)}</div>
  ${(g.log || []).length ? `<div class="log" aria-live="polite">${g.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>` : ''}`;
  mountScene(document.getElementById('cv'), f, g.phase);
  const seq = g.ev?.seq || 0;
  if (St.seenSeq == null) St.seenSeq = seq; else if (seq > St.seenSeq) { St.seenSeq = seq; playEvent(g.ev); } else if (seq < St.seenSeq) St.seenSeq = seq;
  bindGame(g);
}

function panelHTML(d) {
  const g = d.group, c = d.cfg, f = g.floor;
  if (c.status === 'paused') return `<div class="card center"><p class="ask">잠시 멈춤</p><p>선생님이 게임을 멈췄어요.</p></div>`;
  if (c.status === 'ended') return `<div class="card center"><p class="ask">원정 종료</p><p>${g.phase === 'cleared' ? '선생님을 구출했어요! 훌륭해요.' : `${f}층까지 올라갔어요. 수고했어요!`}</p></div>`;
  if (g.phase === 'ready') return `<div class="card center"><p class="ask">${f}층 문 앞</p><p>문을 열면 ${esc(MON[f].n)}이(가) 기다리고 있어요.</p><button class="btn" data-act="enter" ${St.busy ? 'disabled' : ''}>${f}층으로 들어가기</button></div>`;
  if (g.phase === 'won') return `<div class="card center"><p class="ask">${esc(MON[f].n)}을(를) 물리쳤다!</p><p>다음 층에는 더 강한 몬스터가 기다려요.</p><button class="btn" data-act="next" ${St.busy ? 'disabled' : ''}>${f + 1}층으로 올라가기</button></div>`;
  if (g.phase === 'treasure') {
    const t = TREASURE[f];
    return `<div class="card center"><p class="ask">${f}층 보물 상자를 열었다!</p>
      <div class="row" style="justify-content:center">${Object.entries(t).map(([k, v]) => `<span class="pill" style="background:#fffaf0;color:var(--parch-ink)"><img class="pixelimg" src="${ITEM_ICON[k]()}" alt="" style="width:20px;height:20px;vertical-align:-4px"> ${ITEMS[k].name} ×${v}</span>`).join('')}</div>
      <p style="font-size:14px">아이템은 위쪽 가방에서 언제든 쓸 수 있어요. 회복 물약은 체력 10을 채워요.</p>
      <button class="btn" data-act="next" ${St.busy ? 'disabled' : ''}>${f + 1}층으로 올라가기</button></div>`;
  }
  if (g.phase === 'dead') return `<div class="card center"><p class="ask">원정대가 쓰러졌다…</p><p>${f}층의 ${esc(MON[f].n)}에게 당했어요.${g.respawnFloor === 1 ? ' 아이템은 사라지지만' : ''} 다시 도전할 수 있어요.</p><button class="btn red" data-act="revive" ${St.busy ? 'disabled' : ''}>부활해서 ${g.respawnFloor}층부터 다시</button></div>`;
  if (g.phase === 'cleared') return `<div class="card center"><p class="ask">선생님을 구출했다!</p><p>고대의 흑룡이 쓰러지고 감옥 문이 열렸어요. 정답 ${g.correct}개, 오답 ${g.wrong}개.</p><p style="font-size:14px">다른 모둠을 기다리는 동안 헷갈렸던 문장 성분을 정리해 보세요.</p></div>`;
  const q = g.q; if (!q) return '';
  const dis = !g.myTurn || St.busy;
  const turnLine = !c.turnMode || (g.members || []).length <= 1 ? '' :
    `<div class="turn">${g.myTurn ? '<b>내 차례예요!</b> 모둠원과 의논한 뒤 답하세요.' : `<span><b>${esc((g.members.find(m => m.turn) || {}).name || '')}</b> 차례예요. 함께 의논해 주세요.</span>${g.canTakeover ? '<button class="btn ghost sm" id="takeover">대신 풀기</button>' : ''}`}</div>`;
  let body;
  if (q.mode === 'text') {
    const ph = q.multi ? '띄어쓰기로 구분해 입력' : q.type === 'pick' ? '예: 주어' : '정답 입력';
    body = `<form class="ansrow" id="ansf"><input type="text" id="answer" autocomplete="off" autocapitalize="off" placeholder="${ph}" ${dis ? 'disabled' : ''} aria-label="정답"><button class="btn" type="submit" ${dis ? 'disabled' : ''}>공격!</button></form>`;
  } else {
    const long = q.type === 'choice' && q.opts.some(o => o.length > 8);
    body = `<div class="opts ${long ? 'long' : ''}">${q.opts.map((o, i) => `<button class="opt ${(g.hidden || []).includes(i) ? 'gone' : ''}" data-opt="${i}" ${dis || (g.hidden || []).includes(i) ? 'disabled' : ''}>${q.type === 'choice' ? `${'①②③④⑤⑥'[i] || ''} ` : ''}${markup(o)}</button>`).join('')}</div>`;
  }
  return `<div class="card">
    <span class="modebadge">${q.mode === 'text' ? '단답형' : '객관식'}</span>
    ${g.phase === 'trap' ? `<p style="font-size:14px;color:#8e2b2b;font-weight:800">🪤 덫에 걸렸다! 치료 문제를 맞히면 체력 +${c.trapHeal}</p>` : ''}
    <p class="ask">${esc(q.ask)}</p>
    ${q.s ? `<p class="sent">${markup(q.s)}</p>` : ''}
    ${body}
    ${q.hint ? `<div class="hint">🧙 현자의 힌트: ${esc(q.hint)}</div>` : ''}
    ${turnLine}
  </div>`;
}

function bindGame(g) {
  app.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => act({ type: 'answer', qid: g.q.id, choice: +b.dataset.opt }));
  const af = document.getElementById('ansf');
  if (af) af.onsubmit = e => {
    e.preventDefault(); const v = document.getElementById('answer').value.trim(); if (!v) return;
    St.draft = ''; act({ type: 'answer', qid: g.q.id, text: v });
  };
  app.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act({ type: b.dataset.act, floor: g.floor }));
  app.querySelectorAll('[data-item]').forEach(b => b.onclick = () => act({ type: 'item', item: b.dataset.item }));
  const tk = document.getElementById('takeover'); if (tk) tk.onclick = () => act({ type: 'takeover' });
}

if (St.token) connect(); else { St.state = { me: null, cfg: { status: 'lobby' } }; render(); connect(); }
