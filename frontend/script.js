/* ============================================================
   STATE
   ============================================================ */
const state = {
  buttons: {},   // name -> { fn, connections }
  edges: [],     // [{from, to}]
  trigger: null
};

/* ============================================================
   LOGGING
   ============================================================ */
function log(msg, type = 'info') {
  const scroll = document.getElementById('log-scroll');
  const now = new Date();
  const t = now.toTimeString().slice(0,8);
  const tagClass = { info:'tag-info', ok:'tag-ok', err:'tag-err', warn:'tag-warn' }[type] || 'tag-info';
  const tagLabel = { info:'INFO', ok:'OK', err:'ERROR', warn:'WARN' }[type] || 'INFO';
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-time">${t}</span>
    <span class="log-tag ${tagClass}">${tagLabel}</span>
    <span class="log-msg">${msg}</span>`;
  scroll.appendChild(line);
  scroll.scrollTop = scroll.scrollHeight;
}




function clearLog() {
  document.getElementById('log-scroll').innerHTML = '';
  log('Log cleared', 'info');
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast', 2500);
}

/* ============================================================
   UI REFRESH
   ============================================================ */
function refreshAll() {
  refreshChips();
  refreshSelects();
  refreshEdgeList();
  refreshStatePane();
  refreshTriggerDisplay();
}

function refreshChips() {
  const el = document.getElementById('node-chips');
  const names = Object.keys(state.buttons);
  if (!names.length) {
    el.innerHTML = '<span style="font-size:11px;color:var(--text3);font-style:italic;">None yet</span>';
    return;
  }
  el.innerHTML = names.map(n => `
    <span class="chip ${n === state.trigger ? 'trigger-chip' : ''}">
      ${n}
      <button class="chip-del" onclick="deleteButton('${n}')" title="Remove button">×</button>
    </span>`).join('');
}

function refreshSelects() {
  const names = Object.keys(state.buttons);
  ['edge-from', 'edge-to', 'trigger-sel'].forEach(id => {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">— select —</option>' +
      names.map(n => `<option value="${n}"${n === cur ? ' selected' : ''}>${n}</option>`).join('');
  });
}

function refreshEdgeList() {
  const el = document.getElementById('edge-list');
  if (!state.edges.length) {
    el.innerHTML = '<span style="font-size:11px;color:var(--text3);font-style:italic;">No edges yet</span>';
    return;
  }
  el.innerHTML = state.edges.map((e, i) => `
    <div class="edge-item">
      <span class="from">${e.from}</span>
      <span class="arrow">→</span>
      <span class="to">${e.to}</span>
      <span class="spacer"></span>
      <button class="chip-del" onclick="deleteEdge(${i})" title="Remove edge">×</button>
    </div>`).join('');
}

function refreshTriggerDisplay() {
  const el = document.getElementById('trigger-display');
  if (state.trigger) {
    el.innerHTML = `<span style="color:var(--amber);font-family:var(--mono);font-style:normal;">⚡ ${state.trigger}</span>`;
  } else {
    el.textContent = 'Not set';
    el.style.cssText = 'font-size:12px;color:var(--text3);font-style:italic;padding:2px 0;';
  }
}

/* ============================================================
   STATE REFLECTOR PANE
   ============================================================ */
function refreshStatePane() {
  const scroll = document.getElementById('state-scroll');
  const names = Object.keys(state.buttons);
  document.getElementById('btn-count').textContent = names.length;

  if (!names.length) {
    scroll.innerHTML = `
      <div class="empty">
        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.4">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        No buttons registered yet
      </div>`;
    return;
  }

  scroll.innerHTML = names.map(name => {
    const btn = state.buttons[name];
    const connections = state.edges.filter(e => e.from === name).map(e => e.to);
    const isTrigger = name === state.trigger;

    const connHTML = connections.length
      ? connections.map(c => `<span class="conn-pill">${c}</span>`).join('')
      : '<span style="color:var(--text3);font-size:11px;">none</span>';

    const fnDisplay = btn.fn
      ? `<span class="state-val code-val">${escapeHtml(btn.fn)}</span>`
      : '<span style="color:var(--text3);font-size:11px;font-style:italic;">not defined</span>';

    return `
      <div class="state-card">
        <div class="state-card-head">
          <span class="state-card-name">${name}</span>
          ${isTrigger ? '<span class="trigger-badge">⚡ trigger</span>' : ''}
        </div>
        <div class="state-card-body">
          <div class="state-row">
            <span class="state-key">function</span>
            <span style="flex:1;">${fnDisplay}</span>
          </div>
          <div class="state-row">
            <span class="state-key">connects to</span>
            <div class="conn-list">${connHTML}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ============================================================
   ACTIONS
   ============================================================ */
function createButton() {
  const name = document.getElementById('btn-name').value.trim();
  const fn   = document.getElementById('btn-fn').value.trim();
  if (!name) { toast('Enter a button name', 'err'); return; }
  if (state.buttons[name]) { toast(`"${name}" already exists`, 'err'); return; }

  state.buttons[name] = { fn: fn || '' };
  document.getElementById('btn-name').value = '';
  document.getElementById('btn-fn').value = '';
  refreshAll();
  log(`Button "${name}" created`, 'ok');
  toast(`Button "${name}" created`);

  apiCall('POST', '/buttons', { name, function: fn || 'pass' });
}

function deleteButton(name) {
  delete state.buttons[name];
  state.edges = state.edges.filter(e => e.from !== name && e.to !== name);
  if (state.trigger === name) state.trigger = null;
  refreshAll();
  log(`Button "${name}" removed`, 'warn');
  toast(`Removed "${name}"`, 'err');

  apiCall('DELETE', `/buttons/${name}`, null);
}

function createEdge() {
  const from = document.getElementById('edge-from').value;
  const to   = document.getElementById('edge-to').value;
  if (!from || !to) { toast('Select both nodes', 'err'); return; }
  if (from === to)  { toast('Cannot connect a button to itself', 'err'); return; }
  if (state.edges.find(e => e.from === from && e.to === to)) {
    toast('Edge already exists', 'err'); return;
  }
  state.edges.push({ from, to });
  refreshAll();
  log(`Edge ${from} → ${to} created`, 'ok');
  toast(`Connected ${from} → ${to}`);

  apiCall('POST', '/edges', { from, to });
}

function deleteEdge(i) {
  const e = state.edges[i];
  state.edges.splice(i, 1);
  refreshAll();
  log(`Edge ${e.from} → ${e.to} removed`, 'warn');
  toast(`Removed ${e.from} → ${e.to}`, 'err');

  apiCall('DELETE', '/edges', { from: e.from, to: e.to });
}

function setTrigger() {
  const val = document.getElementById('trigger-sel').value;
  if (!val) { toast('Select a node first', 'err'); return; }
  state.trigger = val;
  refreshAll();
  log(`Trigger set to "${val}"`, 'ok');
  toast(`Trigger: ${val}`);

  apiCall('POST', '/trigger', { name: val });
}

function executeFlow() {
  if (!state.trigger) { toast('Set a trigger node first', 'err'); return; }
  setSyncBadge('running');
  log(`Executing flow from "${state.trigger}"…`, 'info');

  apiCall('POST', '/execute', { trigger: state.trigger })
    .then(data => {
      setSyncBadge('idle');
      if (data) {
        log(`Execution complete: ${data.message || JSON.stringify(data)}`, 'ok');
        toast(data.message || 'Flow executed');
      } else {
        log('Execution request sent (no response body)', 'warn');
        toast('Execution request sent');
      }
    })
    .catch(() => {
      setSyncBadge('idle');
    });
}

/* ============================================================
   API HELPERS
   ============================================================ */
function getBase() {
  return document.getElementById('api-base').value.replace(/\/$/, '');
}

async function apiCall(method, path, body) {
  const url = getBase() + path;
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    console.log(url)
    console.log(opts)
    
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.text();
      log(`[${method} ${path}] ${res.status}: ${err}`, 'err');
      return null;
    }
    setConnected(true);
    return res.headers.get('content-type')?.includes('json') ? res.json() : null;
  } catch (e) {
    log(`[${method} ${path}] Network error — ${e.message}`, 'warn');
    setConnected(false);
    return null;
  }
}

