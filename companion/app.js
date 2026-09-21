import {mountTokenView, unmountTokenView} from './token-view.js';
import { mountObservatory, unmountObservatory } from './observatory.js';
import { mountCatbrain, unmountCatbrain, setCatbrainGuard } from './catbrain.js';
const $ = (s) => document.querySelector(s);
let session =
  location.hash.slice(1) || sessionStorage.getItem('sheriff-session') || '';
if (location.hash) {
  sessionStorage.setItem('sheriff-session', session);
  history.replaceState(null, '', '/');
}
let state,
  tab = 'cat',
  filter = '',
  sort = 'new',
  selected = new Set(),
  toastTimer,
  pending = false,
  formDirty = false;
const titles = {
  brain: ['Inside the signal.', 'Artificial neural model · simulated market · paper trading only.'],
  pro: [
    'The full picture.',
    'Your professional observation desk. Every number has a context.',
  ],
  cat: [
    'An instinct for the unexpected.',
    'A curious companion. A clearer view of the market.',
  ],
  radar: [
    'Follow the fresh tracks.',
    'New observations, familiar names, and the facts between them.',
  ],
  watch: [
    'Keep a closer eye.',
    'Your conditions. Your watchlist. Every change has a source.',
  ],
  paper: [
    'Practice your next move.',
    'Virtual positions. Real discipline. No money at risk.',
  ],
  daily: [
    'The day, decoded.',
    'A field report from your observed corner of the market.',
  ],
  access: [
    'A little more Sheriff.',
    'Access follows token quantity. Experience follows curiosity.',
  ],
  settings: [
    'Make yourself at home.',
    'Display preferences and your data connection.',
  ],
};
const tabs = [
  ['cat', 'Token View'],
  ['pro', 'Pro terminal'],
  ['brain', 'Brain Cat · Lab'],
  ['radar', 'Token radar'],
  ['watch', 'Watch station'],
  ['paper', 'Paper desk'],
  ['daily', 'Memory'],
];
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const money = (n) =>
  !Number.isFinite(n)
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumSignificantDigits: 5,
      }).format(n);
const percent = (n) =>
  !Number.isFinite(n) ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%';
const short = (v) => (v ? v.slice(0, 6) + '…' + v.slice(-4) : 'Unknown');
const stamp = (v) =>
  v
    ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not checked';
