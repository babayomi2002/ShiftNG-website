// Civic page. Reads data/civic/ from this site (rebuilt every night from
// the public projects in the app) and shows, by the address:
//   civic.html                         the states with projects
//   civic.html?state=Ekiti             the state's projects, by who pays
//   civic.html?state=Ekiti&lga=…       an LGA: in it, shared, statewide
//   civic.html?state=Ekiti&lga=…&ward= a ward: in it, all wards, ward not given
// The sections and their rules are the app's.
(function () {
  var C = Civic;
  var esc = C.esc;
  var PAGE = 20;
  var params = new URLSearchParams(location.search);
  var state = params.get('state');
  var lga = params.get('lga');
  var ward = params.get('ward');
  var main = document.getElementById('civic');
  var statusEl = document.getElementById('civic-status');
  var crumbs = document.getElementById('crumbs');
  var title = document.getElementById('civic-title');
  var stage = null;
  var data = null;
  var pageOf = {};
  var open = {};
  // Search words, money ranges (any number of them) and, where the site has
  // the database's public address (data/civic/config.json), the whole country.
  var query = '';
  var bands = {};
  var nationwide = false;
  var config = null;
  var BANDS = [
    ['u10m', 'Under ₦10m'], ['10m_50m', '₦10m–₦50m'], ['50m_100m', '₦50m–₦100m'], ['100m_500m', '₦100m–₦500m'],
    ['500m_1bn', '₦500m–₦1bn'], ['1bn_10bn', '₦1bn–₦10bn'], ['o10bn', '₦10bn and over'], ['none', 'No budget printed']
  ];

  // The same ranges as the app's (civic_band, step 35).
  function band(b) {
    if (b == null) return 'none';
    if (b < 1e7) return 'u10m';
    if (b < 5e7) return '10m_50m';
    if (b < 1e8) return '50m_100m';
    if (b < 5e8) return '100m_500m';
    if (b < 1e9) return '500m_1bn';
    if (b < 1e10) return '1bn_10bn';
    return 'o10bn';
  }

  function bandsOn() { return Object.keys(bands).filter(function (k) { return bands[k]; }); }

  // Every word must be found, in any order: in the name, description, LGA,
  // ward, or a place the project runs through.
  function matchesWords(c) {
    if (!query) return true;
    var text = [c.t, c.d, c.L, c.W].concat((c.pl || []).map(function (x) { return x[0] + ' ' + (x[1] || ''); }))
      .join(' ').toLowerCase();
    return query.toLowerCase().split(/\s+/).every(function (w) { return !w || text.indexOf(w) >= 0; });
  }

  function filtering() { return !!(query || bandsOn().length || stage || nationwide); }

  function link(q) {
    var p = new URLSearchParams();
    Object.keys(q).forEach(function (k) { if (q[k]) p.set(k, q[k]); });
    var s = p.toString();
    return 'civic.html' + (s ? '?' + s : '');
  }

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function setCrumbs() {
    var parts = ['<a href="civic.html">All states</a>'];
    if (state) parts.push(lga ? '<a href="' + esc(link({ state: state })) + '">' + esc(state) + '</a>' : esc(state));
    if (lga) parts.push(ward ? '<a href="' + esc(link({ state: state, lga: lga })) + '">' + esc(lga) + '</a>' : esc(lga));
    if (ward) parts.push(esc(ward));
    crumbs.innerHTML = parts.join(' <span aria-hidden="true">›</span> ');
  }

  var FEDERAL_HINT = 'From the 2026 Appropriation Act. Each project shows its full amount; one that names several places shows in each of them.';

  function sections() {
    if (state === 'Federal') {
      return [
        { key: 'multi', title: 'Shared by several states', hint: FEDERAL_HINT },
        { key: 'national', title: 'No place named', hint: "Lines of the Act that name no state, LGA or constituency, and whose agency's name gives no place either: national programmes, headquarters items and the like." }
      ];
    }
    if (!lga) {
      return [
        { key: 'state', title: state + ' State Government projects' },
        { key: 'lga', title: 'Local government projects' },
        { key: 'federal', title: 'Federal projects in ' + state, hint: FEDERAL_HINT }
      ];
    }
    if (!ward) {
      return [
        { key: 'here', title: 'In ' + lga },
        { key: 'shared', title: 'Shared with other LGAs', hint: 'Roads and other projects that run through more than one LGA. Each shows its full amount.' },
        { key: 'statewide', title: 'Statewide projects', collapsed: true },
        { key: 'federal', title: 'Federal projects in ' + lga, hint: FEDERAL_HINT }
      ];
    }
    return [
      { key: 'here', title: 'In ' + ward },
      { key: 'all_wards', title: 'Across all wards of ' + lga },
      { key: 'lga_no_ward', title: 'In ' + lga + ', ward not given', collapsed: true },
      { key: 'federal', title: 'Federal projects in ' + ward + ' or across ' + lga, hint: FEDERAL_HINT }
    ];
  }

  function placePicker() {
    if (!data.lgas.length) return '';
    if (!lga) {
      return '<label class="place-pick">Go to a local government<select id="pick">' +
        '<option value="">Choose an LGA…</option>' +
        data.lgas.map(function (l) { return '<option>' + esc(l.n) + '</option>'; }).join('') + '</select></label>';
    }
    var l = data.lgas.find(function (x) { return x.n === lga; });
    if (!l || !l.w.length) return '';
    return '<label class="place-pick">Go to a ward' + (ward ? ' of ' + esc(lga) : '') + '<select id="pick">' +
      '<option value="">Choose a ward…</option>' +
      l.w.map(function (w) { return '<option' + (w === ward ? ' selected' : '') + '>' + esc(w) + '</option>'; }).join('') +
      '</select></label>';
  }

  // Page numbers: the first, the last and two either side of the page shown
  // ("1 … 4 5 [6] 7 8 … 40"), with previous and next.
  function pager(key, page, count) {
    var pages = Math.ceil(count / PAGE);
    if (pages < 2) return '';
    var nums = [];
    for (var n = 1; n <= pages; n++) {
      if (n === 1 || n === pages || Math.abs(n - page) <= 2) nums.push(n);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    function btn(label, to, on, off) {
      return '<button type="button" class="page-btn" data-page="' + to + '" data-key="' + key + '"' +
        (on ? ' aria-current="page"' : '') + (off || on ? ' disabled' : '') + '>' + label + '</button>';
    }
    return '<nav class="pager" aria-label="Pages">' +
      '<p class="muted">' + ((page - 1) * PAGE + 1).toLocaleString() + '–' + Math.min(page * PAGE, count).toLocaleString() +
      ' of ' + count.toLocaleString() + '</p><div class="pager-row">' +
      btn('‹ Prev', page - 1, false, page <= 1) +
      nums.map(function (n) { return n === '…' ? '<span class="pager-gap">…</span>' : btn(n, n, n === page); }).join('') +
      btn('Next ›', page + 1, false, page >= pages) + '</div></nav>';
  }

  // The search box, the range and stage buttons: drawn once, so typing keeps
  // its place; their counts are refreshed by render().
  function controls() {
    return '<div class="civic-filters">' +
      '<input type="search" id="civic-search" class="civic-search" placeholder="Search projects: a town, “borehole”, “drainage”…" aria-label="Search projects">' +
      '<div class="chips">' +
      (config ? '<button type="button" class="chip" id="nationwide" aria-selected="false">Search all of Nigeria</button>' : '') +
      '<button type="button" class="chip" id="clear-all" hidden>Clear all</button></div>' +
      '<p class="filter-label">Amount (tap any number)</p><div class="chips" id="band-chips"></div>' +
      '<p class="filter-label">Stage</p><div class="chips" id="stage-chips"></div>' +
      '<p class="result-line" id="result-line"></p></div><div id="results"></div>';
  }

  function chipsHtml(pool) {
    var count = {};
    pool.forEach(function (c) { var k = band(c.b); count[k] = (count[k] || 0) + 1; });
    return {
      bands: BANDS.filter(function (b) { return count[b[0]] || bands[b[0]]; }).map(function (b) {
        return '<button type="button" class="chip" data-band="' + b[0] + '" aria-selected="' + !!bands[b[0]] + '">' +
          esc(b[1]) + ' (' + (count[b[0]] || 0).toLocaleString() + ')</button>';
      }).join(''),
      stages: '<button type="button" class="chip" data-stage="" aria-selected="' + (!stage) + '">All</button>' +
        C.STAGE_ORDER.map(function (s) {
          return '<button type="button" class="chip" data-stage="' + s + '" aria-selected="' + (stage === s) + '">' + esc(C.STAGE_LABEL[s]) + '</button>';
        }).join('')
    };
  }

  function render() {
    if (nationwide) return renderNationwide();
    var specs = sections();
    var placed = data.projects.filter(function (c) {
      return specs.some(function (s) { return C.inSection(c, s.key, lga, ward); });
    });
    // Range counts follow the words and stage, not the ranges themselves.
    var pool = placed.filter(function (c) { return (!stage || c.s === stage) && matchesWords(c); });
    var on = bandsOn();
    var shownPool = pool.filter(function (c) { return !on.length || on.indexOf(band(c.b)) >= 0; });
    var chips = chipsHtml(pool);
    document.getElementById('band-chips').innerHTML = chips.bands;
    document.getElementById('stage-chips').innerHTML = chips.stages;
    document.getElementById('clear-all').hidden = !filtering();
    document.getElementById('result-line').textContent = filtering()
      ? shownPool.length.toLocaleString() + ' project' + (shownPool.length === 1 ? ' matches' : 's match') + ' here' : '';
    var html = '';

    // A ward with nothing placed in it: say why, rather than show a bare page.
    if (ward && placed.length && !placed.some(function (c) {
      return C.inSection(c, 'here', lga, ward) || C.inSection(c, 'all_wards', lga, ward);
    })) {
      html += '<p class="muted">No project names this ward yet. The documents we have give the local government, not the ward, so ' +
        esc(lga) + "'s projects are listed below.</p>";
    }

    var any = false;
    specs.forEach(function (spec) {
      var items = shownPool.filter(function (c) { return C.inSection(c, spec.key, lga, ward); });
      if (!items.length) return;
      any = true;
      var total = items.reduce(function (n, c) { return n + (c.b || 0); }, 0);
      var isOpen = spec.collapsed ? !!open[spec.key] : true;
      var page = Math.min(pageOf[spec.key] || 1, Math.ceil(items.length / PAGE));
      html += '<section class="project-section" id="sec-' + spec.key + '">' +
        (spec.collapsed
          ? '<button type="button" class="section-toggle" data-section="' + spec.key + '" aria-expanded="' + isOpen + '">' +
            esc(spec.title) + ' (' + items.length.toLocaleString() + ') <span aria-hidden="true">' + (isOpen ? '▴' : '▾') + '</span></button>'
          : '<h2>' + esc(spec.title) + ' (' + items.length.toLocaleString() + ')</h2>') +
        (total > 0 ? '<p class="section-total">' + esc(C.naira(total)) + ' budgeted in total</p>' : '') +
        (spec.hint ? '<p class="section-hint">' + esc(spec.hint) + '</p>' : '');
      if (isOpen) {
        html += '<div class="project-list">' + items.slice((page - 1) * PAGE, page * PAGE).map(function (c) {
          return C.card(c, data.state);
        }).join('') + '</div>' + pager(spec.key, page, items.length);
      }
      html += '</section>';
    });
    if (!any) {
      html += '<p class="muted">' + (filtering() ? 'No projects match these filters. Try fewer words or more amounts, or tap Clear all.'
        : 'No projects recorded here yet.') + '</p>';
    }
    document.getElementById('results').innerHTML = html;
  }

  // The whole country, from the database (step 35), a page at a time.
  function rpc(name, body) {
    return fetch(config.url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: config.key, Authorization: 'Bearer ' + config.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  function asCard(p) {
    return { i: p.id, t: p.title, d: p.description, l: p.project_level, w: p.funded_by_name, s: p.stage,
      b: p.current_budget, p: p.paid_to_date, y: p.budget_year, src: p.last_source_title, pg: p.last_source_page,
      L: p.lga, W: p.ward, sec: p.sector, pl: [], st: p.state };
  }

  function renderNationwide() {
    var on = bandsOn();
    var page = pageOf.nationwide || 1;
    var words = query || null;
    var results = document.getElementById('results');
    results.innerHTML = '<p class="muted">Searching all of Nigeria…</p>';
    rpc('civic_band_counts', { p_state: null, p_stage: stage, p_query: words, p_nationwide: true })
      .then(function (rows) {
        var count = {};
        rows.forEach(function (r) { count[r.band] = r.projects; });
        var n = (on.length ? on : Object.keys(count)).reduce(function (s, k) { return s + (count[k] || 0); }, 0);
        document.getElementById('band-chips').innerHTML = BANDS.filter(function (b) { return count[b[0]] || bands[b[0]]; }).map(function (b) {
          return '<button type="button" class="chip" data-band="' + b[0] + '" aria-selected="' + !!bands[b[0]] + '">' +
            esc(b[1]) + ' (' + (count[b[0]] || 0).toLocaleString() + ')</button>';
        }).join('');
        document.getElementById('stage-chips').innerHTML = chipsHtml([]).stages;
        document.getElementById('clear-all').hidden = false;
        document.getElementById('result-line').textContent = n.toLocaleString() + ' project' + (n === 1 ? ' matches' : 's match') + ' across Nigeria';
        if (!n) { results.innerHTML = '<p class="muted">No projects match these filters. Try fewer words or more amounts, or tap Clear all.</p>'; return null; }
        return rpc('civic_projects', { p_state: null, p_stage: stage, p_query: words, p_bands: on.length ? on : null,
          p_nationwide: true, p_limit: PAGE, p_offset: (page - 1) * PAGE })
          .then(function (rows) {
            results.innerHTML = '<section class="project-section"><h2>Across Nigeria (' + n.toLocaleString() + ')</h2>' +
              '<div class="project-list">' + rows.map(function (p) { var c = asCard(p); return C.card(c, c.st); }).join('') +
              '</div>' + pager('nationwide', page, n) + '</section>';
          });
      })
      .catch(function () { results.innerHTML = '<p class="muted">The search could not be run. Check your connection and try again.</p>'; });
  }

  var typing = null;
  main.addEventListener('input', function (e) {
    if (e.target.id !== 'civic-search') return;
    clearTimeout(typing);
    typing = setTimeout(function () { query = e.target.value.trim(); pageOf = {}; render(); }, 300);
  });
  main.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-stage')) { stage = b.getAttribute('data-stage') || null; pageOf = {}; render(); }
    else if (b.hasAttribute('data-band')) { var k0 = b.getAttribute('data-band'); bands[k0] = !bands[k0]; pageOf = {}; render(); }
    else if (b.id === 'nationwide') {
      nationwide = !nationwide; pageOf = {};
      b.setAttribute('aria-selected', String(nationwide));
      b.textContent = nationwide ? 'Searching all of Nigeria' : 'Search all of Nigeria';
      render();
    } else if (b.id === 'clear-all') {
      query = ''; bands = {}; stage = null; pageOf = {};
      document.getElementById('civic-search').value = '';
      if (nationwide) { nationwide = false; var nb = document.getElementById('nationwide'); nb.setAttribute('aria-selected', 'false'); nb.textContent = 'Search all of Nigeria'; }
      render();
    } else if (b.hasAttribute('data-section')) { var k = b.getAttribute('data-section'); open[k] = !open[k]; render(); }
    else if (b.hasAttribute('data-page')) {
      var key = b.getAttribute('data-key');
      pageOf[key] = Number(b.getAttribute('data-page'));
      render();
      var sec = document.getElementById(key === 'nationwide' ? 'results' : 'sec-' + key);
      if (sec) sec.scrollIntoView({ block: 'start' });
    }
  });
  main.addEventListener('change', function (e) {
    if (e.target.id !== 'pick' || !e.target.value) return;
    location.href = lga ? link({ state: state, lga: lga, ward: e.target.value }) : link({ state: state, lga: e.target.value });
  });

  function showStates(index) {
    title.textContent = 'Public projects';
    var fed = index.states.find(function (s) { return s.state === 'Federal'; });
    var have = index.states.filter(function (s) { return s.state !== 'Federal'; }).map(function (s) {
      return '<a class="card state-card" href="' + esc(link({ state: s.state })) + '">' +
        '<h3>' + esc(s.state) + '</h3><p>' + s.projects + ' projects · ' + esc(C.naira(s.budget)) + ' budgeted</p></a>';
    }).join('');
    main.innerHTML = (fed ? '<a class="card state-card federal-card" href="' + esc(link({ state: 'Federal' })) + '">' +
        '<h3>Federal projects across Nigeria</h3><p>' + fed.projects + ' that name no place or several states · ' +
        esc(C.naira(fed.budget)) + '. The rest show on each state’s page.</p></a>' : '') +
      '<div class="grid">' + have + '</div>' +
      '<p class="muted small-note">More states will follow as we read their budget documents. Until then their pages stay empty rather than show figures we have not checked.</p>';
  }

  function showPlace() {
    var name = ward || lga || state;
    document.title = name + ' public projects: ShiftNG';
    title.textContent = ward ? ward + ' ward' : lga ? lga + ' Local Government' : state === 'Federal' ? 'Federal projects' : state + ' State';
    if (lga && !data.lgas.some(function (l) { return l.n === lga; })) {
      main.innerHTML = '<p class="muted">We could not find that local government in ' + esc(state) + '.</p>';
      return;
    }
    main.innerHTML = placePicker() + controls();
    render();
  }

  setCrumbs();
  // The database's public address and key, for the nationwide search; the
  // site works without it (the button is not shown).
  fetch('data/civic/config.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) { config = c && c.url && c.key ? c : null; })
    .catch(function () { config = null; })
    .then(function () { return fetch('data/civic/index.json'); })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (index) {
      if (index.builtAt) {
        document.getElementById('civic-updated').textContent = 'Updated ' + new Date(index.builtAt).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos'
        }) + ', Nigeria time.';
      }
      if (!state) { statusEl.textContent = ''; showStates(index); return null; }
      var entry = index.states.find(function (s) { return s.state === state; });
      if (!entry) {
        statusEl.textContent = '';
        title.textContent = state;
        main.innerHTML = '<p class="muted">We have not added ' + esc(state) + "'s projects yet. We add a state once we have read and checked its own budget documents.</p>";
        return null;
      }
      return fetch('data/civic/' + slug(state) + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    })
    .then(function (d) {
      if (!d) return;
      data = d;
      statusEl.textContent = '';
      showPlace();
    })
    .catch(function () { statusEl.textContent = 'The projects could not be loaded. Check your connection and try again.'; });
})();
