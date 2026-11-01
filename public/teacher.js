/* 교사 화면 */
const app = document.getElementById('app');
const ASK = window.SHARED.ASK;
const GROUP_COLORS = ['#f2b544', '#7cc0ff', '#5fcf7a', '#ff8fb1', '#c39bff', '#ff9f5a', '#5fe0d0', '#e8e86a', '#ff6b62', '#a8d36b', '#9fb4ff', '#f0a8ff'];
const gColor = n => GROUP_COLORS[(n - 1) % GROUP_COLORS.length];
const T = { key: sessionStorage.getItem('dc_key'), pw: sessionStorage.getItem('dc_pw'), d: null, recvAt: 0, es: null,
  tab: 'monitor', edFloor: '1', editing: null, confirmReset: false, confirmQReset: false, showQR: false, firstData: true };

/* ---------- 로그인 / 연결 ---------- */
function renderLogin(msg) {
  app.innerHTML = `
  <form class="box col" id="loginf" style="max-width:420px;margin:40px auto 0">
    <p class="kicker">교사용 지휘실</p>
    <h2>문장 성분 용의 성</h2>
    <label class="f" for="pw">교사 비밀번호<input type="password" id="pw" autocomplete="current-password" required></label>
    ${msg ? `<p style="color:var(--ember)">${esc(msg)}</p>` : ''}
    <button class="btn" type="submit">들어가기</button>
    <p class="muted" style="font-size:13px">비밀번호는 Render의 환경 변수 TEACHER_PASSWORD로 정해요.</p>
  </form>`;
  document.getElementById('pw').focus();
  document.getElementById('loginf').onsubmit = async e => {
    e.preventDefault(); const pw = document.getElementById('pw').value;
    const ok = await login(pw); if (!ok) renderLogin('비밀번호가 맞지 않아요.');
  };
}
async function login(pw) {
  const r = await post('/api/login', { password: pw });
  if (!r.key) return false;
  T.key = r.key; T.pw = pw; sessionStorage.setItem('dc_key', r.key); sessionStorage.setItem('dc_pw', pw); connect(); return true;
}
function connect() {
  if (T.es) T.es.close();
  const es = new EventSource('/events?role=teacher&key=' + encodeURIComponent(T.key));
  T.es = es;
  es.onmessage = e => { T.d = JSON.parse(e.data); T.recvAt = Date.now(); setConn(true); backupBank(); render(true); };
  es.onerror = async () => {
    setConn(false);
    if (es.readyState === EventSource.CLOSED) { // 서버가 다시 시작되어 열쇠가 사라진 경우
      es.close();
      if (T.pw && await login(T.pw)) return;
      setTimeout(() => { if (T.pw) login(T.pw).then(ok => { if (!ok) renderLogin(); }); else renderLogin(); }, 3000);
    }
  };
}
function setConn(ok) {
  let el = document.querySelector('.conn');
  if (ok) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'conn'; el.textContent = '서버 연결이 끊겼어요. 다시 연결하는 중…'; document.body.appendChild(el); }
}
async function cmd(body) {
  const r = await post('/api/teacher', Object.assign({ key: T.key }, body));
  if (r._status === 401) { if (T.pw && await login(T.pw)) return cmd(body); renderLogin('다시 로그인해 주세요.'); return r; }
  if (r.error) toast(r.error); else if (r.message) toast(r.message);
  return r;
}
/* 서버 재시작(무료 Render는 잠들면 초기화됨)에 대비해 만든 문제를 이 브라우저에 보관 */
function backupBank() {
  if (T.d.customBank) lsSet('dc_bank', JSON.stringify(T.d.bank));
}
function remainingNow() {
  const c = T.d?.cfg; if (!c) return 0;
  return Math.max(0, c.remaining - (c.status === 'playing' ? Date.now() - T.recvAt : 0));
}
setInterval(() => document.querySelectorAll('[data-clock]').forEach(el => el.textContent = mmss(remainingNow())), 1000);

