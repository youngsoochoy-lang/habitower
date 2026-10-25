#!/usr/bin/env node
// Habitower — watches Claude Code's session logs (~/.claude/projects/**/*.jsonl)
// and streams normalized events to a pixel-art office in the browser.
// No dependencies, no hooks, no settings changes. Listens on 127.0.0.1 only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT || 7777);
const POLL_MS = 250;
const ACTIVE_MS = 2 * 60 * 1000;     // a session counts as "lights on" if written in the last 2 min
const ALL_ACTIVE_MS = 10 * 60 * 1000; // session=all: sessions written in the last 10 min each get a Claude
const REPLAY_BYTES = 400 * 1024;     // how much history to replay when you open a floor
const PROJECTS = process.env.CLAUDE_PROJECTS_DIR ||
  path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');

// ---------- small fs helpers ----------
function readSlice(file, start, end) {
  const len = Math.max(0, end - start);
  if (!len) return '';
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, start);
    return buf.toString('utf8');
  } finally { fs.closeSync(fd); }
}
const statSafe = f => { try { return fs.statSync(f); } catch { return null; } };
const lsSafe = d => { try { return fs.readdirSync(d); } catch { return []; } };
const parseLines = text => text.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

// ---------- floor / session discovery ----------
const metaCache = new Map(); // file -> { mtimeMs, cwd, title }
function sessionMeta(file, st) {
  const hit = metaCache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs) return hit;
  let cwd = hit?.cwd || null, title = null;
  if (!cwd) for (const r of parseLines(readSlice(file, 0, Math.min(st.size, 64 * 1024)))) if (r.cwd) { cwd = r.cwd; break; }
  const tail = parseLines(readSlice(file, Math.max(0, st.size - 256 * 1024), st.size));
  for (const r of tail) {
    if (r.type === 'agent-name' && r.agentName) title = r.agentName;
    else if (r.type === 'ai-title' && r.aiTitle && !title) title = r.aiTitle;
    else if (r.type === 'summary' && r.summary && !title) title = r.summary;
  }
  const custom = path.join(file.replace(/\.jsonl$/, ''), 'custom-title.json');
  try { title = JSON.parse(fs.readFileSync(custom, 'utf8')).customTitle || title; } catch {}
  if (!title) {
    const firstPrompt = tail.find(r => r.type === 'last-prompt')?.lastPrompt;
    title = firstPrompt ? firstPrompt.slice(0, 40) : null;
  }
  const m = { mtimeMs: st.mtimeMs, cwd, title };
  metaCache.set(file, m);
  return m;
}

function listFloors() {
  const now = Date.now();
  const floors = [];
  for (const dir of lsSafe(PROJECTS)) {
    const full = path.join(PROJECTS, dir);
    const dst = statSafe(full);
    if (!dst?.isDirectory()) continue;
    const sessions = [];
    let cwd = null;
    for (const f of lsSafe(full)) {
      if (!f.endsWith('.jsonl') || f.startsWith('agent-')) continue;
      const file = path.join(full, f);
      const st = statSafe(file);
      if (!st || st.size === 0) continue;
      const meta = sessionMeta(file, st);
      cwd = cwd || meta.cwd;
      sessions.push({ id: f.slice(0, -6), title: meta.title || f.slice(0, 8), mtime: st.mtimeMs, active: now - st.mtimeMs < ACTIVE_MS });
    }
    if (!sessions.length) continue;
    sessions.sort((a, b) => b.mtime - a.mtime);
    const name = cwd ? cwd.replace(/[\\/]+$/, '').split(/[\\/]/).pop() : dir;
    const born = Math.min(dst.birthtimeMs || Infinity, ...sessions.map(s => s.mtime));
    floors.push({ id: dir, name, cwd, born, active: sessions.some(s => s.active), lastMtime: sessions[0].mtime, sessions });
  }
  floors.sort((a, b) => a.born - b.born);   // oldest project = 1F, like a building that grew upward
  floors.forEach((f, i) => (f.floor = i + 1));
  return floors;
}

