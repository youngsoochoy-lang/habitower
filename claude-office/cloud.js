// Habitower online. On a web host (GitHub Pages) there is no server.js, so this module stands in for it:
// you sign in, your saves live in your Supabase account, and the office shows the Claude sessions your hook
// reported (tools/tower-hook.js), from your PC or the cloud. office.html loads it before anything else and keeps
// calling the same /api/... addresses; they are answered here.
//
//   /api/building  building.json and the course packs from this site, your own building/packs/edits from your account
//   /api/quests    your progress (docs 'quests')          /api/userpack  your edits (docs 'user')
//   /api/floors    one floor per project your sessions reported from
//   /api/stream    (EventSource) a floor's recent events, then live ones as they arrive (Supabase Realtime)
//
// The page reads these from a cache that Realtime keeps fresh, so polling every few seconds costs nothing,
// and a save made on your phone shows up on your PC within a second or two.
import CONFIG from './cloud-config.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.99.3/+esm';
const ACTIVE_MS = 2 * 60e3, ALL_ACTIVE_MS = 10 * 60e3, REPLAY = 600;
const PROVIDERS = {
  google:   { name: 'Google', ko: 'Google로 계속하기', cls: 'google' },
  kakao:    { name: '카카오', ko: '카카오로 계속하기', cls: 'kakao' },
  naver:    { name: '네이버', ko: '네이버로 계속하기', cls: 'naver', id: () => CONFIG.naverProvider || 'custom:naver' },
  facebook: { name: 'Facebook', ko: 'Facebook으로 계속하기', cls: 'facebook' },
  github:   { name: 'GitHub', ko: 'GitHub으로 계속하기', cls: 'github' },
};

let sb, user;
const docs = new Map();              // key -> { data, rev }
const sessions = new Map();          // id -> row
const streams = new Set();           // open CloudStreams
const unsaved = new Map();           // key -> row waiting to be saved (offline)
let STATIC = { building: null, packs: [] };
const real = window.fetch.bind(window);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function start() {
  injectStyle();
  if (!CONFIG.url || !CONFIG.anonKey) return blockWith(setupNeededHTML());
  let createClient;
  try { ({ createClient } = await import(SUPABASE_JS)); } catch { return blockWith(`<h1>연결할 수 없어요</h1><p>인터넷 연결을 확인하고 새로고침해 주세요.</p>`); }
  sb = createClient(CONFIG.url, CONFIG.anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  let { data: { session } } = await sb.auth.getSession();
  if (!session) session = await signInScreen();
  user = session.user;
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.replace(location.pathname); });
  if (/[?&](code|error)=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
  await Promise.all([loadStatic(), loadDocs(), loadSessions()]);
  installShim();
  subscribe();
  addEventListener('online', flush); setInterval(flush, 15e3);
  addEventListener('beforeunload', e => { if (unsaved.size) { flush(); e.preventDefault(); } });
  whenReady(accountUI);
}

// ---------- data ----------
async function loadStatic() {
  const json = async u => { const r = await real(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return r.json(); };
  STATIC.building = await json('data/building.json');
  try {
    const list = await json('data/packs/index.json');
    STATIC.packs = (await Promise.all(list.map(f => json('data/packs/' + f).catch(() => null)))).filter(p => p?.pack?.id);
  } catch { STATIC.packs = []; }
}
async function loadDocs() {
  const { data, error } = await sb.from('docs').select('key,data,rev');
  if (error) throw error;
  for (const d of data) docs.set(d.key, { data: d.data, rev: Number(d.rev) || 1 });
}
async function refetchDoc(key) {
  const { data } = await sb.from('docs').select('data,rev').eq('key', key).maybeSingle();
  if (data && !unsaved.has(key)) docs.set(key, { data: data.data, rev: Number(data.rev) || 1 });
  if (!data) docs.delete(key);
}
async function loadSessions() {
  const { data } = await sb.from('sessions').select('*').order('last_at', { ascending: false }).limit(300);
  for (const s of data || []) sessions.set(s.id, s);
}
// a save goes into the cache at once (the page reads it back immediately) and to Supabase right after;
// if that fails (offline), it waits in `unsaved` and is retried
async function save(key, data) {
  const rev = Math.max(Date.now(), (docs.get(key)?.rev || 0) + 1);
  docs.set(key, { data, rev });
  unsaved.set(key, { user_id: user.id, key, data, rev, updated_at: new Date().toISOString() });
  await flush();
  return rev;
}
let flushing = null;
function flush() {
  if (flushing || !unsaved.size) return flushing;
  return (flushing = (async () => {
    // saves made while this runs join the next round
    for (let failed = false; unsaved.size && !failed;) for (const [key, row] of [...unsaved]) {
      const { error } = await sb.from('docs').upsert(row, { onConflict: 'user_id,key' });
      if (error) { syncState(`저장 대기 ${unsaved.size}개 · 연결되면 저장돼요`, true); failed = true; break; }
      if (unsaved.get(key) === row) unsaved.delete(key);
    }
    if (!unsaved.size) syncState('모든 기기에 저장됨');
  })().finally(() => { flushing = null; }));
}
function subscribe() {
  const own = `user_id=eq.${user.id}`;
  sb.channel('htw-' + user.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: own }, p => {
      const row = p.new, s = sessions.get(row.session_id);
      if (s) s.last_at = row.at;
      for (const st of streams) st.push(row);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: own }, p => {
      if (p.eventType === 'DELETE') sessions.delete(p.old.id); else sessions.set(p.new.id, p.new);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: own }, p => {
      const key = p.new?.key || p.old?.key, rev = Number(p.new?.rev) || 0;
      if (key && (p.eventType === 'DELETE' || rev > (docs.get(key)?.rev || 0))) refetchDoc(key);
    })
    .subscribe();
}