const token = (a) => state.tokens.find((t) => t.address === a);
const fresh = (m) =>
  m && m.observedAt <= Date.now() && Date.now() - m.observedAt < 120000;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
}
async function api(path, body) {
  const response = await fetch('/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Sheriff-Session': session,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request unavailable');
  return data;
}
async function act(body, message) {
  if (pending) {
    toast('Please wait for the current action.');
    return null;
  }
  pending = true;
  try {
    const data = await api('action', body);
    state = data.state;
    render();
    if (message) toast(message);
    return data;
  } catch (e) {
    toast(e.message);
    return null;
  } finally {
    pending = false;
  }
}
const metric = (label, value, note = '') =>
  `<div class="metric"><div class="metric-label">${label}</div><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;
const panel = (name, subtitle, content, index = '01') =>
  `<section class="panel"><div class="panel-head"><div><h3>${name}</h3><p>${subtitle}</p></div><span class="section-index">/${index}</span></div>${content}</section>`;
const empty = (title, text, button = '') =>
  `<div class="empty"><b>⌁</b><h3>${title}</h3><p>${text}</p>${button}</div>`;
function tokenOptions() {
  return state.tokens
    .map(
      (t) =>
        `<option value="${esc(t.address)}">${esc(t.symbol)} · ${short(t.address)}${fresh(t.market) ? '' : ' / stale'}</option>`,
    )
    .join('');
}
function table(tokens, selectable = false) {
  if (!tokens.length)
    return empty(
      'No tracks here yet.',
      'Connect your personal API key, refresh the radar, or adjust your search. Unavailable feeds are never replaced with invented tokens.',
      '<button data-tab="settings">Open settings ↗</button>',
    );
  return `<div class="table-scroll"><table><thead><tr><th>${selectable ? 'PICK' : 'SAVE'}</th><th>TOKEN / CONTRACT</th><th>PRICE</th><th>24H</th><th>LIQUIDITY</th><th>DATA</th></tr></thead><tbody>${tokens
    .slice(0, 100)
    .map(
      (t) =>
        `<tr><td>${selectable ? `<input aria-label="Compare ${esc(t.symbol)} ${esc(t.address)}" type="checkbox" data-select="${esc(t.address)}" ${selected.has(t.address) ? 'checked' : ''}>` : `<button data-watch="${esc(t.address)}" aria-label="${state.watch[t.address] ? 'Unwatch' : 'Watch'} ${esc(t.symbol)}">${state.watch[t.address] ? '★' : '☆'}</button>`}</td><td><button class="token-button" data-inspect="${esc(t.address)}">${esc(t.symbol)}<small>${short(t.address)}</small></button></td><td>${money(t.market?.price)}</td><td class="${t.market?.change >= 0 ? 'positive' : 'negative'}">${percent(t.market?.change)}</td><td>${money(t.market?.liquidity)}</td><td><small>${fresh(t.market) ? 'OBSERVED ' + stamp(t.market.observedAt) : 'STALE / NONE'}</small></td></tr>`,
    )
    .join(
      '',
    )}</tbody></table></div><div class="table-foot">${Math.min(tokens.length, 100)} / ${tokens.length} displayed · select a ticker to open its dossier</div>`;
}
function home() {
  const freshCount = state.tokens.filter(t => fresh(t.market)).length;
  return `<section class="brain-hero"><div class="brain-hero-copy"><span class="brain-kicker">BRAIN CAT / OBSERVATION SYSTEM</span><h2>A different<br>kind of instinct<span>.</span></h2><p>A free research terminal with a curious companion. Follow the signals. Inspect the evidence. Keep your perspective.</p><div class="hero-actions"><button class="primary" data-tab="pro">Enter Pro terminal ↗</button><button data-tab="brain">Explore Brain Lab</button></div><div class="hero-tags">FREE TO USE <i></i> NO WALLET <i></i> READ ONLY</div></div><div class="brain-specimen"><canvas id="observatory" aria-label="Interactive artistic reconstruction of the Brain Cat mascot"></canvas><div class="specimen-top">FELIS / RECONSTRUCTION 001<span>ARTISTIC VISUALIZATION</span></div><div class="specimen-bottom"><span>MOVE TO EXPLORE · CLICK TO REASSEMBLE</span><button id="reconstruct">Reconstruct ↻</button><button id="motion-toggle">Pause motion</button></div></div></section>
  <div class="metrics brain-metrics">${metric('OBSERVED TOKENS',state.tokens.length,'Your collected sample')}${metric('FRESH QUOTES',freshCount,'Received within 2 minutes')}${metric('CONDITION MATCHES',state.trading.alerts.length,'Saved alert crossings')}${metric('SESSION',state.guard?.locked?'RESTING':'ACTIVE','A little space to think')}</div>
  <div class="brain-portals">${[['pro','01','Pro terminal','The entire field of view.','Live observations, activity filters and a focused event tape.'],['radar','02','Investigate','Follow a thread.','Inspect creators, holders and available contract evidence.'],['brain','03','Brain Lab','See a signal take shape.','A self-contained artificial network experiment with simulated data.']].map(([id,n,title,tag,copy])=>`<button class="brain-portal" data-tab="${id}"><span>${n} / ${title.toUpperCase()}</span><h3>${tag}</h3><p>${copy}</p><b>↗</b></button>`).join('')}</div>
  ${panel('Recent memory','Changes in your observed market',`<div class="panel-body">${events(state.trading.changes)}</div>`)}`;
}
function radar() {
  let rows = state.tokens.filter((t) =>
    `${t.name} ${t.symbol} ${t.address}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  if (sort === 'liquidity')
    rows.sort(
      (a, b) => (b.market?.liquidity || 0) - (a.market?.liquidity || 0),
    );
  else if (sort === 'volume')
    rows.sort((a, b) => (b.market?.volume || 0) - (a.market?.volume || 0));
  else rows.sort((a, b) => b.seenAt - a.seenAt);
  return (
    `<div class="metrics">${metric('OBSERVED TODAY', state.summary.today, 'UTC / local history')}${metric('MEME WEATHER', state.summary.weather, state.summary.priced + ' stored 24h moves')}${metric('LAST PATROL', stamp(state.lastScan), 'Launch scan / every 8s')}</div>` +
    panel(
      'New cat radar',
      'Choose a contract. Get a dossier.',
      `<form id="investigate-form" class="toolbar"><input name="address" placeholder="Paste a token contract · 0x…" aria-label="Token contract" required><button class="primary">Investigate ↗</button></form><div class="toolbar"><input id="search" value="${esc(filter)}" placeholder="Filter name, ticker or contract" aria-label="Filter radar"><select id="sort" aria-label="Sort tokens"><option value="new" ${sort === 'new' ? 'selected' : ''}>Newest observed</option><option value="liquidity" ${sort === 'liquidity' ? 'selected' : ''}>Liquidity</option><option value="volume" ${sort === 'volume' ? 'selected' : ''}>24h volume</option></select><button id="compare">Compare (<span id="selected-count">${selected.size}</span>/${state.access.compare})</button></div><div id="radar-table">${table(rows, true)}</div>`,
    ) +
    panel(
      'Familiar faces',
      'Name and ticker matches in the observed archive. Similarity is not evidence of fraud.',
      `<div class="panel-body">${
        state.clones.length
          ? state.clones
              .slice(0, 4)
              .map(
                (c) =>
                  `<div class="event row"><div>${esc(c.a.symbol)} ↔ ${esc(c.b.symbol)}<small>${esc(c.reason)} · earlier observed block: ${c.a.block}</small></div><button data-inspect="${esc(c.a.address)}">Inspect ↗</button></div>`,
              )
              .join('')
          : '<p class="text-note">No matching names in this archive.</p>'
      }</div>`,
      '02',
    )
  );
}
function watch() {
  const x = state.trading;
  return (
    panel(
      'Your watchlist',
      `${Object.keys(state.watch).length} / ${state.access.watch} slots · stored on this computer`,
      table(state.tokens.filter((t) => state.watch[t.address])),
    ) +
    panel(
      'When this happens, tell me.',
      'Rules match fresh observations. This program must remain open.',
      `<div class="panel-body"><form id="rule-form"><label>Token<select name="address"><option value="*">All monitored tokens (up to 100)</option>${tokenOptions()}</select></label><label>Condition<input name="condition" placeholder="liquidity>=20000,volume>50000" required></label><small>Available: price, liquidity, volume, change, buys. Commas mean AND.</small><button class="primary">Create alert</button></form>${x.rules.map((r, index) => `<div class="event row"><div>${index >= state.access.rules ? 'PAUSED / CAPACITY LIMIT · ' : ''}${r.address === '*' ? 'All monitored tokens' : short(r.address)}<small>${esc(r.conditions.map((c) => c.field + c.op + c.value).join(' AND '))}</small></div><button data-unrule="${esc(r.id)}">Remove</button></div>`).join('')}</div>`,
      '02',
    ) +
    `<div class="split">${panel('Condition matches', 'Most recent crossings', `<div class="panel-body">${events(x.alerts)}</div>`, '03')}${panel('Since your last observations', 'Price ≥3% · liquidity / volume ≥10%', `<div class="panel-body">${events(x.changes)}</div>`, '04')}</div>` +
    panel(
      'Optional address research',
      'Research any public address. This is optional, not a wallet connection. Transfers are IN / OUT, not inferred trades.',
      `<div class="panel-body"><form id="wallet-form" class="toolbar"><input name="address" placeholder="0x public address" required aria-label="Public address"><button>Add address</button></form>${x.wallets.map((w) => `<div class="event row"><div>${short(w.address)}<small>${esc(w.status || 'Waiting for the next scan')}</small></div><button data-unwallet="${esc(w.address)}">Remove</button></div>`).join('')}${x.transfers
        .slice(0, 10)
        .map(
          (t) =>
            `<div class="event">${esc(t.direction)} ${esc(t.symbol)} · ${esc(t.value)}<small>${t.historical ? 'HISTORY' : 'OBSERVED'} · ${short(t.wallet)} · ${stamp(t.at)}</small></div>`,
        )
        .join('')}</div>`,
      '05',
    )
  );
}
function events(rows) {
  return rows.length
    ? rows
        .slice(0, 8)
        .map(
          (e) =>
            `<div class="event">${esc(e.text)}<small>${stamp(e.at)}</small></div>`,
        )
        .join('')
    : '<p class="text-note">Nothing to report yet. I’ll keep watching.</p>';
}
function paper() {
  const x = state.trading,
    closed = x.paper.filter((p) => p.closedAt);
  return (
    `<div class="metrics">${metric('VIRTUAL CASH', money(x.balance), 'Starts at $10,000')}${metric('OPEN POSITIONS', x.paper.length - closed.length, 'Only while app is running')}${metric('REALIZED RESULT', money(closed.reduce((s, p) => s + p.pnl, 0)), 'Includes modeled fees & slippage')}</div>` +
    panel(
      'Try a move. Learn something.',
      'No wallet, no orders, no financial rewards.',
      `<div class="panel-body"><form id="paper-form"><label>Token<select name="address" required>${tokenOptions()}</select></label><div class="number-grid"><label>Entry size / USD<input name="amount" type="number" min="1" value="100" step="any" required></label><label>Stop / %<input name="stop" type="number" min="0.1" max="95" step="any" value="10" required></label><label>Target / %<input name="target" type="number" min="0.1" max="10000" step="any" value="20" required></label><label>Fee / bps<input name="fee" type="number" min="0" max="1000" value="30" required></label><label>Slippage / bps<input name="slip" type="number" min="0" max="5000" value="50" required></label></div><div class="row"><button type="button" id="estimate">Estimate entry</button><button class="primary">Open virtual position ↗</button></div></form><p class="text-note" style="margin-top:15px">Approximate constant-product model using half the reported liquidity as a reserve. Not a router quote. No gas, tax or MEV. Stops use observed prices, not intrapoll highs and lows.</p></div>`,
    ) +
    panel(
      'Your practice journal',
      'Each outcome is a chance to understand the move.',
      `<div class="panel-body">${
        x.paper.length
          ? [...x.paper]
              .reverse()
              .map(
                (p) =>
                  `<div class="event"><div class="row"><h3>${esc(p.symbol)} <span class="pill">${p.closedAt ? 'CLOSED' : 'PAPER'}</span></h3><span class="${(p.pnl ?? p.mark - p.amount) >= 0 ? 'positive' : 'negative'}">${money(p.closedAt ? p.pnl : Number.isFinite(p.mark) ? p.mark - p.amount : null)}</span></div><small>${money(p.amount)} · stop ${p.stop}% · target ${p.target}% · ${esc(p.reason || p.status || 'Waiting for a mark')}</small>${!p.closedAt ? `<button data-close="${esc(p.id)}">Close & review</button>` : ''}</div>`,
              )
              .join('')
          : '<p class="text-note">Your first virtual position will appear here.</p>'
      }</div>`,
      '02',
    )
  );
}
function dailyPage() {
  const hours = state.summary.hours,
    max = Math.max(1, ...hours);
  return (
    panel(
      'Today’s footprints',
      'First observations per UTC hour. This is your sample, not the entire market.',
      `<div class="panel-body"><div class="row"><h2>${state.summary.today} observations</h2><span class="pill">${esc(state.summary.weather)}</span></div><div class="bar-chart">${hours.map((n, i) => `<i style="height:${Math.max(2, (n / max) * 100)}%" title="${i}:00 UTC / ${n}"></i>`).join('')}</div><div class="row text-note"><span>00:00 UTC</span><span>23:00 UTC</span></div></div>`,
    ) +
    panel(
      'Observation journal',
      'A shareable report assembled from your stored observations.',
      `<div class="panel-body"><pre class="pre">${esc(state.daily)}</pre><div class="row"><button id="copy-daily">Copy report</button><button id="export-daily" class="primary">Download report ↓</button></div></div>`,
      '02',
    )
  );
}
function settings() {
 return panel('Your workspace','Free access. No token balance or personal wallet required.',`<div class="panel-body"><form id="settings-form"><label><input name="reducedMotion" type="checkbox" ${state.settings.reducedMotion?'checked':''}> Reduce motion</label><button class="primary">Save preferences</button></form></div>`)+panel('Data connection','Provider credentials are separate from wallet access.',`<div class="panel-body">${state.demo?'<div class="alert-strip">DEMO / Prices and launches are simulated. Start without --demo to use live observations.</div>':'<form id="connect-form"><label>Blockscout API key<input name="key" type="password" autocomplete="off" placeholder="Personal provider key" required></label><button class="primary">Connect data source</button></form>'}<p class="text-note">Keys stay in process memory until the program closes. Provider availability and rate limits determine data freshness. Brain Lab works offline.</p><a class="source-link" href="https://dev.blockscout.com/" target="_blank" rel="noreferrer">Provider documentation ↗</a></div>`)+panel('Local research','Your observations stay on this computer.',`<div class="panel-body"><p class="text-note">Watchlists, conditions, market history and paper positions are saved locally. No purchases, wallet signatures, token gates or pet progression. Technical capacity limits apply equally to everyone.</p></div>`);
}
function renderContent() {
  if(tab === 'cat') {
    unmountCatbrain();
    mountTokenView($('#content'), {snapshot:()=>state,investigate:async address=>(await act({type:'investigate',address}))?.result});
    return;
  }
  unmountTokenView();
  unmountObservatory();
  if (tab === 'brain') {
    mountCatbrain($('#content'), {snapshot:()=>state, investigate:async address=>(await act({type:'investigate',address}))?.result});
    return;
  }
  unmountCatbrain();
  const toolsOpen = $('.terminal-tools')?.open;
  const scroll = $('.dense-scroll')?.scrollTop || 0;
  $('#content').innerHTML = {
    cat: home,
    pro: proTerminal,
    radar,
    watch,
    paper,
    daily: dailyPage,
    settings,
  }[tab]();
  if (toolsOpen && $('.terminal-tools')) $('.terminal-tools').open = true;
  if ($('.dense-scroll')) $('.dense-scroll').scrollTop = scroll;
  if(tab==='pro') paintTerminal();
  if(tab==='cat') mountObservatory($('#observatory'));
}
function render(full = true) {
  $('#navigation').innerHTML = tabs
    .map(
      ([id, label], i) =>
        `<button data-tab="${id}" class="${tab === id ? 'active' : ''}"><span>0${i + 1}</span>${label}</button>`,
    )
    .join('');
  $('#page-title').textContent = titles[tab][0];
  $('#subtitle').textContent = titles[tab][1];
  $('#connection').textContent = state.status;
  $('#mode').textContent = state.demo
    ? 'DEMO DATA'
    : state.connected
      ? 'READ ONLY'
      : 'OFFLINE';
  $('#mode').classList.toggle('demo', state.demo);
  document.body.classList.toggle('on-break', !!state.guard?.locked);
  document.body.classList.toggle('pro-mode', tab === 'pro');
  document.body.classList.toggle('brain-mode', tab === 'brain');
  setCatbrainGuard(!!state.guard?.locked);
  document.body.classList.toggle('pet-home', tab === 'cat');
  window.dispatchEvent(new CustomEvent('sheriff-pets',{detail:{tab,locked:!!state.guard?.locked,name:state.pet.name,clue:state.clue}}));
  document.body.classList.toggle('reduced', state.settings.reducedMotion);
  $('#storage-note').textContent = state.demo
    ? 'OFFLINE DEMO / SIMULATED OBSERVATIONS'
    : state.storage.toUpperCase();
  if (full) {
    renderContent();
    if (state.guard?.locked)
      $('#content').insertAdjacentHTML('afterbegin', breakBanner());
  }
  if (state.guard?.locked && !$('.break-banner'))
    $('#content').insertAdjacentHTML('afterbegin', breakBanner());
  for (const button of document.querySelectorAll(
    '#paper-form button.primary, #guess-form button',
  ))
    button.disabled = !!state.guard?.locked;
}
function navigate(id) {
  if(!titles[id] || id==='access') return;
  tab = id;
  formDirty = false;
  render();
  window.scrollTo({top:0,behavior:'instant'});
  document.querySelector('.workspace')?.scrollTo({top:0,behavior:'instant'});
  $('#content').focus({ preventScroll: true });
}
function modal(title, subtitle, html) {
  $('#modal-content').innerHTML =
    `<div class="dialog-heading"><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${html}`;
  if (!$('#modal').open) $('#modal').showModal();
}
async function inspect(address) {
  toast('Gathering the available evidence…');
  const d = await act({ type: 'investigate', address });
  if (!d) return;
  const t = token(address.toLowerCase()),
    result = d.result;
  const other = state.tokens.filter(
    (r) =>
      r.creator &&
      r.creator.toLowerCase() ===
        String(result.creator || t?.creator).toLowerCase(),
  );
  modal(
    t?.name || 'Token dossier',
    address,
    `<div class="row wrap"><span class="pill">${state.demo ? 'DEMO' : 'CHECKED ' + stamp(result.checkedAt)}</span><button data-watch="${esc(address.toLowerCase())}">${state.watch[address.toLowerCase()] ? '★ Unwatch' : '☆ Add to watchlist'}</button></div><div class="metrics" style="margin-top:18px">${metric('PRICE', money(t?.market?.price), fresh(t?.market) ? 'Observed recently' : 'Stale / unavailable')}${metric('LIQUIDITY', money(t?.market?.liquidity))}${metric('DEV COUNTER', other.length, 'Launches in this archive')}</div>${result.lines.map((line) => `<div class="dossier-line">${esc(line)}</div>`).join('')}<div class="dossier-line">Creator: ${esc(result.creator || t?.creator || 'Unknown')}</div>${!state.demo ? `<a class="source-link" href="https://explorer.robinhood.com/address/${esc(address)}" target="_blank" rel="noreferrer">Open explorer ↗</a>` : ''}<p class="text-note" style="margin-top:14px">Creator counts cover this archive only. Price and liquidity are provider observations, not execution quotes.</p>`,
  );
}
function animate(kind) {
  const h = $('#habitat');
  h.classList.remove('jump', 'feed');
  void h.offsetWidth;
  h.classList.add(kind);
  setTimeout(() => h.classList.remove(kind), 1500);
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b || !state) return;
  if (b.dataset.tab) return navigate(b.dataset.tab);
  if (b.classList.contains('close-modal')) return $('#modal').close();
  if (b.dataset.care) {
    const d = await act(
      { type: 'care', action: b.dataset.care },
      b.dataset.care === 'daily'
        ? 'Daily fish collected.'
        : 'A happy little moment.',
    );
    if (d) animate(b.dataset.care === 'feed' ? 'feed' : 'jump');
  }
  if (b.dataset.outfit)
    await act({ type: 'outfit', outfit: b.dataset.outfit }, 'Outfit updated.');
  if (b.dataset.watch)
    await act(
      { type: 'watch', address: b.dataset.watch },
      'Watchlist updated.',
    );
  if (b.dataset.inspect) await inspect(b.dataset.inspect);
  if (b.dataset.unrule)
    await act({ type: 'unrule', id: b.dataset.unrule }, 'Alert removed.');
  if (b.dataset.unwallet)
    await act(
      { type: 'unwallet', address: b.dataset.unwallet },
      'Address removed.',
    );
  if (b.dataset.close)
    await act(
      { type: 'close', id: b.dataset.close },
      'Virtual position closed. Review saved.',
    );
  if (b.id === 'refresh')
    await act({ type: 'refresh' }, 'Observations refreshed.');
  if (b.id === 'compare') {
    const d = await act({ type: 'compare', addresses: [...selected] });
    if (d)
      modal(
        'Compare the evidence.',
        'All figures use the latest stored observations. Unknown is not zero.',
        table(d.result),
      );
  }
  if (b.id === 'estimate') {
    const values = Object.fromEntries(new FormData($('#paper-form')));
    const d = await act({ type: 'estimate', ...values });
    if (d)
      modal(
        'Entry estimate',
        'Illustrative liquidity model, not an execution quote.',
        `<div class="panel-body">${Object.entries(d.result)
          .map(
            ([k, v]) =>
              `<div class="event row"><span>${esc(k)}</span><span>${esc(typeof v === 'number' ? Number(v.toPrecision(6)) : v)}</span></div>`,
          )
          .join('')}</div>`,
      );
  }
  if (b.id === 'copy-daily') {
    try {
      await navigator.clipboard.writeText(state.daily);
      toast('Report copied.');
    } catch {
      toast('Clipboard unavailable. Use Download report.');
    }
  }
  if (b.id === 'export-daily') {
    const url = URL.createObjectURL(
      new Blob([state.daily], { type: 'text/plain' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download =
      'braincat-memory-' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target,
    v = Object.fromEntries(new FormData(f));
  formDirty = false;
  if (f.id === 'guard-form')
    return act({ type: 'guard-settings', ...v }, 'Session limits saved.');
  if (f.id === 'risk-form') {
    formDirty = true;
    $('#risk-result').textContent =
      'Risk budget: ' +
      money((Number(v.budget) * Number(v.risk)) / 100) +
      ' · Position estimate: ' +
      money((Number(v.budget) * Number(v.risk)) / Number(v.stop)) +
      ' before fees and slippage.';
    return;
  }
  if (f.id === 'investigate-form')
    return inspect(v.address.trim().toLowerCase());
  if (f.id === 'connect-form') {
    const key = v.key;
    f.reset();
    return act({ type: 'connect', key }, 'Data source connected.');
  }
  if (f.id === 'settings-form')
    return act(
      { type: 'settings', ...v, reducedMotion: v.reducedMotion === 'on' },
      'Companion saved.',
    );
  if (f.id === 'rule-form')
    return act({ type: 'rule', ...v }, 'Condition saved.');
  if (f.id === 'wallet-form')
    return act(
      { type: 'wallet', ...v },
      'Address added. Updates arrive on the next patrol.',
    );
  if (f.id === 'paper-form')
    return act({ type: 'paper', ...v }, 'Virtual position opened.');
  if (f.id === 'guess-form')
    return act(
      { type: 'guess', ...v, direction: e.submitter.value },
      'Prediction saved.',
    );
});
document.addEventListener('change', async (e) => {
  if (e.target.dataset.select) {
    if (e.target.checked) selected.add(e.target.dataset.select);
    else selected.delete(e.target.dataset.select);
    $('#selected-count').textContent = selected.size;
  }
  if (e.target.id === 'sort') {
    sort = e.target.value;
    renderContent();
  }
  if (e.target.id === 'demo-tier')
    await act(
      { type: 'demo-tier', tier: e.target.value },
      'Demo access changed.',
    );
});
document.addEventListener('input', (e) => {
  if (e.target.closest('form')) formDirty = true;
  if (e.target.id === 'search') {
    filter = e.target.value;
    const start = e.target.selectionStart;
    renderContent();
    $('#search').focus();
    $('#search').setSelectionRange(start, start);
  }
});
document.addEventListener('keydown', (e) => {
  if (
    /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) ||
    $('#modal').open ||
    !state
  )
    return;
  if (/^[1-8]$/.test(e.key))
    navigate([...tabs.map((t) => t[0]), 'settings'][Number(e.key) - 1]);
});
async function poll() {
  try {
    const next = await api('state');
    const changed =
      state?.lastScan !== next.lastScan ||
      state?.guard?.locked !== next.guard?.locked;
    state = next;
    const focused = /INPUT|SELECT|TEXTAREA/.test(
      document.activeElement.tagName,
    );
    render(
      (tab !== 'pro' || changed) &&
        !focused &&
        !pending &&
        !formDirty &&
        !$('#modal').open,
    );
  } catch (e) {
    toast(e.message);
    $('#connection').textContent = 'CONNECTION UNAVAILABLE';
  }
}
try {
  state = await api('state');
  render();
} catch (e) {
  $('#content').innerHTML = empty('Unlock your local session.', esc(e.message));
}
setInterval(() => {
  if (tab === 'pro') poll();
}, 750);
setInterval(() => {
  if (tab !== 'pro') poll();
}, 5000);
setInterval(() => {
  $('#clock').textContent = new Date().toLocaleTimeString();
}, 1000);

function breakBanner() {
  const g = state.guard;
  return `<div class="break-banner" role="status"><img src="/catbrain-cat.png" alt="Resting sheriff"/><div><b>Let’s take a little breather.</b><p>${esc(g.reason)} · ${Math.ceil(g.remaining / 60000)} min remaining. Research and exits stay available.</p></div><button data-guard="resume" ${g.remaining > 0 ? 'disabled' : ''}>Resume practice ↗</button></div>`;
}
function proTools() {
  const ts = state.tokens,
    live = ts.filter((t) => fresh(t.market)),
    sorted = [...live].sort(
      (a, b) => (b.market.volume || 0) - (a.market.volume || 0),
    );
  const up = live.filter((t) => t.market.change > 0).length,
    down = live.filter((t) => t.market.change < 0).length,
    g = state.guard;
  const rows = sorted
    .slice(0, 12)
    .map(
      (t, i) =>
        `<tr><td>${String(i + 1).padStart(2, '0')}</td><td><button data-inspect="${esc(t.address)}">${esc(t.symbol)}</button></td><td>${money(t.market.price)}</td><td class="${t.market.change >= 0 ? 'positive' : 'negative'}">${percent(t.market.change)}</td><td>${money(t.market.liquidity)}</td><td>${money(t.market.volume)}</td></tr>`,
    )
    .join('');
  const bands = [1000, 10000, 100000, Infinity].map((max, i) => ({
    label: ['< $1K', '$1K–10K', '$10K–100K', '$100K+'][i],
    n: live.filter(
      (t) =>
        Number.isFinite(t.market.liquidity) &&
        t.market.liquidity >= (i ? [1000, 10000, 100000][i - 1] : 0) &&
        t.market.liquidity < max,
    ).length,
  }));
  const bar = (label, n, max) =>
    `<div class="data-bar"><span>${esc(label)}</span><div><i style="width:${Math.max(0, Math.min(100, (n / Math.max(1, max)) * 100))}%"></i></div><b>${n}</b></div>`;
  return `<div class="terminal-strip"><b>✦ BRAIN / OBSERVATORY</b><span>${state.demo ? 'SIMULATED FEED' : 'OBSERVED MARKET'} · ${live.length}/${ts.length} FRESH · ${stamp(state.lastScan)}</span></div>
 <div class="metrics">${metric('OBSERVED TOKENS', ts.length, 'Your indexed history')}${metric('PAPER EQUITY', money(g.equity), 'Cash + modeled liquidation value')}${metric('VISIBLE SESSION', Math.floor(g.elapsed / 60000) + ' min', g.minutes + ' minute limit')}${metric('PAPER DRAWDOWN', g.drawdown === null ? 'Unknown' : g.drawdown.toFixed(2) + '%', g.loss + '% break threshold')}</div>
 <div class="pro-grid"><div class="pro-wide">${panel('Market tape', 'Fresh quotes only · provider 24h price change', `<div class="table-wrap"><table><thead><tr><th>#</th><th>TOKEN</th><th>PRICE</th><th>24H Δ</th><th>LIQUIDITY</th><th>24H VOL</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Waiting for fresh market observations.</td></tr>'}</tbody></table></div>`, '01')}</div>
 ${panel(
   'Market breadth',
   'Observed sample, not the entire chain',
   `<div class="panel-body">${bar('Rising', up, live.length)}${bar('Falling', down, live.length)}${bar('Flat / unknown', live.length - up - down, live.length)}<div class="heat-grid">${live
     .slice(0, 18)
     .map(
       (t) =>
         `<button data-inspect="${esc(t.address)}" class="${t.market.change >= 0 ? 'positive' : 'negative'}">${esc(t.symbol)}<small>${percent(t.market.change)}</small></button>`,
     )
     .join('')}</div></div>`,
   '02',
 )}
 ${panel('Depth distribution', 'Available reported liquidity', `<div class="panel-body">${bands.map((b) => bar(b.label, b.n, live.length)).join('')}<p class="text-note">Liquidity is not an executable quote. Unknown liquidity is excluded.</p></div>`, '03')}
 ${panel('Session guardian', 'A gentle rule-based reminder, not a fatigue diagnosis', `<div class="panel-body"><div class="guardian-face"><img src="/catbrain-cat.png" alt="Your little session guardian"/><p>${g.locked ? 'You have done enough for now. I’ll keep you company.' : 'I keep an eye on the clock. You keep your perspective.'}</p></div>${bar('Session minutes', Math.floor(g.elapsed / 60000), g.minutes)}<form id="guard-form"><div class="number-grid"><label>Session / min<input name="minutes" type="number" min="1" max="180" value="${g.minutes}" required></label><label>Paper loss / %<input name="loss" type="number" min="0.1" max="50" step="0.1" value="${g.loss}" required></label><label>Break / min<input name="rest" type="number" min="1" max="60" value="${g.rest}" required></label></div><button ${g.locked ? 'disabled' : ''}>Save limits</button> <button type="button" data-guard="break" ${g.locked ? 'disabled' : ''}>Take a break ◌</button></form><p class="text-note">Pauses new paper entries and predictions. External trading is unaffected. Balance checks use fresh paper quotes; unavailable quotes never count as losses.</p></div>`, '04')}
 ${panel('Position planner', 'Simple risk arithmetic', `<div class="panel-body"><form id="risk-form"><div class="number-grid"><label>Budget / USD<input name="budget" type="number" min="1" value="1000" required></label><label>Risk / %<input name="risk" type="number" min="0.1" max="100" step="0.1" value="1" required></label><label>Stop / %<input name="stop" type="number" min="0.1" max="100" step="0.1" value="10" required></label></div><button>Calculate size ↗</button></form><p id="risk-result" class="text-note">Position = budget × risk percentage ÷ stop percentage. A stop does not guarantee an exit price.</p><button data-tab="paper">Open paper desk ↗</button></div>`, '05')}
 ${panel(
   'Signal inbox',
   'Your conditions, latest first',
   `<div class="panel-body">${
     state.trading.alerts
       .slice(0, 6)
       .map(
         (a) =>
           `<div class="tape-line">${esc(a.symbol || 'ALERT')} <small>${esc(a.message || a.text || a.condition || 'Condition matched')}</small></div>`,
       )
       .join('') ||
     '<p class="text-note">No triggered conditions yet. Add your own watch rules.</p>'
   }<button data-tab="watch">Manage watch rules ↗</button></div>`,
   '06',
 )}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-guard]');
  if (b) act({ type: b.dataset.guard });
});
setInterval(async () => {
  if (!state || pending || document.hidden) return;
  try {
    const data = await api('action', { type: 'heartbeat' });
    state = data.state;
    render(false);
  } catch {}
}, 15000);