// ---------- jsonl record -> office events ----------
const clip = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const base = p => String(p || '').split(/[\\/]/).pop();
function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(c => (typeof c === 'string' ? c : c.text || '')).join(' ');
  return '';
}
function toolLabel(name, input = {}) {
  switch (name) {
    case 'Read': case 'NotebookRead': return base(input.file_path || input.notebook_path);
    case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit': return base(input.file_path || input.notebook_path);
    case 'Grep': return `/${clip(input.pattern, 30)}/`;
    case 'Glob': return clip(input.pattern, 34);
    case 'Bash': case 'PowerShell': return clip(input.description || input.command, 48);
    case 'WebSearch': return clip(input.query, 44);
    case 'WebFetch': try { return new URL(input.url).host; } catch { return clip(input.url, 40); }
    case 'Agent': case 'Task': return clip(input.description || input.prompt, 40);
    case 'Skill': return clip(input.skill || input.command, 30);
    case 'TodoWrite': return 'todo list';
    case 'AskUserQuestion': return clip(input.questions?.[0]?.question, 60);
    default:
      if (name.startsWith('mcp__')) { const [, srv, tool] = name.split('__'); return `${clip(srv, 18)} · ${tool}`; }
      return clip(input.description || input.command || input.query || input.file_path || '', 40);
  }
}
function boardItems(name, input = {}) {
  if (name === 'TodoWrite' && Array.isArray(input.todos)) return { items: input.todos.map(t => ({ content: clip(t.content, 60), status: t.status })) };
  if (/update_plan$/.test(name)) {
    if (Array.isArray(input.items)) return { items: input.items.map(t => ({ content: clip(t.content, 60), status: t.status })) };
    if (input.advance) return { advance: true };
    if (input.done || input.start) return { done: input.done || [], start: input.start };
  }
  if (name === 'TaskCreate' && input.subject) return { add: { content: clip(input.subject, 60), status: 'pending' } };
  if (name === 'ExitPlanMode' && input.plan) return { items: String(input.plan).split('\n').filter(l => /^\s*([-*]|\d+\.)\s+/.test(l)).slice(0, 8).map(l => ({ content: clip(l.replace(/^\s*([-*]|\d+\.)\s+/, ''), 60), status: 'pending' })) };
  return null;
}

function recordToEvents(r, agent) {
  const out = [];
  const ts = r.timestamp ? Date.parse(r.timestamp) : Date.now();
  const m = r.message;
  if (r.type === 'assistant' && m && Array.isArray(m.content)) {
    for (const c of m.content) {
      if (c.type === 'thinking') out.push({ kind: 'think', text: clip(c.thinking, 140) });
      else if (c.type === 'text' && c.text?.trim()) out.push({ kind: 'say', text: clip(c.text, 160), end: m.stop_reason === 'end_turn' });
      else if (c.type === 'tool_use') {
        if (/handback/i.test(c.name)) { out.push({ kind: 'handback', text: clip(c.input?.message || c.input?.report || '', 140) }); continue; }
        const ev = { kind: 'tool', id: c.id, name: c.name, label: toolLabel(c.name, c.input) };
        if (c.name === 'Agent' || c.name === 'Task') {
          ev.kind = 'spawn';
          ev.agentType = c.input?.subagent_type || 'general-purpose';
          ev.background = !!c.input?.run_in_background;
        }
        const board = boardItems(c.name, c.input);
        if (board) ev.board = board;
        out.push(ev);
      }
    }
    if (m.stop_reason === 'end_turn' && !out.some(e => e.kind === 'say')) out.push({ kind: 'end' });
  } else if (r.type === 'user' && m) {
    if (Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type === 'tool_result') {
          const text = textOf(c.content);
          out.push({ kind: 'result', id: c.tool_use_id, error: !!c.is_error, text: clip(text, 140),
                     async: /async|in the background|running in background/i.test(text.slice(0, 400)) });
        }
      }
    } else if (typeof m.content === 'string' && !r.isMeta && !m.content.startsWith('<')) {
      out.push({ kind: 'prompt', text: clip(m.content, 140) });
    } else if (typeof m.content === 'string' && /<command-name>\/clear/.test(m.content)) {
      out.push({ kind: 'clear' });
    }
  } else if (r.type === 'system' && r.subtype === 'turn_duration') {
    out.push({ kind: 'end' });
  }
  for (const e of out) { e.ts = ts; e.agent = agent; }
  return out;
}

// ---------- tailing one session (+ its subagents) for one browser ----------
class Tail {
  constructor(file, agent, onRecords) {
    this.file = file; this.agent = agent; this.onRecords = onRecords;
    this.offset = 0; this.rest = '';
  }
  start(replayBytes, replay = true) {
    const st = statSafe(this.file);
    if (!st) return;
    const from = Math.max(0, st.size - replayBytes);
    let text = readSlice(this.file, from, st.size);
    if (from > 0) text = text.slice(text.indexOf('\n') + 1); // drop the partial first line
    this.offset = st.size;
    this.onRecords(parseLines(text), this.agent, replay);
  }
  poll() {
    const st = statSafe(this.file);
    if (!st) return;
    if (st.size < this.offset) { this.offset = 0; this.rest = ''; }
    if (st.size === this.offset) return;
    const chunk = this.rest + readSlice(this.file, this.offset, st.size);
    this.offset = st.size;
    const nl = chunk.lastIndexOf('\n');
    this.rest = nl === -1 ? chunk : chunk.slice(nl + 1);
    if (nl !== -1) this.onRecords(parseLines(chunk.slice(0, nl)), this.agent, false);
  }
}