// ---------- the /api shim ----------
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
function buildingAnswer() {
  const mine = [...docs].filter(([k]) => k.startsWith('pack:')).map(([, d]) => ({ ...d.data, _src: 'private' })).filter(p => p?.pack?.id && p.pack.id !== 'user');
  const edits = docs.get('user')?.data;
  const packs = [...STATIC.packs.filter(p => !mine.some(m => m.pack.id === p.pack.id)).map(p => ({ ...p, _src: 'shared' })), ...mine, ...(edits ? [{ ...edits, _src: 'private' }] : [])];
  const mtime = Math.max(1, ...['building', 'user'].map(k => docs.get(k)?.rev || 0), ...[...docs].filter(([k]) => k.startsWith('pack:')).map(([, d]) => d.rev));
  return { data: docs.get('building')?.data || STATIC.building, mtime, packs };
}
function floorsAnswer() {
  const now = Date.now(), by = new Map();
  for (const s of sessions.values()) {
    const f = by.get(s.project) || { id: s.project, name: s.project_name || s.project, cwd: null, born: Infinity, lastMtime: 0, active: false, sessions: [], src: new Set() };
    const last = Date.parse(s.last_at), born = Date.parse(s.created_at);
    f.sessions.push({ id: s.id, title: s.title || s.id.slice(0, 8), mtime: last, active: now - last < ACTIVE_MS });
    f.born = Math.min(f.born, born); f.src.add(s.source);
    if (last > f.lastMtime) { f.lastMtime = last; f.name = s.project_name || f.name; }
    f.active ||= now - last < ACTIVE_MS;
    by.set(s.project, f);
  }
  const floors = [...by.values()].sort((a, b) => a.born - b.born);
  floors.forEach((f, i) => { f.floor = i + 1; f.sessions.sort((a, b) => b.mtime - a.mtime); f.cwd = [...f.src].map(x => (x === 'cloud' ? '☁️ 클라우드 세션' : '💻 PC 세션')).join(' · '); delete f.src; });
  return { projects: '☁️ 온라인', floors, note: floors.length ? '' : '아직 Claude가 연결되지 않아서<br>사무실은 데모로 보여줘요<br><small>☁️ 계정 → Claude 연결</small>' };
}
function installShim() {
  window.fetch = async (u, o = {}) => {
    const url = new URL(typeof u === 'string' ? u : u.url, location.href);
    if (url.origin !== location.origin || !url.pathname.includes('/api/')) return real(u, o);
    const p = url.pathname.slice(url.pathname.lastIndexOf('/api/')), put = (o.method || 'GET') === 'PUT';
    let body; if (put) { try { body = JSON.parse(o.body); } catch { return json({ error: 'bad json' }, 400); } }
    try {
      if (p === '/api/floors') return json(floorsAnswer());
      if (p === '/api/building') {
        if (!put) return json(buildingAnswer());
        if (!Array.isArray(body?.areas) || !Array.isArray(body?.floors)) return json({ error: 'expected { areas, floors }' }, 400);
        await save('building', body); return json({ ok: true, mtime: buildingAnswer().mtime });
      }
      if (p === '/api/userpack') {
        if (body?.pack?.id !== 'user') return json({ error: 'expected { pack: { id: "user" } }' }, 400);
        await save('user', body); return json({ ok: true, mtime: buildingAnswer().mtime });
      }
      if (p === '/api/quests') {
        if (!put) { const d = docs.get('quests'); return json({ data: d?.data ?? null, mtime: d?.rev || 0 }); }
        if (!Array.isArray(body?.quests)) return json({ error: 'expected { quests: [...] }' }, 400);
        return json({ ok: true, mtime: await save('quests', body) });
      }
    } catch (e) { return json({ error: String(e.message || e) }, 500); }
    return json({ error: 'not found' }, 404);
  };
  const Native = window.EventSource;
  window.EventSource = function (u, o) { return String(u).includes('/api/stream') ? new CloudStream(u) : new Native(u, o); };
}

