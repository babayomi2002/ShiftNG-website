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
  var shown = {};
  var open = {};

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

  function sections() {
    if (!lga) {
      return [
        { key: 'state', title: state + ' State Government projects' },
        { key: 'lga', title: 'Local government projects' }
      ];
    }
    if (!ward) {
      return [
        { key: 'here', title: 'In ' + lga },
        { key: 'shared', title: 'Shared with other LGAs', hint: 'Roads and other projects that run through more than one LGA. Each shows its full amount.' },
        { key: 'statewide', title: 'Statewide projects', collapsed: true }
      ];
    }
    return [
      { key: 'here', title: 'In ' + ward },
      { key: 'all_wards', title: 'Across all wards of ' + lga },
      { key: 'lga_no_ward', title: 'In ' + lga + ', ward not given', collapsed: true }
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

  function render() {
    var specs = sections();
    var pool = data.projects.filter(function (c) { return !stage || c.s === stage; });
    var all = data.projects.filter(function (c) {
      return specs.some(function (s) { return C.inSection(c, s.key, lga, ward); });
    });
    var html = placePicker();

    if (all.length) {
      html += '<div class="chips" role="tablist" aria-label="Stage">' +
        '<button type="button" class="chip" data-stage="" aria-selected="' + (!stage) + '">All</button>' +
        C.STAGE_ORDER.map(function (s) {
          return '<button type="button" class="chip" data-stage="' + s + '" aria-selected="' + (stage === s) + '">' + esc(C.STAGE_LABEL[s]) + '</button>';
        }).join('') + '</div>';
    }

    // A ward with nothing placed in it: say why, rather than show a bare page.
    if (ward && all.length && !all.some(function (c) {
      return C.inSection(c, 'here', lga, ward) || C.inSection(c, 'all_wards', lga, ward);
    })) {
      html += '<p class="muted">No project names this ward yet. The documents we have give the local government, not the ward, so ' +
        esc(lga) + "'s projects are listed below.</p>";
    }

    var any = false;
    specs.forEach(function (spec) {
      var items = pool.filter(function (c) { return C.inSection(c, spec.key, lga, ward); });
      if (!items.length) return;
      any = true;
      var total = items.reduce(function (n, c) { return n + (c.b || 0); }, 0);
      var isOpen = spec.collapsed ? !!open[spec.key] : true;
      var n = shown[spec.key] || PAGE;
      html += '<section class="project-section">' +
        (spec.collapsed
          ? '<button type="button" class="section-toggle" data-section="' + spec.key + '" aria-expanded="' + isOpen + '">' +
            esc(spec.title) + ' (' + items.length + ') <span aria-hidden="true">' + (isOpen ? '▴' : '▾') + '</span></button>'
          : '<h2>' + esc(spec.title) + ' (' + items.length + ')</h2>') +
        (total > 0 ? '<p class="section-total">' + esc(C.naira(total)) + ' budgeted in total</p>' : '') +
        (spec.hint ? '<p class="section-hint">' + esc(spec.hint) + '</p>' : '');
      if (isOpen) {
        html += '<div class="project-list">' + items.slice(0, n).map(function (c) { return C.card(c, data.state); }).join('') + '</div>';
        if (items.length > n) {
          html += '<button type="button" class="more" data-more="' + spec.key + '">Show more (' + (items.length - n) + ' left)</button>';
        }
      }
      html += '</section>';
    });
    if (!any) {
      html += '<p class="muted">' + (stage ? 'No projects at the "' + esc(C.STAGE_LABEL[stage]) + '" stage here.' : 'No projects recorded here yet.') + '</p>';
    }
    main.innerHTML = html;
  }

  main.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-stage')) { stage = b.getAttribute('data-stage') || null; shown = {}; render(); }
    else if (b.hasAttribute('data-section')) { var k = b.getAttribute('data-section'); open[k] = !open[k]; render(); }
    else if (b.hasAttribute('data-more')) { var m = b.getAttribute('data-more'); shown[m] = (shown[m] || PAGE) + PAGE; render(); }
  });
  main.addEventListener('change', function (e) {
    if (e.target.id !== 'pick' || !e.target.value) return;
    location.href = lga ? link({ state: state, lga: lga, ward: e.target.value }) : link({ state: state, lga: e.target.value });
  });

  function showStates(index) {
    title.textContent = 'Public projects';
    var have = index.states.map(function (s) {
      return '<a class="card state-card" href="' + esc(link({ state: s.state })) + '">' +
        '<h3>' + esc(s.state) + '</h3><p>' + s.projects + ' projects · ' + esc(C.naira(s.budget)) + ' budgeted</p></a>';
    }).join('');
    main.innerHTML = '<div class="grid">' + have + '</div>' +
      '<p class="muted small-note">More states will follow as we read their budget documents. Until then their pages stay empty rather than show figures we have not checked.</p>';
  }

  function showPlace() {
    var name = ward || lga || state;
    document.title = name + ' public projects: ShiftNG';
    title.textContent = ward ? ward + ' ward' : lga ? lga + ' Local Government' : state + ' State';
    if (lga && !data.lgas.some(function (l) { return l.n === lga; })) {
      main.innerHTML = '<p class="muted">We could not find that local government in ' + esc(state) + '.</p>';
      return;
    }
    render();
  }

  setCrumbs();
  fetch('data/civic/index.json')
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