/* ---------- 렌더링 ---------- */
const groupList = () => Object.values(T.d.groups || {}).filter(g => g && g.no).sort((a, b) => a.no - b.no);
const nameOf = pid => (T.d.players.find(p => p.pid === pid) || {}).name || '모험가';
function render(fromData) {
  if (!T.d) return;
  // 문제/설정을 고치는 중에는 학생 움직임 때문에 입력이 지워지지 않도록 다시 그리지 않음
  if (fromData && !T.firstData && (T.tab === 'questions' || T.tab === 'settings')) { updateHeader(); return; }
  T.firstData = false;
  const a = document.activeElement; const keep = a && a.id ? { id: a.id, v: a.value } : null;
  const c = T.d.cfg, groups = groupList(), np = T.d.players.length, cleared = groups.filter(g => g.phase === 'cleared').length;
  const showRestore = !T.d.customBank && lsGet('dc_bank') && !T.dismissRestore;
  app.innerHTML = `
  <header class="box tbar">
    <div class="col" style="gap:2px"><p class="kicker" style="font-size:15px">교사용 지휘실</p><h2>문장 성분 용의 성</h2></div>
    <span class="spacer"></span>
    <span id="hdr">${headerHTML()}</span>
  </header>
  ${showRestore ? `<div class="note row"><span>서버가 다시 시작되어 기본 문제로 돌아갔어요. 이 브라우저에 저장해 둔 내 문제를 다시 올릴까요?</span><span class="spacer"></span><button class="btn sm" data-t="restore">내 문제 다시 올리기</button><button class="btn ghost sm" data-t="norestore">괜찮아요</button></div>` : ''}
  <div class="row" style="font-size:14px">
    <span class="muted">입장 학생 <b style="color:var(--text)">${np}명</b> · 모둠 <b style="color:var(--text)">${groups.length}개</b> · 구출 성공 <b style="color:var(--gold)">${cleared}/${groups.length}</b></span>
    <span class="spacer"></span>
    <button class="btn ghost sm" data-t="qr">학생 입장 QR·링크</button>
  </div>
  <nav class="tabs" role="tablist">
    ${[['monitor', '진행 현황 · 덫'], ['students', '학생 · 모둠'], ['questions', '문제 관리'], ['settings', '설정']].map(([k, l]) => `<button class="tab ${T.tab === k ? 'on' : ''}" data-tab="${k}" role="tab" aria-selected="${T.tab === k}">${l}</button>`).join('')}
  </nav>
  <div id="tpanel">${T.tab === 'monitor' ? monitorHTML(groups) : T.tab === 'students' ? studentsHTML(groups) : T.tab === 'questions' ? questionsHTML() : settingsHTML()}</div>`;
  bind();
  renderQR();
  if (keep) { const el = document.getElementById(keep.id); if (el) { if (el.type === 'text' || el.tagName === 'TEXTAREA') el.value = keep.v; el.focus(); } }
}
function headerHTML() {
  const c = T.d.cfg;
  const pill = c.status === 'playing' ? '<span class="pill green">진행 중</span>' : c.status === 'paused' ? '<span class="pill gold">일시정지</span>' : c.status === 'ended' ? '<span class="pill red">종료</span>' : '<span class="pill">입장 대기</span>';
  return `<span class="row">${pill}<span class="clock" data-clock>${mmss(remainingNow())}</span>
    ${c.status === 'lobby' || c.status === 'ended' ? `<button class="btn green" data-t="start">${c.status === 'ended' ? '새 판 시작' : '게임 시작'}</button>` : ''}
    ${c.status === 'playing' ? `<button class="btn" data-t="pause">일시정지</button>` : ''}
    ${c.status === 'paused' ? `<button class="btn green" data-t="resume">재개</button>` : ''}
    ${c.status === 'playing' || c.status === 'paused' ? `<button class="btn red" data-t="end">종료</button>` : ''}</span>`;
}
function updateHeader() { const h = document.getElementById('hdr'); if (h) { h.innerHTML = headerHTML(); h.querySelectorAll('[data-t]').forEach(b => b.onclick = () => action(b.dataset.t)); } }