// One floor, like server.js's session=all stream: sessions active in the last 10 minutes each get a Claude,
// their recent events replay instantly, then new events arrive live; quiet sessions leave, new ones join.
class CloudStream {
  constructor(u) {
    const q = new URL(u, location.href).searchParams;
    Object.assign(this, { floor: q.get('floor'), want: q.get('session') || 'all', joined: new Set(), buf: [], lastId: 0, live: false, readyState: 0 });
    streams.add(this);
    setTimeout(() => this.open().catch(e => this.emit({ type: 'warn', text: '온라인 기록을 불러오지 못했어요: ' + (e.message || e) })));
  }
  emit(m) { if (!this.closed) this.onmessage?.({ data: JSON.stringify(m) }); }
  async open() {
    const now = Date.now(), list = [...sessions.values()].filter(s => s.project === this.floor).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    let pick = this.want === 'all' || this.want === 'auto' ? list.filter(s => now - Date.parse(s.last_at) < ALL_ACTIVE_MS) : list.filter(s => s.id === this.want);
    if (!pick.length && list.length && (this.want === 'all' || this.want === 'auto')) pick = [list.reduce((a, b) => (Date.parse(b.last_at) > Date.parse(a.last_at) ? b : a))];
    pick.forEach(s => this.joined.add(s.id));
    this.emit({ type: 'hello', mode: 'all', floor: this.floor, session: pick[0]?.id || null, sessions: pick.map(s => ({ id: s.id, title: s.title || s.id.slice(0, 8) })) });
    if (pick.length) {
      const { data, error } = await sb.from('events').select('id,session_id,msg').eq('project', this.floor).in('session_id', pick.map(s => s.id)).order('id', { ascending: false }).limit(REPLAY);
      if (error) throw error;
      for (const r of data.reverse()) { this.lastId = Math.max(this.lastId, r.id); this.emit(r.msg.type === 'events' ? { ...r.msg, replay: true } : r.msg); }
    }
    this.readyState = 1; this.live = true;
    this.emit({ type: 'live' });
    for (const r of this.buf.splice(0)) this.push(r);
    this.timer = setInterval(() => this.prune(), 5000);
  }
  push(row) {
    if (this.closed || row.project !== this.floor) return;
    if (!this.live) return void this.buf.push(row);
    if (row.id <= this.lastId) return;
    this.lastId = row.id;
    if (!this.joined.has(row.session_id)) {
      if (this.want !== 'all' && this.want !== 'auto') return;
      this.joined.add(row.session_id);
      const s = sessions.get(row.session_id);
      this.emit({ type: 'join', session: row.session_id, title: s?.title || row.session_id.slice(0, 8), fresh: true });
    }
    this.emit(row.msg.type === 'events' ? { ...row.msg, replay: false } : row.msg);
  }
  prune() {
    if (this.joined.size < 2) return;
    const now = Date.now(), ages = [...this.joined].map(id => ({ id, m: Date.parse(sessions.get(id)?.last_at || 0) })).sort((a, b) => b.m - a.m);
    for (const { id, m } of ages.slice(1)) if (now - m > ALL_ACTIVE_MS) { this.joined.delete(id); this.emit({ type: 'leave', session: id }); }
  }
  close() { this.closed = true; this.readyState = 2; clearInterval(this.timer); streams.delete(this); }
  addEventListener() {}
}