let scopeAddress = '',
  terminalPaused = false,
  terminalTicks = 0;
const terminalEvents = [];
const observedQuotes = new Map();
function terminalBox(title, content, cls = '') {
  return `<section class="terminal-box ${cls}"><h3>${title}</h3>${content}</section>`;
}
function proTerminal() {
  const ts = state.tokens,
    g = state.guard;
  const chosen = ts.find((t) => t.address === scopeAddress) || ts[0];
  const live = ts.filter((t) => fresh(t.market));
  const rows = ts
    .slice(0, 60)
    .map((t) => {
      const m = t.market || {};
      return `<tr class="${chosen?.address === t.address ? 'scope-active' : ''}" data-address="${esc(t.address)}"><td><span class="quote-age" data-at="${Number(m.observedAt) || 0}">—</span></td><td class="ice">${state.demo ? 'DEMO' : fresh(m) ? 'QUOTE' : 'STALE'}</td><td><button data-scope="${esc(t.address)}">$${esc(t.symbol)}</button></td><td>${money(m.price)}</td><td class="${m.change >= 0 ? 'positive' : 'negative'}">${percent(m.change)}</td><td>${money(m.liquidity)}</td><td>${money(m.volume)}</td><td>${Object.hasOwn(state.watch, t.address) ? '★ WATCH' : '· SCAN'}</td></tr>`;
    })
    .join('');
  const m = chosen?.market || {};
  const scope = chosen
    ? `<div class="scope-title"><b>$${esc(chosen.symbol)}</b><small>${esc(short(chosen.address))}</small></div><div class="scope-radar"><i></i><span>✦</span><em>OBSERVATION SCOPE</em></div><dl class="scope-stats"><dt>PRICE</dt><dd>${money(m.price)}</dd><dt>24H CHANGE</dt><dd class="${m.change >= 0 ? 'positive' : 'negative'}">${percent(m.change)}</dd><dt>LIQUIDITY</dt><dd>${money(m.liquidity)}</dd><dt>24H VOLUME</dt><dd>${money(m.volume)}</dd><dt>CREATOR</dt><dd>${esc(short(chosen.creator))}</dd><dt>OBSERVED BLOCK</dt><dd>${esc(chosen.block ?? 'Unknown')}</dd><dt>DATA</dt><dd>${fresh(m) ? 'FRESH' : 'STALE / NONE'}</dd><dt>CONTRACT CHECKS</dt><dd>${chosen.dossier ? 'AVAILABLE' : 'NOT REQUESTED'}</dd></dl><div class="terminal-actions"><button data-inspect="${esc(chosen.address)}">[ OPEN DOSSIER ]</button><button data-watch="${esc(chosen.address)}">[ ${state.watch[chosen.address] ? 'UNWATCH' : 'WATCH'} ]</button></div>`
    : '<p>No token observed. Connect a data source in Settings.</p>';
  const positions = state.trading.paper.filter((p) => !p.closedAt);
  return `<div class="command-deck ${terminalPaused ? 'is-paused' : ''}"><div class="command-header"><div><div class="terminal-wordmark">BRAIN</div><div class="terminal-caption">CAT / PRO TERMINAL / ROBINHOOD CHAIN</div></div><div class="command-summary"><b>SESSION / OBSERVATION SUMMARY</b><div class="summary-grid"><span>OBSERVED <strong>${ts.length}</strong></span><span>FRESH <strong>${live.length}</strong></span><span>WATCHED <strong>${Object.keys(state.watch).length}</strong></span><span>RULES <strong>${state.trading.rules.length}</strong></span><span>UI TICK <strong>750ms</strong></span><span>SOURCE <strong>${state.demo ? 'SIMULATION' : '1s TARGET / ROTATING BATCHES'}</strong></span></div><div class="terminal-health"><span class="pulse-led"></span>${state.demo ? 'DEMO / SIMULATED OBSERVATIONS' : 'READ ONLY / SOURCE TIMESTAMPS'} <span class="scan-progress">▰▰▰▱▱▱▱▱</span></div></div></div><div class="command-toolbar"><span>◉ ${state.demo ? 'VISUAL DEMO · NO LIVE EXECUTION' : 'MARKET OBSERVATORY'}</span><div><button data-terminal-pause>[ ${terminalPaused ? 'RESUME' : 'PAUSE'} TAPE ]</button><button data-tab="watch">[ RULES ]</button><button data-tab="paper">[ PAPER ]</button></div></div><div class="command-grid">${terminalBox('01 / TOKEN STREAM', `<div class="dense-scroll"><table class="dense-table"><thead><tr><th>AGE</th><th>EVENT</th><th>TOKEN</th><th>PRICE</th><th>24H Δ</th><th>LIQUIDITY</th><th>VOLUME</th><th>STATE</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Waiting for provider observations.</td></tr>'}</tbody></table></div>`, 'stream-box')}${terminalBox('02 / TARGET SCOPE', scope + activityDetails(chosen), 'scope-box')}${terminalBox('03 / WATCH CANDIDATES', candidateBoard(), 'candidate-box')}${terminalBox('04 / EVENT TAPE', `<div id="terminal-tape" class="terminal-tape"></div><div class="terminal-footnote">${state.demo ? 'Simulated market: prices evolve each second; new demo tokens arrive every 8 ticks. Paper results use these simulated quotes.' : 'Only received observations enter this tape. A UI tick does not mean a new market quote.'}</div>`, 'events-box')}${terminalBox(
    '05 / CAT PATROL',
    `<div class="patrol-pet"><img src="/catbrain-cat.png" alt="Brain Cat observer"/><div><b>${'BRAIN CAT'} / ${g.locked ? 'RESTING' : 'ON DUTY'}</b><p>${esc(g.locked ? 'Paws off. A little break makes room for a clearer head.' : state.clue)}</p></div></div><dl class="scope-stats"><dt>VISIBLE SESSION</dt><dd>${Math.floor(g.elapsed / 60000)} / ${g.minutes} MIN</dd><dt>PAPER EQUITY</dt><dd>${money(g.equity)}</dd><dt>DRAWDOWN</dt><dd>${g.drawdown === null ? 'UNKNOWN' : g.drawdown.toFixed(2) + '%'} / ${g.loss}%</dd><dt>OPEN POSITIONS</dt><dd>${positions.length}</dd></dl><div class="exposure-bars">${
      positions
        .slice(0, 4)
        .map(
          (p) =>
            `<div>${esc(p.symbol || short(p.address))}<span>${money(p.amount)}</span></div>`,
        )
        .join('') ||
      '<span>No virtual positions. Research first, practice second.</span>'
    }</div><button data-guard="break">[ TAKE A BREAK ]</button>`,
    'patrol-box',
  )}</div><div class="terminal-bottom"><span>NO KEYS TO SIGN / NO AI / LOCAL PROFILE</span><span class="terminal-tick">WAITING</span></div></div><details class="terminal-tools"><summary>＋ SESSION LIMITS / POSITION PLANNER / MORE TOOLS</summary>${proTools()}</details>`;
}
function paintTerminal() {
  if (tab !== 'pro' || !state || document.hidden) return;
  document.querySelectorAll('.quote-age').forEach((el) => {
    const at = Number(el.dataset.at);
    el.textContent = at
      ? Math.max(0, (Date.now() - at) / 1000).toFixed(1) + 's'
      : '—';
  });
  const clock = $('.terminal-tick');
  if (clock)
    clock.textContent =
      new Date().toLocaleTimeString('en-GB', { hour12: false }) +
      ' / ' +
      (terminalPaused ? 'TAPE PAUSED' : 'PATROL RUNNING');
  if (!terminalPaused)
    terminalEvents.splice(
      0,
      terminalEvents.length,
      ...(state.engine?.events || []).slice(0, 60),
    );
  const tape = $('#terminal-tape');
  if (tape)
    tape.innerHTML =
      terminalEvents
        .slice(0, 12)
        .map(
          (e) =>
            `<div><time>${new Date(e.at).toLocaleTimeString('en-GB', { hour12: false })}</time><b>${e.kind}</b><span>${esc(e.symbol ? '$' + e.symbol + ' / ' : '')}${esc(e.text)}</span></div>`,
        )
        .join('') || '<p>Waiting for the next observation.</p>';
}
document.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-scope]');
  if (pick) {
    scopeAddress = pick.dataset.scope;
    renderContent();
    paintTerminal();
  }
  if (e.target.closest('[data-terminal-pause]')) {
    terminalPaused = !terminalPaused;
    renderContent();
    paintTerminal();
  }
});
setInterval(paintTerminal, 400);

function quoteSpark(address) {
  const h = state.engine?.history?.[address] || [];
  if (h.length < 2) return '<small>Collecting quote history…</small>';
  const values = h.map((x) => x.price),
    min = Math.min(...values),
    span = Math.max(...values) - min;
  const pts = values
    .map(
      (p, i) =>
        `${(i / (values.length - 1)) * 160},${span ? 35 - ((p - min) / span) * 30 : 20}`,
    )
    .join(' ');
  return `<svg viewBox="0 0 160 40" role="img" aria-label="Last ${h.length} observed price samples" class="quote-spark"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
}
function activityDetails(t) {
  if (!t) return '';
  const a = state.activity?.find((a) => a.address === t.address);
  if (!a) return '';
  return `<div class="activity-detail">${quoteSpark(t.address)}<b>${a.verdict} / ${a.score === null ? 'UNKNOWN' : a.score + '/100 ACTIVITY'}</b>${a.checks.map((c) => `<div class="activity-check"><span>${c.pass === null ? '?' : c.pass ? '✓' : '×'} ${esc(c.name)}</span><small>${esc(c.detail)}</small></div>`).join('')}<p>Creator launches in this archive: ${a.creatorLaunches ?? 'unknown'}. Activity filters are not a safety verdict.</p></div>`;
}
function candidateBoard() {
  return `<div class="candidate-list">${
    (state.activity || [])
      .slice(0, 8)
      .map(
        (a) =>
          `<div><button data-scope="${esc(a.address)}">$${esc(a.symbol)}</button><b class="${a.verdict === 'WATCH' ? 'positive' : ''}">${a.verdict} ${a.score ?? '—'}</b>${quoteSpark(a.address)}<small>${esc(a.reason)}</small></div>`,
      )
      .join('') || '<p>Waiting for the first analysis cycle.</p>'
  }</div><div class="terminal-footnote">Ranked by four disclosed activity filters. 12-block confirmation lag. Requests target 1s; each batch contains up to 30 tokens. Source timestamps show actual latency.</div>`;
}