function monitorHTML(groups) {
  const tower = Array.from({ length: FLOORS }, (_, i) => i + 1).map(n => {
    const here = groups.filter(g => g.floor === n && g.phase !== 'cleared');
    return `<div class="fl ${TREASURE[n] ? 'tre' : ''}"><span class="px">${n}F</span><img class="pixelimg" src="${monIcon(n)}" alt="${esc(MON[n].n)}" title="${esc(MON[n].n)}"><div class="chips">${here.map(g => `<span class="chip" style="background:${gColor(g.no)}">${g.no}${g.phase === 'dead' ? '💀' : g.phase === 'trap' ? '🪤' : ''}</span>`).join('')}</div></div>`;
  }).join('');
  const done = groups.filter(g => g.phase === 'cleared');
  const avg = groups.length ? groups.reduce((s, g) => s + g.floor, 0) / groups.length : 0;
  return `<div class="overview" style="margin-top:12px">
    <aside class="box tight col">
      <h3 style="font-size:17px">성 전체 지도</h3>
      ${done.length ? `<div class="row" style="gap:4px"><span class="muted" style="font-size:12px">구출 완료</span>${done.map(g => `<span class="chip" style="background:${gColor(g.no)}">${g.no}👑</span>`).join('')}</div>` : ''}
      <div class="ttower">${tower}</div>
      <p class="muted" style="font-size:12px">금색 줄: 보물 층 · 숫자: 모둠</p>
    </aside>
    <div class="col">
      <div class="box tight col">
        <div class="row"><h3 style="font-size:17px">진행 조절</h3><span class="spacer"></span><span class="muted" style="font-size:13px">평균 ${avg.toFixed(1)}층</span></div>
        <div class="row">
          <button class="btn sm" data-t="autotrap" ${groups.length ? '' : 'disabled'}>앞선 모둠 다음 층에 덫</button>
          <label class="row" style="gap:6px;font-size:14px" for="alltrapf">전체 덫 <select id="alltrapf">${Array.from({ length: 18 }, (_, i) => i + 2).map(n => `<option value="${n}">${n}층</option>`).join('')}</select></label>
          <button class="btn ghost sm" data-t="alltrap" ${groups.length ? '' : 'disabled'}>모든 모둠에 설치</button>
        </div>
        <form class="row" id="noticef"><input type="text" id="notice" maxlength="80" placeholder="학생 화면 공지 (예: 17층부터는 조사까지 쓰세요)" value="${esc(T.d.cfg.notice || '')}" style="flex:1"><button class="btn ghost sm" type="submit">공지</button></form>
      </div>
      ${groups.length ? `<div class="gcards">${groups.map(gcardHTML).join('')}</div>` : `<div class="box col center" style="padding:28px 16px"><h3>아직 입장한 모둠이 없어요</h3><p class="muted">학생들이 학생 링크로 들어와 이름을 입력하면 ${T.d.cfg.groupSize}명씩 입장 순서대로 모둠이 만들어져요.</p><button class="btn" data-t="qr">학생 입장 QR 보기</button></div>`}
    </div>
  </div>`;
}
function gcardHTML(g) {
  const traps = T.d.traps[g.no] || []; const acc = (g.correct + g.wrong) ? Math.round(g.correct / (g.correct + g.wrong) * 100) + '%' : '-';
  const trapBtns = Array.from({ length: 18 }, (_, i) => i + 2).map(n => {
    const fired = (g.trapsDone || []).includes(n), set = traps.includes(n);
    return `<button class="trap ${fired ? 'fired' : set ? 'set' : ''} ${n < g.floor && !fired ? 'past' : ''} ${n === g.floor ? 'here' : ''}" data-trap="${g.no}:${n}" aria-pressed="${set}" title="${n}층 덫${fired ? ' (발동함)' : set ? ' (설치됨)' : ''}">${n}</button>`;
  }).join('');
  const q = g.q;
  return `<article class="box tight gcard">
    <header><span class="swatch" style="background:${gColor(g.no)}"></span><h3>${g.no}모둠</h3>
      <span class="pill ${g.phase === 'cleared' ? 'gold' : g.phase === 'dead' ? 'red' : g.phase === 'trap' ? 'sky' : ''}">${PHASE[g.phase] || g.phase}</span><span class="spacer"></span><span class="px" style="color:var(--gold)">${g.floor}F</span></header>
    <div class="muted" style="font-size:13px">${(g.members || []).map(pid => esc(nameOf(pid))).join(', ') || '모둠원 없음'}</div>
    <div class="hpbar ${hpClass(g.hp)}"><i style="width:${g.hp}%"></i><b>HP ${g.hp}</b></div>
    ${q ? `<div style="font-size:12px" class="muted">지금 문제 (${q.mode === 'text' ? '단답형' : '객관식'}): ${markup(q.s || q.ask)}</div>` : ''}
    <div class="stat"><div><span>정답률</span><b>${acc}</b></div><div><span>쓰러짐</span><b>${g.deaths || 0}</b></div><div><span>최고층</span><b>${g.best || g.floor}</b></div><div><span>아이템</span><b>${Object.values(g.items || {}).reduce((a, b) => a + b, 0)}</b></div></div>
    <div class="tlabel">덫 설치 (층 번호를 눌러 켜고 끄기)</div>
    <div class="traps">${trapBtns}</div>
    <div class="row" style="gap:6px">
      <button class="btn ghost sm" data-g="heal:${g.no}" title="체력 20 회복">체력 +20</button>
      <button class="btn ghost sm" data-g="potion:${g.no}">물약 주기</button>
      <button class="btn ghost sm" data-g="down:${g.no}" aria-label="한 층 내리기">▼층</button>
      <button class="btn ghost sm" data-g="up:${g.no}" aria-label="한 층 올리기">▲층</button>
      <button class="btn ghost sm" data-g="reset:${g.no}">처음부터</button>
    </div>
  </article>`;
}
function studentsHTML(groups) {
  const ps = T.d.players;
  const maxG = Math.max(1, ...groups.map(g => g.no), ...ps.map(p => p.group));
  return `<div class="col" style="margin-top:12px">
    <div class="box col">
      <h3>입장 순서</h3>
      <p class="muted" style="font-size:14px">초록 점은 지금 접속 중인 학생이에요. 모둠을 바꾸려면 오른쪽에서 고르세요.</p>
      ${ps.length ? `<div class="stu">${ps.map((p, i) => `<div><span class="dot ${p.online ? 'on' : ''}"></span><span class="px" style="font-size:8px;color:var(--muted)">${i + 1}</span><span>${esc(p.name)}</span>
        <select data-move="${p.pid}" aria-label="${esc(p.name)} 모둠">${Array.from({ length: maxG + 1 }, (_, k) => k + 1).map(n => `<option value="${n}" ${p.group === n ? 'selected' : ''}>${n}모둠</option>`).join('')}</select>
        <button class="btn ghost sm" data-kick="${p.pid}" aria-label="${esc(p.name)} 내보내기">✕</button></div>`).join('')}</div>` : '<p class="muted">아직 입장한 학생이 없어요.</p>'}
    </div>
    <div class="box col">
      <h3>전체 초기화</h3>
      <p class="muted" style="font-size:14px">모든 학생, 모둠, 덫 기록을 지워요. 문제와 설정은 남아요. 다른 반 수업을 시작할 때 쓰세요. 학생들은 이름을 다시 입력해야 해요.</p>
      <div class="row">${T.confirmReset ? `<span style="color:var(--ember)">정말 지울까요?</span><button class="btn red sm" data-t="resetall">모두 지우기</button><button class="btn ghost sm" data-t="cancelreset">취소</button>` : `<button class="btn red sm" data-t="askreset">초기화…</button>`}</div>
    </div>
  </div>`;
}
function settingsHTML() {
  const c = T.d.cfg;
  return `<form class="box col" id="setf" style="margin-top:12px">
    <h3>게임 설정</h3>
    <div class="grid2">
      <label class="f" for="s_mode">문제 방식<select id="s_mode">
        <option value="mixed" ${c.answerMode === 'mixed' ? 'selected' : ''}>섞어서 (1~5층 객관식, 6층부터 절반은 단답형)</option>
        <option value="choice" ${c.answerMode === 'choice' ? 'selected' : ''}>성분 고르기 문제는 모두 객관식</option>
        <option value="text" ${c.answerMode === 'text' ? 'selected' : ''}>가능한 문제는 모두 단답형</option></select></label>
      <label class="f" for="s_size">모둠 인원<input type="number" id="s_size" min="1" max="8" value="${c.groupSize}"></label>
      <label class="f" for="s_dur">제한 시간 (분)<input type="number" id="s_dur" min="5" max="90" value="${c.duration}"></label>
      <label class="f" for="s_dhp">용을 쓰러뜨리는 정답 수<input type="number" id="s_dhp" min="1" max="6" value="${c.dragonHp}"></label>
      <label class="f" for="s_resp">쓰러지면 다시 시작할 곳<select id="s_resp"><option value="first" ${c.respawn === 'first' ? 'selected' : ''}>1층부터</option><option value="checkpoint" ${c.respawn === 'checkpoint' ? 'selected' : ''}>마지막 보물 층 다음부터</option></select></label>
      <label class="f" for="s_tdmg">덫 피해<input type="number" id="s_tdmg" min="0" max="30" value="${c.trapDmg}"></label>
      <label class="f" for="s_theal">덫 치료 문제 회복량<input type="number" id="s_theal" min="0" max="30" value="${c.trapHeal}"></label>
      <label class="f" for="s_turn">문제 푸는 사람<select id="s_turn"><option value="1" ${c.turnMode ? 'selected' : ''}>모둠원이 돌아가며 풀기</option><option value="0" ${!c.turnMode ? 'selected' : ''}>누구나 풀기</option></select></label>
    </div>
    <div class="row"><button class="btn" type="submit">설정 저장</button><span class="muted" style="font-size:13px">몬스터 공격력: 1~5층 3 · 6~11층 5 · 12~16층 10 · 17~19층 15 · 20층 20</span></div>
    <div class="note">균형: 보물에서 회복 물약 4개(각 +10)와 방패 1개를 얻어 최대 약 55를 되살릴 수 있어요. 체력 100에 이 회복을 더하면, 17층 이후 오답 3번과 용에게 2번 틀리는 정도까지 버틸 수 있어요. 반이 많이 쓰러지면 ‘마지막 보물 층 다음부터’로 바꾸거나 교사 화면의 ‘체력 +20’으로 도와주세요.</div>
  </form>`;
}
const TYPE_NAME = { pick: '성분 고르기', choice: '선택지', text: '단답형' };
const FORM_NAME = { auto: '설정 따름', choice: '항상 객관식', text: '항상 단답형' };
function questionsHTML() {
  const b = T.d.bank; const key = T.edFloor; const list = key === 'trap' ? b.trap : (b.floors[key] || []);
  const floorBtns = Array.from({ length: FLOORS }, (_, i) => String(i + 1)).map(k => `<button class="btn sm ${T.edFloor === k ? '' : 'ghost'}" data-ef="${k}">${k}층</button>`).join('') + `<button class="btn sm ${T.edFloor === 'trap' ? '' : 'ghost'}" data-ef="trap">덫</button>`;
  const ansText = q => q.type === 'choice' ? '①②③④⑤⑥'[q.a] : q.type === 'pick' ? q.a : (q.a || []).join(q.multi ? ' + ' : ' 또는 ');
  return `<div class="col" style="margin-top:12px">
    <div class="box tight col"><div class="floors">${floorBtns}</div>
      <p class="muted" style="font-size:13px">${key === 'trap' ? '덫을 밟았을 때 내는 치료 문제예요.' : `${key}층 ${esc(MON[+key].n)} · 공격력 ${DMG(+key)} · 틀리면 같은 층의 다른 문제가 나와요. 층마다 2개 이상 두세요.`} ${T.d.customBank ? '' : '(지금은 기본 문제)'}</p></div>
    <div class="qlist">${list.map((q, i) => `<div class="qitem"><div class="col" style="gap:2px;min-width:0">
        <span class="muted" style="font-size:12px">${TYPE_NAME[q.type]}${q.type === 'pick' ? ' · ' + FORM_NAME[q.form || 'auto'] : ''} · ${esc(q.ask)}</span>
        <span class="s">${markup(q.s || '')}</span>
        ${q.type === 'choice' ? `<span style="font-size:13px">${q.opts.map((o, j) => `${'①②③④⑤⑥'[j]} ${markup(o)}`).join(' &nbsp;')}</span>` : ''}
        <span class="a">정답: ${esc(ansText(q))}</span></div>
      <div class="row" style="gap:4px"><button class="btn ghost sm" data-qe="${i}">수정</button><button class="btn ghost sm" data-qd="${i}" aria-label="삭제">✕</button></div></div>`).join('') || '<p class="muted">문제가 없어요. 기본 문제가 대신 나와요.</p>'}</div>
    ${T.editing ? editorHTML(T.editing) : `<div class="row"><button class="btn sm" data-qn="pick">+ 성분 고르기 문제</button><button class="btn sm ghost" data-qn="text">+ 단답형 문제</button><button class="btn sm ghost" data-qn="choice">+ 선택지 문제</button></div>`}
    <div class="box col">
      <h3>문제 묶음 옮기기</h3>
      <p class="muted" style="font-size:13px">전체 문제를 텍스트로 복사해 보관하거나, 붙여 넣어 불러올 수 있어요. 무료 서버는 잠들면 초기화되니 만든 문제는 꼭 복사해 두세요. (이 브라우저에도 자동으로 보관돼요.)</p>
      <textarea id="qjson" rows="4" placeholder="여기에 붙여 넣고 ‘가져오기’를 누르세요"></textarea>
      <div class="row"><button class="btn ghost sm" data-t="qexport">전체 복사</button><button class="btn ghost sm" data-t="qimport">가져오기</button><span class="spacer"></span>${T.confirmQReset ? `<button class="btn red sm" data-t="qreset">기본 문제로 되돌리기 확인</button>` : `<button class="btn ghost sm" data-t="qaskreset">기본 문제로 되돌리기</button>`}</div>
    </div>
  </div>`;
}
function editorHTML(ed) {
  const q = ed.q;
  return `<form class="box col" id="qform">
    <h3>${ed.index == null ? '새 문제' : '문제 수정'} · ${TYPE_NAME[q.type]}</h3>
    <label class="f" for="q_ask">발문<input type="text" id="q_ask" value="${esc(q.ask)}" placeholder="${q.type === 'text' ? '예: 다음 문장에서 부사어를 찾아 쓰시오.' : ''}"></label>
    <label class="f" for="q_s">문장 (밑줄은 대괄호로: 나는 [사과를] 먹었다.)<input type="text" id="q_s" value="${esc(q.s || '')}"></label>
    ${q.type === 'pick' ? `<div class="grid2"><label class="f" for="q_a">정답 성분<select id="q_a">${STD.map(s => `<option ${q.a === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="f" for="q_form">내는 방식<select id="q_form">${Object.entries(FORM_NAME).map(([k, v]) => `<option value="${k}" ${(q.form || 'auto') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <p class="muted" style="font-size:12px">단답형으로 나오면 학생이 ‘부사어’처럼 성분 이름을 직접 써요.</p>` : ''}
    ${q.type === 'choice' ? `<label class="f" for="q_opts">선택지 (한 줄에 하나, 2~6개)<textarea id="q_opts" rows="4">${esc((q.opts || []).join('\n'))}</textarea></label>
      <label class="f" for="q_a">정답 번호<input type="number" id="q_a" min="1" max="6" value="${(q.a || 0) + 1}"></label>` : ''}
    ${q.type === 'text' ? `<label class="f" for="q_a">정답 (인정할 답이 여럿이면 | 로 구분, 예: 5|다섯)<input type="text" id="q_a" value="${esc((q.a || []).join('|'))}"></label>
      <label class="row" style="gap:6px;font-size:14px" for="q_multi"><input type="checkbox" id="q_multi" ${q.multi ? 'checked' : ''}> 여러 낱말을 모두 써야 정답 (| 로 나눈 낱말을 학생이 띄어 써서 입력)</label>
      <p class="muted" style="font-size:12px">채점할 때 띄어쓰기와 문장 부호는 무시해요. 발문에 ‘차례대로’가 있으면 순서까지 봐요.</p>` : ''}
    <label class="f" for="q_hint">현자의 힌트<input type="text" id="q_hint" value="${esc(q.hint || '')}"></label>
    <div class="row"><button class="btn" type="submit">저장</button><button class="btn ghost" type="button" data-t="qcancel">취소</button></div>
  </form>`;
}

/* ---------- QR ---------- */
function renderQR() {
  const ov = document.getElementById('ov');
  if (!T.showQR) { ov.innerHTML = ''; return; }
  const url = location.origin + '/';
  ov.innerHTML = `<div class="overlay" id="qrov"><div class="box col center" style="max-width:520px">
    <h2>학생 입장</h2><div class="qrbox" id="qr"></div>
    <p class="linkline">${esc(url)}</p>
    <div class="row" style="justify-content:center"><button class="btn sm" data-t="copylink">링크 복사</button><button class="btn ghost sm" data-t="closeqr">닫기</button></div>
    <p class="muted" style="font-size:13px">학생은 로그인 없이 이 링크로 들어와 이름만 입력하면 돼요.</p></div></div>`;
  const box = document.getElementById('qr');
  if (window.QRCode) new QRCode(box, { text: url, width: 260, height: 260 }); else box.textContent = url;
  ov.querySelectorAll('[data-t]').forEach(b => b.onclick = () => action(b.dataset.t));
  document.getElementById('qrov').onclick = e => { if (e.target.id === 'qrov') { T.showQR = false; renderQR(); } };
}

/* ---------- 이벤트 ---------- */
function bank() { return T.d.bank; }
const clone = o => JSON.parse(JSON.stringify(o));
async function saveBank(nb) { const r = await cmd({ type: 'bank', bank: nb }); if (!r.error) { lsSet('dc_bank', JSON.stringify(nb)); toast('문제를 저장했어요'); } T.firstData = true; }
function bind() {
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { T.tab = b.dataset.tab; T.editing = null; render(); });
  app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => action(b.dataset.t));
  app.querySelectorAll('[data-trap]').forEach(b => b.onclick = () => { const [g, f] = b.dataset.trap.split(':').map(Number); cmd({ type: 'trap', group: g, floor: f }); });
  app.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const [a, n] = b.dataset.g.split(':'); cmd({ type: 'group', act: a, group: +n }); });
  const nf = document.getElementById('noticef'); if (nf) nf.onsubmit = e => { e.preventDefault(); cmd({ type: 'notice', text: document.getElementById('notice').value.trim() }).then(r => { if (!r.error) toast('공지를 보냈어요'); }); };
  app.querySelectorAll('[data-move]').forEach(s => s.onchange = () => cmd({ type: 'move', pid: s.dataset.move, group: +s.value }));
  app.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => cmd({ type: 'kick', pid: b.dataset.kick }));
  const sf = document.getElementById('setf');
  if (sf) sf.onsubmit = async e => {
    e.preventDefault(); const v = id => document.getElementById(id).value;
    const r = await cmd({ type: 'settings', cfg: { answerMode: v('s_mode'), groupSize: +v('s_size'), duration: +v('s_dur'), dragonHp: +v('s_dhp'), respawn: v('s_resp'), trapDmg: +v('s_tdmg'), trapHeal: +v('s_theal'), turnMode: v('s_turn') === '1' } });
    if (!r.error) { toast('설정을 저장했어요'); T.firstData = true; }
  };
  app.querySelectorAll('[data-ef]').forEach(b => b.onclick = () => { T.edFloor = b.dataset.ef; T.editing = null; render(); });
  app.querySelectorAll('[data-qn]').forEach(b => b.onclick = () => {
    const t = b.dataset.qn;
    T.editing = { index: null, q: t === 'pick' ? { type: 'pick', ask: ASK, s: '', a: '주어', hint: '', form: 'auto' } : t === 'choice' ? { type: 'choice', ask: '', s: '', opts: ['', '', '', ''], a: 0, hint: '' } : { type: 'text', ask: '', s: '', a: [], hint: '', multi: false } };
    render();
  });
  app.querySelectorAll('[data-qe]').forEach(b => b.onclick = () => { const list = T.edFloor === 'trap' ? bank().trap : bank().floors[T.edFloor]; T.editing = { index: +b.dataset.qe, q: clone(list[+b.dataset.qe]) }; render(); });
  app.querySelectorAll('[data-qd]').forEach(b => b.onclick = () => { const nb = clone(bank()); const list = T.edFloor === 'trap' ? nb.trap : (nb.floors[T.edFloor] || []); list.splice(+b.dataset.qd, 1); if (T.edFloor !== 'trap') nb.floors[T.edFloor] = list; saveBank(nb); });
  const qf = document.getElementById('qform');
  if (qf) qf.onsubmit = e => {
    e.preventDefault(); const q = clone(T.editing.q); const v = id => (document.getElementById(id)?.value ?? '').trim();
    q.ask = v('q_ask') || (q.type === 'pick' ? ASK : ''); q.s = v('q_s'); q.hint = v('q_hint');
    if (!q.ask) { toast('발문을 적어 주세요'); return; }
    if (q.type === 'pick') { q.a = v('q_a'); q.form = v('q_form') || 'auto'; }
    if (q.type === 'choice') {
      q.opts = document.getElementById('q_opts').value.split('\n').map(x => x.trim()).filter(Boolean); q.a = Math.max(0, (+v('q_a') || 1) - 1);
      if (q.opts.length < 2 || q.opts.length > 6) { toast('선택지는 2~6개로 적어 주세요'); return; }
      if (q.a >= q.opts.length) { toast('정답 번호가 선택지 수보다 커요'); return; }
    }
    if (q.type === 'text') { q.a = v('q_a').split('|').map(x => x.trim()).filter(Boolean); q.multi = document.getElementById('q_multi').checked; if (!q.a.length) { toast('정답을 적어 주세요'); return; } }
    if (!q.s && q.type !== 'choice') { toast('문장을 적어 주세요'); return; }
    q.id = q.id || ('c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    const nb = clone(bank()); const list = T.edFloor === 'trap' ? nb.trap : (nb.floors[T.edFloor] || (nb.floors[T.edFloor] = []));
    if (T.editing.index == null) list.push(q); else list[T.editing.index] = q;
    T.editing = null; saveBank(nb);
  };
}
async function action(t) {
  if (['start', 'pause', 'resume', 'end'].includes(t)) return cmd({ type: t });
  if (t === 'autotrap') return cmd({ type: 'autotrap' });
  if (t === 'alltrap') return cmd({ type: 'alltrap', floor: +document.getElementById('alltrapf').value });
  if (t === 'qr') { T.showQR = true; return renderQR(); }
  if (t === 'closeqr') { T.showQR = false; return renderQR(); }
  if (t === 'copylink') { const url = location.origin + '/'; try { await navigator.clipboard.writeText(url); toast('링크를 복사했어요'); } catch (e) { toast(url); } return; }
  if (t === 'askreset') { T.confirmReset = true; return render(); }
  if (t === 'cancelreset') { T.confirmReset = false; return render(); }
  if (t === 'resetall') { T.confirmReset = false; await cmd({ type: 'resetAll' }); return toast('초기화했어요'); }
  if (t === 'restore') { try { await saveBank(JSON.parse(lsGet('dc_bank'))); } catch (e) { toast('보관된 문제를 읽지 못했어요'); } return; }
  if (t === 'norestore') { T.dismissRestore = true; return render(); }
  if (t === 'qcancel') { T.editing = null; return render(); }
  if (t === 'qexport') {
    const txt = JSON.stringify(bank()); const ta = document.getElementById('qjson'); ta.value = txt;
    try { await navigator.clipboard.writeText(txt); toast('전체 문제를 복사했어요'); } catch (e) { ta.focus(); ta.select(); toast('텍스트를 선택했어요. 복사해서 보관하세요'); }
    return;
  }
  if (t === 'qimport') { try { const nb = JSON.parse(document.getElementById('qjson').value); if (!nb.floors || !nb.trap) throw 0; await saveBank(nb); } catch (e) { toast('형식이 맞지 않아요. ‘전체 복사’로 얻은 텍스트를 붙여 넣어 주세요'); } return; }
  if (t === 'qaskreset') { T.confirmQReset = true; return render(); }
  if (t === 'qreset') { T.confirmQReset = false; await cmd({ type: 'bankReset' }); lsSet('dc_bank', null); T.firstData = true; return toast('기본 문제로 되돌렸어요'); }
}

if (T.key) connect(); else renderLogin();