// ---------- sign-in ----------
function blockWith(html) {
  const el = document.createElement('div'); el.className = 'cl-gate'; el.innerHTML = `<div class="cl-card">${logo()}${html}</div>`;
  document.body.appendChild(el);
  return new Promise(() => {});                                   // the app stays behind the gate
}
function signInScreen() {
  return new Promise(resolve => {
    const list = (CONFIG.providers || ['google', 'email']).filter(p => p === 'email' || PROVIDERS[p]);
    const el = document.createElement('div'); el.className = 'cl-gate';
    const err = new URLSearchParams(location.search).get('error_description');
    el.innerHTML = `<div class="cl-card">${logo()}
      <h1>Habitower</h1><p>할 일이 퀘스트가 되는 나만의 타워.<br>로그인하면 모든 기기에서 이어서 할 수 있어요.</p>
      <div class="cl-btns">${list.filter(p => p !== 'email').map(p => `<button class="cl-oauth ${PROVIDERS[p].cls}" data-p="${p}">${PROVIDERS[p].ko}</button>`).join('')}</div>
      ${list.includes('email') ? `<form class="cl-mail"><label>이메일로 로그인 링크 받기</label><div><input type="email" name="e" required placeholder="you@example.com" autocomplete="email"><button>보내기</button></div></form>` : ''}
      <div class="cl-msg${err ? ' bad' : ''}">${err ? '로그인하지 못했어요 · ' + esc(err) : ''}</div>
      <small class="cl-fine">로그인하면 진행 상황과 내 편집이 내 계정에 저장돼요. 다른 사람은 볼 수 없어요.</small></div>`;
    document.body.appendChild(el);
    const msg = (t, bad) => { const m = el.querySelector('.cl-msg'); m.textContent = t; m.classList.toggle('bad', !!bad); };
    const back = location.origin + location.pathname;
    el.querySelectorAll('.cl-oauth').forEach(b => b.onclick = async () => {
      const p = b.dataset.p, id = PROVIDERS[p].id?.() || p;
      msg('이동 중…');
      const { error } = await sb.auth.signInWithOAuth({ provider: id, options: { redirectTo: back } });
      if (error) msg(`${PROVIDERS[p].name} 로그인이 아직 준비되지 않았어요 · ${error.message}`, true);
    });
    el.querySelector('.cl-mail')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = ev.target.e.value.trim();
      msg('보내는 중…');
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back } });
      msg(error ? '보내지 못했어요 · ' + error.message : `${email}로 로그인 링크를 보냈어요. 메일의 링크를 누르면 여기로 돌아와요.`, !!error);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((ev, session) => {
      if (session) { subscription.unsubscribe(); el.remove(); resolve(session); }
    });
  });
}
function setupNeededHTML() {
  return `<h1>온라인 설정이 필요해요</h1><p><code>claude-office/cloud-config.js</code>에 Supabase 프로젝트 주소와 공개 키를 넣으면 로그인 화면이 열려요. 순서는 <code>claude-office/ONLINE.md</code>에 있어요.</p>
    <p>내 컴퓨터에서 쓰려면 <code>node claude-office/server.js</code>로 열면 돼요.</p>`;
}
const logo = () => `<svg class="cl-logo" viewBox="0 0 16 16" shape-rendering="crispEdges" width="40" height="40" aria-hidden="true"><rect x="7" y="0" width="1" height="3" fill="#2a1a08"/><rect x="8" y="0" width="3" height="2" fill="#ff8fa8"/><rect x="4" y="3" width="8" height="12" fill="#ffd166"/><rect x="3" y="15" width="10" height="1" fill="#2a1a08"/><g fill="#2a1a08"><rect x="5" y="5" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="5" y="8" width="2" height="2"/><rect x="7" y="12" width="2" height="3"/></g><rect x="9" y="8" width="2" height="2" fill="#ff8fa8"/></svg>`;