const mainSessions = dir => lsSafe(dir)
  .filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-'))
  .map(f => ({ f, id: f.slice(0, -6), file: path.join(dir, f), st: statSafe(path.join(dir, f)) }))
  .filter(x => x.st && x.st.size > 0);

// One session's transcript plus its subagents. Every event and link it sends is tagged with the session id,
// so one browser stream can carry several sessions at once.
class SessionWatch {
  constructor(floorDir, sid, send) {
    Object.assign(this, { floorDir, sid, send, main: null, subs: new Map(), pendingSpawns: new Map() });
    this.file = path.join(floorDir, sid + '.jsonl');
    this.emit = this.emit.bind(this);
  }
  emit(records, agent, replay) {
    const events = [];
    for (const r of records) {
      if (r.sessionId && r.sessionId !== this.sid) continue;
      // older Claude Code versions write subagent turns into the main file with isSidechain
      const who = r.isSidechain ? (r.agentId || 'sidechain') : agent;
      for (const e of recordToEvents(r, who)) {
        if (e.kind === 'spawn' && who === 'main') this.pendingSpawns.set(e.id, (r.message.content.find(c => c.id === e.id)?.input?.prompt || '').slice(0, 200));
        e.session = this.sid;
        events.push(e);
      }
    }
    if (events.length) this.send({ type: 'events', replay, session: this.sid, events });
  }
  // mode: 'replay' = recent history, played instantly · 'fresh' = a brand-new file, from the top, live ·
  //       'tail' = an older file that just woke up: only what gets written from now on
  open(mode = 'replay') {
    this.main = new Tail(this.file, 'main', this.emit);
    if (mode === 'tail') {
      this.main.start(0, false);
      for (const d of this.subDirs()) for (const f of lsSafe(d)) {
        if (!f.startsWith('agent-') || !f.endsWith('.jsonl')) continue;
        const t = new Tail(path.join(d, f), f.slice(6, -6), this.emit); t.start(0, false); this.subs.set(path.join(d, f), t);
      }
      return;
    }
    this.main.start(mode === 'fresh' ? Infinity : REPLAY_BYTES, mode === 'replay');
    this.scanSubagents(mode === 'replay');
  }
  // last write to the transcript or any of its subagents: a long background agent keeps its Claude at work
  lastWrite() { let m = statSafe(this.file)?.mtimeMs || 0; for (const [f, t] of this.subs) if (t) m = Math.max(m, statSafe(f)?.mtimeMs || 0); return m; }
  subDirs() { return [path.join(this.floorDir, this.sid, 'subagents'), this.floorDir]; }
  poll() { this.main?.poll(); for (const t of this.subs.values()) t?.poll(); }
  scanSubagents(replay) {
    for (const d of this.subDirs()) for (const f of lsSafe(d)) {
      if (!f.startsWith('agent-') || !f.endsWith('.jsonl')) continue;
      const file = path.join(d, f);
      if (this.subs.has(file)) continue;
      const st = statSafe(file);
      if (!st) continue;
      const head = parseLines(readSlice(file, 0, Math.min(st.size, 32 * 1024)));
      const first = head.find(r => r.type === 'user');
      if (!first || (first.sessionId && first.sessionId !== this.sid)) { if (d === this.floorDir) this.subs.set(file, null); continue; }
      if (replay && Date.now() - st.mtimeMs > 30 * 60 * 1000) { this.subs.set(file, null); continue; }
      const agentId = first.agentId || f.slice(6, -6);
      // link the subagent file to the Agent/Task call that launched it: meta.json if present, else by prompt
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(file.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch {}
      const prompt = textOf(first.message?.content).slice(0, 200);
      let toolId = meta.toolUseId || null;
      if (!toolId) for (const [id, p] of this.pendingSpawns) if (p && prompt && (p.startsWith(prompt.slice(0, 80)) || prompt.startsWith(p.slice(0, 80)))) { toolId = id; break; }
      this.send({ type: 'link', session: this.sid, agent: agentId, toolId, agentType: meta.agentType, description: meta.description });
      const t = new Tail(file, agentId, this.emit);
      this.subs.set(file, t);
      t.start(replay ? REPLAY_BYTES : Infinity, replay);
    }
  }
}

function sseOpen(res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  return obj => res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

// session=<id> pins one session; session=auto follows the newest one (and /clear) like before
function startStream(req, res, floorId, sessionId) {
  const floorDir = path.join(PROJECTS, path.basename(floorId));
  const send = sseOpen(res);
  const newestSession = () => mainSessions(floorDir).sort((a, b) => b.st.mtimeMs - a.st.mtimeMs)[0]?.id;

  const follow = !sessionId || sessionId === 'auto';
  let current = follow ? newestSession() : sessionId;
  const known = new Set(lsSafe(floorDir));
  let watch = null, timer = null, tick = 0;

  const open = () => {
    if (!current) { watch = null; send({ type: 'hello', floor: floorId, session: null }); return; }
    send({ type: 'hello', floor: floorId, session: current, follow });
    watch = new SessionWatch(floorDir, current, send);
    watch.open('replay');
    send({ type: 'live' });
  };
  open();

  timer = setInterval(() => {
    try {
      watch?.poll();
      if (++tick % 4 === 0) {
        watch?.scanSubagents(false);
        // /clear (or a brand-new session) on this floor: follow it like the elevator does
        const files = lsSafe(floorDir);
        const fresh = files.filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-') && !known.has(f));
        files.forEach(f => known.add(f));
        if (follow && fresh.length) {
          const next = fresh[0].slice(0, -6);
          if (next !== current) { current = next; send({ type: 'switch', session: current }); open(); }
        }
      }
      if (tick % 60 === 0) res.write(': ping\n\n');
    } catch (e) { send({ type: 'warn', text: String(e.message || e) }); }
  }, POLL_MS);
  req.on('close', () => clearInterval(timer));
}

// session=all: every session on the floor written in the last ALL_ACTIVE_MS, one Claude each.
// New sessions join as they appear; sessions that go quiet leave (the floor always keeps at least one).
function startAllStream(req, res, floorId) {
  const floorDir = path.join(PROJECTS, path.basename(floorId));
  const send = sseOpen(res);
  const titleOf = x => sessionMeta(x.file, x.st).title || x.id.slice(0, 8);
  const byAge = (a, b) => (a.st.birthtimeMs || a.st.mtimeMs) - (b.st.birthtimeMs || b.st.mtimeMs);   // oldest session keeps desk 1
  const watches = new Map();
  const known = new Set(lsSafe(floorDir));

  const all = mainSessions(floorDir), nowMs = Date.now();
  let start = all.filter(x => nowMs - x.st.mtimeMs < ALL_ACTIVE_MS);
  if (!start.length && all.length) start = [all.sort((a, b) => b.st.mtimeMs - a.st.mtimeMs)[0]];   // a quiet floor still has its Claude
  start.sort(byAge);
  send({ type: 'hello', mode: 'all', floor: floorId, session: start[0]?.id || null, sessions: start.map(x => ({ id: x.id, title: titleOf(x) })) });
  for (const x of start) { const w = new SessionWatch(floorDir, x.id, send); watches.set(x.id, w); w.open('replay'); }
  send({ type: 'live' });

  let tick = 0;
  const timer = setInterval(() => {
    try {
      for (const w of watches.values()) w.poll();
      if (++tick % 4 === 0) {
        for (const w of watches.values()) w.scanSubagents(false);
        const now = Date.now();
        for (const x of mainSessions(floorDir).sort(byAge)) {
          if (watches.has(x.id) || now - x.st.mtimeMs > ALL_ACTIVE_MS) continue;
          const isNew = !known.has(x.f);
          send({ type: 'join', session: x.id, title: titleOf(x), fresh: isNew });
          const w = new SessionWatch(floorDir, x.id, send); watches.set(x.id, w);
          w.open(isNew ? 'fresh' : 'tail');
        }
        lsSafe(floorDir).forEach(f => known.add(f));
      }
      if (tick % 20 === 0 && watches.size > 1) {
        // quiet sessions go home, newest-written one stays if everyone is quiet
        const now = Date.now();
        const ages = [...watches].map(([id, w]) => ({ id, m: w.lastWrite() })).sort((a, b) => b.m - a.m);
        for (const { id, m } of ages.slice(1)) if (now - m > ALL_ACTIVE_MS) { watches.delete(id); send({ type: 'leave', session: id }); }
      }
      if (tick % 60 === 0) res.write(': ping\n\n');
    } catch (e) { send({ type: 'warn', text: String(e.message || e) }); }
  }, POLL_MS);
  req.on('close', () => clearInterval(timer));
}

// ---------- quests and the building: plain JSON files in data/ ----------
// You (or Claude Code) can also edit data/quests.json or data/building.json by hand; the page picks the change up.
const DATA_DIR = process.env.TOWER_DATA || path.join(__dirname, 'data');
const QUESTS_FILE = path.join(DATA_DIR, 'quests.json');
const BUILDING_FILE = path.join(DATA_DIR, 'building.json');
// course packs, read-only: the page merges them over building.json and never writes them back.
// data/packs/ is shared in git; data/private/ is git-ignored, for your own packs (clone a private repo into it to sync).
const PACK_DIRS = [path.join(DATA_DIR, 'packs'), path.join(DATA_DIR, 'private')];
function readPacks() {
  const files = [];
  for (const dir of PACK_DIRS) { try { for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) files.push(path.join(dir, f)); } catch {} }
  const src = p => (p.startsWith(PACK_DIRS[1]) ? 'private' : 'shared');
  const packs = [], errors = [];
  let mtime = 0;
  for (const p of files) {
    const f = path.relative(DATA_DIR, p);
    mtime = Math.max(mtime, statSafe(p)?.mtimeMs || 0);
    try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); if (d?.pack?.id) packs.push({ ...d, _src: src(p) }); else errors.push(`${f}: missing pack.id`); }
    catch { errors.push(`${f}: not valid JSON`); }
  }
  return { packs, errors, mtime };
}
// GET returns { data, mtime } (data is null when the file does not exist yet); PUT replaces the file atomically.
// extra() can add fields to the GET answer, and its mtime counts, so the page reloads when they change.
function jsonStore(file, check, extra) {
  const name = 'data/' + path.basename(file);
  return (req, res) => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'GET') {
      const st = statSafe(file);
      let data = null; try { data = st && JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return send(500, { error: `${name} is not valid JSON` }); }
      const { mtime: xm = 0, ...more } = extra ? extra() : {};
      return send(200, { data, mtime: Math.max(st ? st.mtimeMs : 0, xm), ...more });
    }
    // writes need a custom header: browsers send it only from this page, so other sites cannot overwrite your files
    if (req.method !== 'PUT' || req.headers['x-tower'] !== '1') return send(403, { error: 'forbidden' });
    let body = '';
    req.on('data', d => { body += d; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      let data; try { data = JSON.parse(body); } catch { return send(400, { error: 'bad json' }); }
      const bad = check(data);
      if (bad) return send(400, { error: bad });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
      fs.renameSync(file + '.tmp', file);
      send(200, { ok: true, mtime: statSafe(file).mtimeMs });
    });
  };
}
const quests = jsonStore(QUESTS_FILE, d => (d && Array.isArray(d.quests) ? null : 'expected { quests: [...] }'));
// your own edits on top of the defaults and packs (renames, deletions, new categories and goals, which courses are on):
// data/private/user.json, written by the page, git-ignored like the rest of data/private
const USER_FILE = path.join(DATA_DIR, 'private', 'user.json');
const userStore = jsonStore(USER_FILE, d => (d?.pack?.id === 'user' ? null : 'expected { pack: { id: "user" } }'));
const buildingStore = jsonStore(BUILDING_FILE, d => (d && Array.isArray(d.areas) && Array.isArray(d.floors) ? null : 'expected { areas: [...], floors: [...] }'), readPacks);

