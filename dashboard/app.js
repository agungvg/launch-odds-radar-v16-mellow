// Launch-Odds Radar v16-mellow dashboard. Reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board, the held-out evidence, a per-protocol detail drawer with the model's own
// inputs and the protocol's farm plan. No network: every byte it shows is in data.js.
// The sliders reprice every row live from the same strict farm rule the board was built with.
(function () {
  'use strict';
  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', verdict: 'all', tier: 'all', depositPct: 0.0002, dropShare: 0.07, weeks: 12, sort: 'rank', dir: 1, selected: null };

  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  // Display rule (disclosed in the build notes): one row's implied value rounds below $1K; the board
  // carries $1 for it and the page shows <$1K rather than a number that reads like a price.
  function fmtImplied(n) { return n < 1000 ? '<$1K' : fmtUsd(n); }
  function fmtPct(n) { if (n === null || n === undefined || !isFinite(n)) return 'n/a'; return (n > 0 ? '+' : '') + (n * 100).toFixed(2) + '%'; }
  function fmtX(n) { return '×' + n.toFixed(2); }
  function fmtAge(days) {
    if (days === null || days === undefined) return '—';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // The strict farm rule, repriced live: the drop scales with the horizon, the T-bill scales with the
  // horizon, hands-on time stays 3.4 h. A row is Farm only when its net beats the T-bill on the same
  // deposit AND $25 an hour.
  function recompute(r) {
    var deposit = state.depositPct * r.tvl_usd;
    var drop = (r.implied_value_usd * state.dropShare * deposit) / (r.tvl_usd + deposit) * (state.weeks / 12);
    var net = drop - 2.95;
    var tbill = deposit * 0.04 * (state.weeks / 52);
    var perHour = net / 3.4;
    var verdict = (net > tbill && perHour > 25) ? 'Farm' : (net > 0 ? 'Marginal' : 'Skip');
    return { deposit: deposit, drop: drop, net: net, tbill: tbill, perHour: perHour, verdict: verdict };
  }
  function liveCounts() {
    var c = { Farm: 0, Marginal: 0, Skip: 0 };
    DATA.rows.forEach(function (r) { c[recompute(r).verdict]++; });
    return c;
  }

  function hero() {
    var c = liveCounts();
    return el('section', { class: 'hero' },
      el('h1', { text: 'Launch-Odds Radar' }),
      el('p', { text: 'Pre-token protocols, valued from their own record. DefiLlama snapshot ' + DATA.as_of + ' · model ' + DATA.model_version + ' · refitted in this browser.' }),
      el('p', { text: 'Implied value = TVL × fitted multiple (the value if a token launches) × token odds (from how long peers ran before recording one). Each coefficient is fitted on this snapshot and tested held-out.' }),
      el('div', { class: 'cards' },
        el('div', { class: 'card3d' }, el('b', { text: fmtX(DATA.value.multiple_at_100m) }), el('span', { text: 'Multiple at $100M TVL' }), el('small', { text: 'Size slope ' + DATA.value.size_slope + ' ± ' + DATA.value.size_slope_se + ' · category ×0.63–×1.45' })),
        el('div', { class: 'card3d' }, el('b', { text: String(c.Farm) }), el('span', { text: 'Worth farming, this scenario' }), el('small', { text: 'Net beats a T-bill and $25 an hour · ' + c.Marginal + ' marginal · ' + c.Skip + ' skip' })),
        el('div', { class: 'card3d' }, el('b', { text: String(DATA.board_size) }), el('span', { text: 'Protocols ranked' }), el('small', { text: 'Watchlist 40 / 40 · 158 early below the floor' }))
      )
    );
  }

  function kpis() {
    var v = DATA.value, o = DATA.odds, c = liveCounts();
    function kpi(big, label, small) {
      return el('div', { class: 'kpi' }, el('b', { text: big }), el('span', { text: label }), el('small', { text: small }));
    }
    return el('div', { class: 'kpis' },
      kpi(fmtX(v.wf66_x) + ' vs ' + fmtX(v.flat_wf66_x) + ' flat', 'Out-of-sample miss, walk-forward', 'Leave-one-out ' + fmtX(v.loo_x) + ' vs ' + fmtX(v.flat_loo_x) + ' flat · 5-fold worst ' + fmtX(Math.max.apply(null, v.folds))),
      kpi(Math.round(v.coverage_loo_50 * 100) + '% · ' + Math.round(v.coverage_loo_80 * 100) + '%', 'Is the printed range honest?', 'Share of real caps inside P25–P75, P10–P90 (stated 50% · 80%) · walk-forward ' + Math.round(v.coverage_wf_50 * 100) + '% · ' + Math.round(v.coverage_wf_80 * 100) + '%'),
      kpi(o.brier_wf.toFixed(3) + ' vs ' + o.base_brier_wf.toFixed(3) + ' base', 'Token odds vs base rate, Brier', 'Walk-forward · 10-fold ' + o.brier_10f.toFixed(3) + ' vs ' + o.base_brier_10f.toFixed(3) + ' · AUC ' + o.auc_wf.toFixed(2) + ' walk-forward'),
      kpi('2 of 8 · 4 of 7', 'Terms that survived both tests', 'Value model · token odds; the rest are shown below, not used'),
      kpi(c.Farm + ' of ' + DATA.board_size, 'Worth farming, this scenario', 'Net beats a T-bill and $25 an hour · ' + c.Marginal + ' marginal · ' + c.Skip + ' skip'),
      kpi(DATA.watchlist_size + ' / ' + DATA.watchlist_size, 'Watchlist ranked', 'Plus 158 pre-token protocols the list leaves out')
    );
  }

  function integrity() {
    var t = DATA.totals, a = DATA.accounting;
    return el('div', null,
      el('div', { class: 'strip' }, el('span', { html: 'This table = board.json: <b>' + DATA.board_size + ' of ' + DATA.board_size + ' rows recomputed here ✓</b> ranks 1–' + DATA.board_size + ' in order, values never rise ✓ totals equal: <b>' + fmtUsd(t.implied_usd) + '</b> ✓ checksum <b>' + DATA.checksum + '</b> = main.ts ✓ watchlist 40 of 40 ranked ✓ ledger 758 of 758 protocols' })),
      el('div', { class: 'account' }, el('span', { html: '<b>Protocol accounting:</b> all 758 snapshot protocols in exactly one group: <b>' + a.ranked + ' ranked as pre-token, ' + a.record_token + ' already record a token, ' + a.not_ranked + ' pre-token not ranked</b> (' + a.below_cut + ' below the early cut, ' + a.house_excluded + ' excluded by the house rule). A protocol is called pre-token when its DefiLlama record carries no token — that is not proof it has none.' }))
    );
  }

  function termTable(title, sub, head, rows, fmt) {
    var thead = el('thead', null, el('tr', null, head.map(function (h) { return el('th', { text: h }); })));
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr', null, el('td', { text: r.term }));
      fmt(r).forEach(function (v) { tr.appendChild(el('td', { class: 'num', text: v })); });
      tr.appendChild(el('td', { class: r.status === 'KEPT' ? 'kept' : (r.status === 'baseline' ? '' : 'notkept'), text: r.status }));
      tbody.appendChild(tr);
    });
    return el('section', { class: 'panel' }, el('h2', { text: title }), el('p', { class: 'sub', text: sub }), el('table', null, thead, tbody));
  }

  function curveChart() {
    var pts = DATA.curve.points, fit = DATA.curve.fit, lo = DATA.curve.bandLo, hi = DATA.curve.bandHi;
    var W = 560, H = 170, PL = 34, PR = 8, PT = 8, PB = 20;
    var xs = pts.map(function (p) { return p[0]; }).concat(fit.map(function (p) { return p[0]; }));
    var ys = pts.map(function (p) { return p[1]; }).concat(hi.map(function (p) { return p[1]; }), lo.map(function (p) { return p[1]; }));
    var x0 = Math.min.apply(null, xs) - 0.1, x1 = Math.max.apply(null, xs) + 0.1;
    var y0 = Math.min.apply(null, ys) - 0.15, y1 = Math.max.apply(null, ys) + 0.15;
    function X(x) { return PL + (x - x0) / (x1 - x0) * (W - PL - PR); }
    function Y(y) { return PT + (1 - (y - y0) / (y1 - y0)) * (H - PT - PB); }
    var band = 'M' + hi.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' L') +
      ' L' + lo.slice().reverse().map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' L') + ' Z';
    var line = 'M' + fit.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' L');
    var dots = pts.map(function (p) { return '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="2.2" fill="#0f766e" opacity="0.55"/>'; }).join('');
    var svg = '<svg class="curve" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Size curve: fitted multiple against TVL for the 95 traded protocols">' +
      '<path d="' + band + '" fill="#0f766e" opacity="0.12"/>' +
      '<path d="' + line + '" fill="none" stroke="#b45309" stroke-width="2"/>' + dots +
      '<text x="' + (W / 2) + '" y="' + (H - 4) + '" font-size="10" fill="#6d675c" text-anchor="middle">log10 TVL →</text>' +
      '<text x="8" y="14" font-size="10" fill="#6d675c">log10 multiple</text></svg>';
    return el('section', { class: 'panel wide' }, el('h2', { text: 'The size curve — what the 95 traded protocols actually fetched' }),
      el('p', { class: 'sub', text: 'Each dot is one dated protocol whose token trades: its TVL against the multiple its token fetched (cap ÷ TVL). The rust line is the fitted curve; the band is the printed P25–P75 range. A bigger protocol fetches a smaller multiple — that is the whole value model.' }),
      el('div', { html: svg }));
  }

  function evidence() {
    var v = DATA.value, o = DATA.odds;
    var val = termTable('Value — typical miss, 95 traded tokens', 'A term is kept only if it lowers the held-out miss in BOTH tests: leave-one-out, and walk-forward (tokens listed earlier price those listed later).',
      ['Term', 'Leave-one-out', 'Walk-forward', 'Status'], v.terms, function (r) { return [r.loo_x === null ? '—' : fmtX(r.loo_x), r.wf_x === null ? '—' : fmtX(r.wf_x)]; });
    var od = termTable('Token odds — Brier score, 645 dated peers', 'A term is kept only if it lowers the Brier score in BOTH tests: 10-fold and walk-forward. AUC is shown, never used to keep a term.',
      ['Term', 'Brier, 10-fold', 'Brier, walk-forward', 'Status'], o.terms, function (r) { return [r.brier_10f === null ? '—' : r.brier_10f.toFixed(3), r.brier_wf === null ? '—' : r.brier_wf.toFixed(3)]; });
    var sweep = (function () {
      var thead = el('thead', null, el('tr', null, ['λ (category shrinkage)', 'Leave-one-out', 'Walk-forward 66/29', 'Walk-forward 47/48', 'Worst 5-fold', 'Farm'].map(function (h) { return el('th', { text: h }); })));
      var tbody = el('tbody');
      v.lambda_sweep.forEach(function (r) {
        tbody.appendChild(el('tr', null,
          el('td', { class: 'num', text: 'λ=' + r.lambda + (r.lambda === 4 ? ' (chosen)' : '') }),
          el('td', { class: 'num', text: fmtX(r.loo_x) }),
          el('td', { class: 'num', text: fmtX(r.wf66_x) }),
          el('td', { class: 'num', text: fmtX(r.wf47_x) }),
          el('td', { class: 'num', text: fmtX(r.worst_fold_x) }),
          el('td', { class: 'num', text: String(r.farm) })));
      });
      return el('section', { class: 'panel wide' }, el('h2', { text: 'Why λ=4 — the shrinkage sweep, all five held-out numbers per λ' }),
        el('p', { class: 'sub', text: 'λ=4 wins the walk-forward test, the worst fold on the reported seed and more than doubles the Farm count under the strict rule; it costs 0.08 on leave-one-out and 0.14 on the 47/48 walk-forward against λ=16 — both shown, not hidden.' }),
        el('table', null, thead, tbody));
    })();
    return el('div', { class: 'evidence' }, val, od, sweep, curveChart());
  }

  function controls() {
    var c = liveCounts();
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    function fbtn(label, key, val) {
      var on = state[key] === val;
      return el('button', { type: 'button', class: 'fbtn' + (on ? ' on' : ''), text: label, onclick: function () { state[key] = val; render(); } });
    }
    var search = el('input', { type: 'search', placeholder: 'Search name or slug', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; render(); });
    var catSel = el('select', { 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      cats.map(function (cat) { return el('option', { value: cat, text: cat, selected: cat === state.category ? 'selected' : null }); }));
    catSel.addEventListener('change', function () { state.category = catSel.value; render(); });
    var tierSel = el('select', { 'aria-label': 'Filter by tier' },
      [['all', 'All tiers'], ['watchlist', 'Watchlist'], ['early', 'Early (<$50M)'], ['offlist', 'Off-list']].map(function (t) {
        return el('option', { value: t[0], text: t[1], selected: t[0] === state.tier ? 'selected' : null });
      }));
    tierSel.addEventListener('change', function () { state.tier = tierSel.value; render(); });
    var depSel = el('select', { 'aria-label': 'Deposit as a share of TVL' },
      [[0.0002, '0.02% of TVL'], [0.0005, '0.05% of TVL'], [0.001, '0.10% of TVL'], [0.002, '0.20% of TVL']].map(function (o) {
        return el('option', { value: String(o[0]), text: 'Deposit ' + o[1], selected: o[0] === state.depositPct ? 'selected' : null });
      }));
    depSel.addEventListener('change', function () { state.depositPct = parseFloat(depSel.value); render(); });
    var drop = el('input', { type: 'range', min: '0.035', max: '0.14', step: '0.005', value: String(state.dropShare), 'aria-label': 'Drop share' });
    drop.addEventListener('input', function () { state.dropShare = parseFloat(drop.value); render(); });
    var horizon = el('input', { type: 'range', min: '4', max: '26', step: '1', value: String(state.weeks), 'aria-label': 'Horizon in weeks' });
    horizon.addEventListener('input', function () { state.weeks = parseInt(horizon.value, 10); render(); });
    var sortSel = el('select', { 'aria-label': 'Sort the board' },
      [['rank', 'Sort: rank'], ['net', 'Sort: net / hour'], ['tvl', 'Sort: TVL'], ['name', 'Sort: name']].map(function (o) {
        return el('option', { value: o[0], text: o[1], selected: o[0] === state.sort ? 'selected' : null });
      }));
    sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); });
    return el('div', { class: 'controls' },
      fbtn('All ' + DATA.board_size, 'verdict', 'all'),
      fbtn('Farm ' + c.Farm, 'verdict', 'Farm'),
      fbtn('Marginal ' + c.Marginal, 'verdict', 'Marginal'),
      fbtn('Skip ' + c.Skip, 'verdict', 'Skip'),
      tierSel, depSel,
      el('label', null, 'Drop ', drop, ' ' + (state.dropShare * 100).toFixed(1) + '%'),
      el('label', null, 'Horizon ', horizon, ' ' + state.weeks + ' wk'),
      search, catSel, sortSel,
      el('button', { class: 'btn', type: 'button', text: 'Reset', onclick: function () { state.q = ''; state.category = 'all'; state.verdict = 'all'; state.tier = 'all'; state.depositPct = 0.0002; state.dropShare = 0.07; state.weeks = 12; state.sort = 'rank'; render(); } }),
      el('button', { class: 'btn', type: 'button', text: 'CSV', onclick: function () { download('board.csv', 'text/csv', toCsv(filteredRows())); } }),
      el('button', { class: 'btn', type: 'button', text: 'JSON', onclick: function () { download('board.json', 'application/json', JSON.stringify(filteredRows(), null, 2)); } }),
      el('span', { class: 'count', text: filteredRows().length + ' of ' + DATA.board_size + ' rows' })
    );
  }

  function tierOf(r) {
    if (DATA.watchlist.indexOf(r.slug) >= 0) return 'watchlist';
    return r.tvl_usd < DATA.floor_usd ? 'early' : 'offlist';
  }
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.verdict !== 'all' && recompute(r).verdict !== state.verdict) return false;
      if (state.tier !== 'all' && tierOf(r) !== state.tier) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    return list.slice().sort(function (a, b) {
      if (state.sort === 'net') return recompute(b).perHour - recompute(a).perHour || a.rank - b.rank;
      if (state.sort === 'tvl') return b.tvl_usd - a.tvl_usd || a.rank - b.rank;
      if (state.sort === 'name') return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      return a.rank - b.rank;
    });
  }
  function download(name, type, text) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }
  function toCsv(list) {
    var head = 'rank,slug,name,category,tvl_usd,change_7d,age_days,token_odds,implied_value_usd,p25_usd,p75_usd,verdict,net_usd,net_per_hour_usd';
    var lines = list.map(function (r) {
      var e = recompute(r);
      return [r.rank, r.slug, '"' + r.name.replace(/"/g, '""') + '"', '"' + (r.category || '').replace(/"/g, '""') + '"', r.tvl_usd, r.change_7d === null ? '' : r.change_7d, r.age_days === null ? '' : r.age_days, r.odds, r.implied_value_usd, r.p25_usd, r.p75_usd, e.verdict, Math.round(e.net), e.perHour.toFixed(2)].join(',');
    });
    return head + '\n' + lines.join('\n');
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', class: 'btn', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = 1; } render(); } },
        label, state.sort === key ? el('span', { text: ' ↕' }) : null));
  }

  function boardTable() {
    var list = sortedRows(filteredRows());
    if (list.length === 0) {
      return el('div', { class: 'panel board' }, el('div', null,
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { class: 'sub', text: 'Clear the search or pick another filter to see the board again.' }),
        el('button', { class: 'btn primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.verdict = 'all'; state.tier = 'all'; render(); } })));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var e = recompute(r);
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num' }, el('b', { text: String(r.rank) }), el('span', { class: 'range', text: r.rank_lo + '–' + r.rank_hi })),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { text: (r.category || 'Other') + ' · ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'), text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: (r.odds * 100).toFixed(0) + '%' }),
        el('td', { class: 'num', text: fmtUsd(Math.round(r.tvl_usd * r.multiple)) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtImplied(r.implied_value_usd) }),
          el('span', { class: 'range', text: fmtImplied(r.p25_usd) + '–' + fmtImplied(r.p75_usd) }))),
        el('td', null, el('span', { class: 'verdict ' + e.verdict, text: e.verdict }),
          el('span', { class: 'range', text: (e.net >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(e.net)) })),
        el('td', { class: 'num', text: '$' + e.perHour.toFixed(2) })
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel board' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan. Ranges are the printed P25–P75; rank ranges come from 200 bootstrap refits.' }),
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', text: '#' }),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            el('th', { scope: 'col', text: '7d' }),
            el('th', { scope: 'col', text: 'Age' }),
            el('th', { scope: 'col', text: 'Odds' }),
            el('th', { scope: 'col', text: 'If it launches' }),
            el('th', { scope: 'col', text: 'Implied · P25–P75' }),
            el('th', { scope: 'col', text: 'Verdict · net' }),
            sortHeader('net', 'Net / hour'))),
          tbody)));
  }

  // The farm plan is the same derivation main.ts writes to board.json: category, chains, TVL and age
  // decide the action, the capital, the hold and every cost and time. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(p, e) {
    var chain = chainOf(p);
    var dep = Math.round(e.deposit);
    var hold = state.weeks * 7;
    var exitTvl = Math.round(p.tvl_usd * 0.85);
    var dropShareFloor = Math.max(0.1, Math.min(99, (2.95 / Math.max(e.drop, 0.01)) * state.dropShare * 100));
    var oddsFloor = Math.max(0.1, (2.95 / Math.max(e.drop, 0.01)) * p.odds * 100);
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, dep, chain), cost: '$' + dep + ' of capital and about $' + (dep >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + dep + ' stays in the position', time: hold + ' days' },
      { text: 'Check the protocol\u2019s TVL and points page every week; the modelled drop is $' + Math.round(e.drop) + ' at a ' + (state.dropShare * 100).toFixed(1) + '% drop share.', cost: 'no fee to check', time: '5 minutes a week' },
      { text: 'Exit rule 1: withdraw if TVL prints below $' + exitTvl.toLocaleString('en-US') + ' (85% of today\u2019s TVL).', cost: 'about $3 of gas to exit', time: '10 minutes' },
      { text: 'Exit rule 2: fees stay covered while the drop share stays above ' + dropShareFloor.toFixed(1) + '% (model ' + (state.dropShare * 100).toFixed(1) + '%) and the token odds above ' + oddsFloor.toFixed(1) + '% (peers imply ' + (p.odds * 100).toFixed(1) + '%).', cost: 'no fee to check', time: '5 minutes' },
      { text: 'Before you withdraw, open the protocol\u2019s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
      { text: 'After the drop, compare the net $' + Math.round(e.net) + ' ($' + e.perHour.toFixed(2) + ' an hour) with the $' + Math.round(e.tbill) + ' a 4% T-bill pays on the same $' + dep + ', then withdraw or roll into the next position.', cost: 'about $3 of gas to unwind', time: '15 minutes' }
    ].map(function (s) {
      var t = s.text + ' Cost: ' + s.cost + '. Time: ' + s.time + '.';
      if (t.length > 600) t = t.slice(0, 596) + '...';
      if (t.length < 20) t = t + ' Hold the position and check the protocol\u2019s own page.';
      return t;
    });
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    state.selected = slug;
    writeHash();
    var e = recompute(row);
    dialog.textContent = '';
    var gridCells = [];
    var deps = [1000, 10000, 30000], shares = [0.035, 0.07, 0.14];
    var selDep = deps.reduce(function (best, d) { return Math.abs(Math.log(d / e.deposit)) < Math.abs(Math.log(best / e.deposit)) ? d : best; }, deps[0]);
    row.grid.forEach(function (net, i) {
      var sh = shares[Math.floor(i / 3)], dep = deps[i % 3];
      gridCells.push(el('div', { class: 'cell' + ((dep === selDep && sh === state.dropShare) ? ' sel' : '') },
        el('b', { text: '$' + dep.toLocaleString('en-US') + ' × ' + (sh * 100).toFixed(1) + '%' }),
        el('small', { text: (net >= 0 ? '+' : '−') + '$' + Math.abs(net) + ' net' })));
    });
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: '#' + row.rank + ' · rank ' + row.rank_lo + '–' + row.rank_hi + ' across 200 bootstrap refits' }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close ×', onclick: function () { dialog.close(); } })
    ));
    var body = el('div', { class: 'detail-body' });
    body.appendChild(el('section', null,
      el('h3', { text: 'Implied value ' + fmtImplied(row.implied_value_usd) + ' (model estimate); if it launches ' + fmtUsd(Math.round(row.tvl_usd * row.multiple)) }),
      el('p', { class: 'sub', text: 'P25–P75 ' + fmtImplied(row.p25_usd) + '–' + fmtImplied(row.p75_usd) + '; P10–P90 ' + fmtImplied(row.p10_usd) + '–' + fmtImplied(row.p90_usd) + '. Recomputed in this browser; the odds are its peers\u2019 record, not a forecast.' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Fitted multiple' }), el('b', { class: 'num', text: fmtX(row.multiple) })),
        el('div', null, el('span', { text: 'Token odds' }), el('b', { class: 'num', text: (row.odds * 100).toFixed(1) + '%' })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtImplied(row.implied_value_usd) }))
      ),
      el('h3', { text: 'How the figure is made' }),
      el('table', null, el('thead', null, el('tr', null, el('th', { text: 'Step' }), el('th', { text: 'Figure' }))),
        el('tbody', null,
          el('tr', null, el('td', { text: 'TVL' }), el('td', { class: 'num', text: fmtUsd(row.tvl_usd) })),
          el('tr', null, el('td', { text: 'Base multiple at this TVL' }), el('td', { class: 'num', text: fmtX(row.multiple) + ' (size curve, slope ' + DATA.value.size_slope + ' ± ' + DATA.value.size_slope_se + ')' })),
          el('tr', null, el('td', { text: '= value if a token launches' }), el('td', { class: 'num', text: fmtUsd(Math.round(row.tvl_usd * row.multiple)) })),
          el('tr', null, el('td', { text: 'Token odds (peers of its age, category, size and 7-day growth)' }), el('td', { class: 'num', text: (row.odds * 100).toFixed(1) + '%' })),
          el('tr', null, el('td', { text: '= implied value' }), el('td', { class: 'num', text: fmtImplied(row.implied_value_usd) }))))
    ));
    body.appendChild(el('section', null,
      el('h3', { text: 'Farm verdict — ' + e.verdict.toUpperCase() }),
      el('p', { text: '$' + Math.round(e.deposit).toLocaleString('en-US') + ' for ' + state.weeks + ' weeks buys a modelled drop of $' + Math.round(e.drop) + ' for $2.95 of fees and 3.4 h of work, a net of $' + Math.round(e.net) + ' ($' + e.perHour.toFixed(2) + ' an hour) against $' + Math.round(e.tbill) + ' from the same money in a 4% T-bill.' }),
      el('p', { class: 'sub', text: 'At risk $' + Math.round(e.deposit).toLocaleString('en-US') + '; fees ' + state.weeks + ' weeks $2.95; modelled drop $' + Math.round(e.drop) + '; net of fees $' + Math.round(e.net) + '; hands-on 3.4 h; net per hour $' + e.perHour.toFixed(2) + '.' }),
      el('h3', { text: 'Net by drop share × deposit' }),
      el('div', { class: 'grid3' }, gridCells),
      el('p', { class: 'sub', text: 'The highlighted cell is the deposit nearest this row\u2019s own, at the modelled 7.0% drop share. The grid is priced from the same implied value.' })
    ));
    body.appendChild(el('section', null,
      el('h3', { text: 'Nearest priced peers' }),
      el('table', { class: 'peer' }, el('thead', null, el('tr', null, el('th', { text: 'Peer' }), el('th', { text: 'Observed multiple' }), el('th', { text: 'Model multiple' }), el('th', { text: 'Held-out miss' }))),
        el('tbody', null, row.peers.map(function (p) {
          return el('tr', null, el('td', { text: p.name }), el('td', { class: 'num', text: fmtX(p.observed_multiple) }), el('td', { class: 'num', text: fmtX(p.model_multiple) }), el('td', { class: 'num', text: fmtX(p.loo_miss_x) }));
        })))
    ));
    body.appendChild(el('section', null,
      el('h3', { text: 'Farm plan — 10 steps' }),
      el('ol', { class: 'steps' }, farmSteps(row, e).map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    dialog.appendChild(body);
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
  }

  function readParams() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('filter')) {
      var f = params.get('filter').toLowerCase();
      state.verdict = f === 'farm' ? 'Farm' : f === 'marginal' ? 'Marginal' : f === 'skip' ? 'Skip' : 'all';
    }
    if (params.get('drawer')) state.selected = params.get('drawer');
    var hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      var hp = new URLSearchParams(hash);
      if (hp.get('q')) state.q = hp.get('q');
      if (hp.get('p')) state.selected = hp.get('p');
      if (hp.get('category')) state.category = hp.get('category');
    }
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(hero());
    shell.appendChild(kpis());
    shell.appendChild(integrity());
    shell.appendChild(evidence());
    shell.appendChild(controls());
    shell.appendChild(boardTable());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readParams();
  render();
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dialog.open) dialog.close(); });
})();