// ---------- ☁️ account sheet ----------
function whenReady(fn) { if (document.querySelector('.custom')) fn(); else addEventListener('DOMContentLoaded', fn); }
let syncText = '모든 기기에 저장됨', syncBad = false;
function syncState(t, bad) { syncText = t; syncBad = !!bad; const el = document.querySelector('.cl-sync'); if (el) { el.textContent = t; el.classList.toggle('bad', syncBad); } }
function accountUI() {
  const box = document.createElement('div'); box.className = 'custom cl-box';
  box.innerHTML = `<button type="button" title="계정 · 동기화 · Claude 연결">☁️ 계정</button><div class="pop cl-pop"></div>`;
  document.getElementById('stage').appendChild(box);
  const pop = box.querySelector('.cl-pop');
  box.firstElementChild.onclick = () => { pop.classList.toggle('open'); if (pop.classList.contains('open')) render(); };
  let fresh = null, confirmImport = null;
  async function render() {
    const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email || '나';
    const via = user.app_metadata?.provider || 'email';
    const { data: keys } = await sb.from('ingest_tokens').select('hash,label,created_at,last_used').order('created_at');
    const cmd = fresh && `node claude-office/tools/tower-hook.js install --user --url ${CONFIG.url} --key ${CONFIG.anonKey} --token ${fresh}`;
    const env = fresh && `HABITOWER_URL=${CONFIG.url}\nHABITOWER_KEY=${CONFIG.anonKey}\nHABITOWER_TOKEN=${fresh}`;
    pop.innerHTML = `
      <div class="row"><label>로그인</label><div class="cl-line"><span>${esc(name)}<small>${esc(via)}</small></span><button class="ghost" data-a="out">로그아웃</button></div>
        <div class="cl-sync${syncBad ? ' bad' : ''}">${esc(syncText)}</div></div>
      <div class="row"><label>Claude 연결</label>
        <small class="cl-help">Claude Code가 하는 일을 이 계정으로 보내면, 어느 기기에서든 사무실에 나타나요. 기기나 클라우드 환경마다 키를 하나씩 만들어요.</small>
        ${(keys || []).map(k => `<div class="cl-line"><span>🔑 ${esc(k.label || '키')}<small>${k.last_used ? '마지막 사용 ' + new Date(k.last_used).toLocaleString('ko-KR') : '아직 안 씀'}</small></span><button class="ghost" data-del="${esc(k.hash)}">삭제</button></div>`).join('')}
        ${fresh ? `<div class="cl-key"><b>새 키 · 지금 한 번만 보여요</b>
            <span>💻 PC: claude-office 폴더가 있는 곳에서</span><pre>${esc(cmd)}</pre><button data-copy="cmd">명령 복사</button>
            <span>☁️ 클라우드 환경: 환경 설정 → 환경 변수에 붙여넣기 (네트워크 허용 목록에 ${esc(new URL(CONFIG.url).host)} 추가)</span><pre>${esc(env)}</pre><button data-copy="env">변수 복사</button></div>`
          : `<form class="cl-new"><input name="l" maxlength="40" placeholder="이름 (예: 집 PC, 클라우드)" required><button>새 키 만들기</button></form>`}</div>
      <div class="row"><label>PC 데이터 가져오기</label>
        <small class="cl-help">PC의 claude-office/data 안 quests.json(진행 상황), private/user.json(내 편집), private/personal.json(내 코스)을 골라요. 같은 종류는 계정 쪽을 덮어써요.</small>
        ${confirmImport ? `<div class="cl-confirm"><span>${esc(confirmImport.list)} 을(를) 계정에 덮어쓸까요?</span><button data-a="imp-yes">덮어쓰기</button><button class="ghost" data-a="imp-no">취소</button></div>`
          : `<label class="cl-file">파일 고르기<input type="file" accept=".json,application/json" multiple hidden></label>`}</div>
      <div class="row"><label>백업</label><button class="ghost" data-a="export">내 데이터 모두 내려받기 (.json)</button></div>`;
    pop.querySelector('[data-a=out]').onclick = () => sb.auth.signOut();
    pop.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await sb.from('ingest_tokens').delete().eq('hash', b.dataset.del); render(); });
    pop.querySelector('.cl-new')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const { data, error } = await sb.rpc('create_ingest_token', { p_label: ev.target.l.value.trim() });
      if (error) { syncState('키를 만들지 못했어요 · ' + error.message, true); return render(); }
      fresh = data; render();
    });
    pop.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy === 'cmd' ? cmd : env); b.textContent = '복사됨 ✓'; } catch { b.textContent = '직접 선택해서 복사해 주세요'; }
    });
    pop.querySelector('input[type=file]')?.addEventListener('change', async ev => {
      const found = [];
      for (const f of ev.target.files) {
        let d; try { d = JSON.parse(await f.text()); } catch { continue; }
        const key = Array.isArray(d?.quests) ? 'quests' : d?.pack?.id === 'user' ? 'user' : d?.pack?.id ? 'pack:' + String(d.pack.id).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40)
          : Array.isArray(d?.areas) && Array.isArray(d?.floors) ? 'building' : null;
        if (key) found.push({ key, data: d, name: f.name });
      }
      if (!found.length) { syncState('알아볼 수 있는 파일이 없었어요', true); return render(); }
      confirmImport = { found, list: found.map(x => x.name).join(', ') }; render();
    });
    pop.querySelector('[data-a=imp-yes]')?.addEventListener('click', async () => {
      for (const x of confirmImport.found) await save(x.key, x.data);
      confirmImport = null; await flush();
      if (!unsaved.size) location.reload(); else render();
    });
    pop.querySelector('[data-a=imp-no]')?.addEventListener('click', () => { confirmImport = null; render(); });
    pop.querySelector('[data-a=export]').onclick = () => {
      const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), docs: Object.fromEntries([...docs].map(([k, d]) => [k, d.data])) }, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `habitower-${new Date().toISOString().slice(0, 10)}.json` });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
  }
}