// ---------- http ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'office.html')).pipe(res);
  }
  // static assets (3D models): only files inside assets/, no path tricks
  if (url.pathname.startsWith('/assets/')) {
    const root = path.join(__dirname, 'assets'), file = path.normalize(path.join(root, decodeURIComponent(url.pathname.slice(8))));
    const type = { '.glb': 'model/gltf-binary', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' }[path.extname(file)];
    if (!file.startsWith(root + path.sep) || !type || !statSafe(file)?.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'max-age=3600' });
    return fs.createReadStream(file).pipe(res);
  }
  if (url.pathname === '/pixel') {   // the original 2D pixel-art version
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'office-pixel.html')).pipe(res);
  }
  if (url.pathname === '/api/floors') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ projects: PROJECTS, floors: listFloors() }));
  }
  if (url.pathname === '/api/quests') return quests(req, res);
  if (url.pathname === '/api/building') return buildingStore(req, res);
  if (url.pathname === '/api/userpack') return userStore(req, res);
  if (url.pathname === '/api/stream' && url.searchParams.get('session') === 'all') return startAllStream(req, res, url.searchParams.get('floor') || '');
  if (url.pathname === '/api/stream') return startStream(req, res, url.searchParams.get('floor') || '', url.searchParams.get('session'));
  res.writeHead(404); res.end('not found');
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Habitower is open at http://localhost:${PORT}`);
  console.log(`Watching ${PROJECTS}`);
});
