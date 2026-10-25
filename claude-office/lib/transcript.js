// Claude Code transcript records -> the office's events. Shared by server.js (your PC) and tools/tower-hook.js
// (the hook that sends sessions online), so both draw the same office. Plain functions, no dependencies.
const parseLines = text => text.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
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

module.exports = { parseLines, clip, textOf, recordToEvents };