function injectStyle() {
  const s = document.createElement('style');
  s.textContent = `
.cl-gate{position:fixed;inset:0;z-index:20000;background:var(--bg);display:grid;place-items:center;padding:24px;overflow:auto}
.cl-card{width:min(380px,100%);display:flex;flex-direction:column;gap:14px}
.cl-card h1{margin:6px 0 0;font-size:28px;font-weight:750;letter-spacing:-.03em;line-height:1.15}
.cl-card p{margin:0;color:var(--dim);font-size:14px;line-height:1.55}
.cl-card code{font-size:12px;color:var(--ink);background:var(--raise);padding:1px 5px;border-radius:5px}
.cl-btns{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.cl-oauth{height:46px;border-radius:10px;border:0;font:inherit;font-size:14.5px;font-weight:650;letter-spacing:-.015em;cursor:pointer}
.cl-oauth.google{background:#fff;color:#1f1f1f}.cl-oauth.kakao{background:#FEE500;color:rgba(0,0,0,.85)}
.cl-oauth.naver{background:#03C75A;color:#fff}.cl-oauth.facebook{background:#1877F2;color:#fff}.cl-oauth.github{background:var(--raise);color:var(--ink)}
.cl-mail{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);padding-top:16px;margin-top:4px}
.cl-mail label{font-size:12px;color:var(--faint);font-weight:600}
.cl-mail div{display:flex;gap:6px}.cl-mail input{flex:1;min-width:0;height:42px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:0 12px;font:inherit;font-size:14px}
.cl-mail button{height:42px;border-radius:10px;border:0;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:700;padding:0 16px;cursor:pointer}
.cl-msg{font-size:13px;color:var(--dim);min-height:1em}.cl-msg.bad,.cl-sync.bad{color:var(--red)}
.cl-fine{color:var(--faint);font-size:11.5px;line-height:1.5}
.cl-box{top:100px}.cl-pop{width:300px}
.cl-line{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)}.cl-line:first-of-type{border-top:0}
.cl-line span{flex:1;min-width:0;display:flex;flex-direction:column;font-size:12.5px;color:var(--ink);overflow-wrap:anywhere}.cl-line small{color:var(--faint);font-size:11px}
.cl-pop button,.cl-file{border:0;border-radius:8px;padding:7px 12px;background:var(--accent);color:var(--accent-ink);font:inherit;font-size:12px;font-weight:700;cursor:pointer;text-align:center}
.cl-pop button.ghost,.cl-confirm button.ghost{background:none;border:1px solid var(--line);color:var(--dim);font-weight:600}
.cl-sync{font-size:11.5px;color:var(--faint)}.cl-help{color:var(--faint);font-size:11.5px;line-height:1.5}
.cl-new{display:flex;gap:6px}.cl-new input{flex:1;min-width:0;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:6px 9px;font:inherit;font-size:12px}
.cl-key{display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:var(--dim)}.cl-key b{color:var(--accent);font-size:12px}
.cl-key pre{margin:0;padding:8px;border-radius:8px;background:var(--surface);color:var(--ink);font-size:10.5px;white-space:pre-wrap;word-break:break-all;user-select:all}
.cl-confirm{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.cl-confirm span{flex:1 1 100%;font-size:12px;color:var(--ink)}
@media (max-width:720px){.cl-box{top:92px}}`;
  document.head.appendChild(s);
}