async function pingBackend() {
  const url = getBase() + '/health';
  log(`Pinging ${url}`, 'info');
  try {
    // log(url)
    const res = await fetch(url);
    if (res.ok) {
      setConnected(true);
      log('Backend reachable', 'ok');
      toast('Backend connected');
    } else {
      setConnected(false);
      log(`Backend replied ${res.status}`, 'err');
      toast('Backend error', 'err');
    }
  } catch {
    setConnected(false);
    log('Backend unreachable', 'err');
    toast('Backend unreachable', 'err');
  }
}

async function syncFromBackend() {
  setSyncBadge('syncing');
  log('Syncing state from backend…', 'info');
  try {
    const res = await fetch(getBase() + '/state');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    /* Expected shape:
       {
         buttons: { name: { function: "..." } },
         edges:   [{ from, to }],
         trigger: "btnName" | null
       }
    */
    if (data.buttons) {
      state.buttons = {};
      Object.entries(data.buttons).forEach(([k, v]) => {
        state.buttons[k] = { fn: v.function || '' };
      });
    }
    if (data.edges)   state.edges   = data.edges;
    if ('trigger' in data) state.trigger = data.trigger;

    setConnected(true);
    refreshAll();
    setSyncBadge('ok');
    log('State synced from backend', 'ok');
    toast('State synced');
    setTimeout(() => setSyncBadge('idle'), 2000);
  } catch (e) {
    setConnected(false);
    setSyncBadge('idle');
    log(`Sync failed — ${e.message}`, 'err');
    toast('Sync failed', 'err');
  }
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function setConnected(yes) {
  const dot = document.getElementById('conn-dot');
  dot.className = 'conn-indicator ' + (yes ? 'connected' : 'disconnected');
}

function setSyncBadge(status) {
  const el = document.getElementById('sync-badge');
  const cfg = {
    idle:    { dot: 'var(--text3)',  label: 'Idle',    bg: 'var(--bg2)', border:'var(--border)', color:'var(--text2)' },
    syncing: { dot: 'var(--accent)', label: 'Syncing…', bg:'var(--accent-bg)', border:'var(--accent-border)', color:'var(--accent)' },
    ok:      { dot: 'var(--green)', label: 'Synced',   bg:'var(--green-bg)', border:'var(--green-border)', color:'var(--green)' },
    running: { dot: 'var(--amber)', label: 'Running…', bg:'var(--amber-bg)', border:'var(--amber-border)', color:'var(--amber)' }
  }[status] || {};
  el.innerHTML = `<span class="status-dot" style="background:${cfg.dot}"></span>${cfg.label}`;
  el.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.color};`;
}

/* ============================================================
   INIT
   ============================================================ */
log('Flow builder ready', 'info');
log('Add buttons, connect edges, set a trigger, then hit Execute', 'info');