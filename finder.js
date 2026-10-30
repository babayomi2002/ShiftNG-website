// Polling-unit finder. Loads data/meta.json for the list of states, then
// one state's file (data/units/<code>.json) when a state is chosen. All
// files come from this site; nothing is fetched from anywhere else.
(function () {
  var OFF_CYCLE = ['Anambra', 'Bayelsa', 'Edo', 'Ekiti', 'Imo', 'Kogi', 'Ondo', 'Osun'];
  var FCT = 'FCT';

  var $ = function (id) { return document.getElementById(id); };
  var stateSel = $('state'), lgaSel = $('lga'), wardSel = $('ward'), search = $('search');
  var statusEl = $('status'), seatsEl = $('seats'), results = $('results');
  var current = null; // the loaded state's data

  // INEC writes many names in capitals; show them in ordinary case.
  function nice(s) {
    if (s === FCT) return 'Federal Capital Territory';
    if (s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/(^|[\s\/\-(,.'])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function option(value, text) {
    var o = document.createElement('option');
    o.value = value; o.textContent = text;
    return o;
  }
  function reset(sel, text) {
    sel.innerHTML = '';
    sel.appendChild(option('', text));
    sel.disabled = true;
  }

  function seatLine(label, value, missing) {
    return '<li><span class="seat-label">' + label + '</span><span class="seat-value' + (value ? '' : ' seat-missing') + '">' +
      esc(value ? nice(value) : missing) + '</span></li>';
  }

  // The seats a ward votes for, on each 2027 voting day.
  function showSeats(lga, ward) {
    var s = ward.s || {};
    var name = current.name;
    var isFct = name === FCT;
    var notYet = 'Not confirmed yet';
    var gov = isFct ? 'No governorship election in the FCT'
      : OFF_CYCLE.indexOf(name) >= 0 ? 'Not on 6 February 2027: ' + name + ' elects its governor on its own date'
      : name + ' State';
    var html = '<div class="card seats-card"><h2>' + esc(nice(ward.n)) + ' ward, ' + esc(nice(lga.n)) + '</h2>' +
      '<p class="muted">The seats every polling unit in this ward votes for.</p>' +
      '<h3>16 January 2027</h3><ul class="seat-list">' +
      seatLine('President', 'Federal Republic of Nigeria') +
      seatLine('Senate', s.senate, notYet) +
      seatLine('House of Representatives', s.reps, notYet) +
      '</ul><h3>6 February 2027</h3><ul class="seat-list">' +
      seatLine('Governor', isFct || OFF_CYCLE.indexOf(name) >= 0 ? '' : gov, gov) +
      (isFct ? '' : seatLine('State House of Assembly', s.assembly, notYet)) +
      '</ul></div>';
    seatsEl.innerHTML = html;
  }

  function unitCode(lga, ward, u) {
    return current.code + '-' + lga.c + '-' + ward.c + '-' + u[0];
  }

  function listUnits(rows, heading) {
    if (!rows.length) {
      results.innerHTML = '';
      return;
    }
    var html = '<h2>' + esc(heading) + '</h2><ol class="units">';
    rows.forEach(function (r) {
      html += '<li><span class="unit-name">' + esc(nice(r.u[1])) + '</span>' +
        '<span class="unit-meta">Code ' + esc(unitCode(r.lga, r.ward, r.u)) +
        (r.showPlace ? ' · ' + esc(nice(r.ward.n)) + ' ward, ' + esc(nice(r.lga.n)) : '') + '</span>' +
        (r.showPlace ? '<button type="button" class="link-button" data-l="' + r.lga.c + '" data-w="' + r.ward.c + '">See the seats here</button>' : '') +
        '</li>';
    });
    results.innerHTML = html + '</ol>';
  }

  function chooseWard() {
    var lga = current.lgas.find(function (l) { return l.c === lgaSel.value; });
    var ward = lga && lga.wards.find(function (w) { return w.c === wardSel.value; });
    if (!ward) { seatsEl.innerHTML = ''; results.innerHTML = ''; return; }
    showSeats(lga, ward);
    listUnits(ward.units.map(function (u) { return { lga: lga, ward: ward, u: u }; }),
      ward.units.length + ' polling unit' + (ward.units.length === 1 ? '' : 's') + ' in this ward');
    statusEl.textContent = '';
  }

  function chooseLga() {
    reset(wardSel, 'Choose a ward');
    seatsEl.innerHTML = ''; results.innerHTML = '';
    var lga = current && current.lgas.find(function (l) { return l.c === lgaSel.value; });
    if (!lga) return;
    lga.wards.slice().sort(function (a, b) { return a.n.localeCompare(b.n); }).forEach(function (w) {
      wardSel.appendChild(option(w.c, nice(w.n)));
    });
    wardSel.disabled = false;
  }

  function loadState() {
    reset(lgaSel, 'Choose a local government');
    reset(wardSel, 'Choose a local government first');
    seatsEl.innerHTML = ''; results.innerHTML = ''; search.value = ''; search.disabled = true;
    current = null;
    if (!stateSel.value) return;
    statusEl.textContent = 'Loading ' + stateSel.options[stateSel.selectedIndex].text + '…';
    fetch('data/units/' + stateSel.value + '.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        current = data;
        data.lgas.slice().sort(function (a, b) { return a.n.localeCompare(b.n); }).forEach(function (l) {
          lgaSel.appendChild(option(l.c, nice(l.n)));
        });
        lgaSel.disabled = false;
        search.disabled = false;
        var n = 0;
        data.lgas.forEach(function (l) { l.wards.forEach(function (w) { n += w.units.length; }); });
        statusEl.textContent = n.toLocaleString('en-NG') + ' polling units in ' + nice(data.name) + '.';
      })
      .catch(function () { statusEl.textContent = 'That state could not be loaded. Check your connection and try again.'; });
  }

  function runSearch() {
    var q = search.value.trim().toLowerCase();
    seatsEl.innerHTML = '';
    if (!current || q.length < 3) {
      results.innerHTML = '';
      statusEl.textContent = q.length ? 'Type at least 3 letters or numbers.' : '';
      return;
    }
    var digits = q.replace(/[^0-9]/g, '');
    var codeLike = /^[0-9\s\-\/]+$/.test(q) && digits.length >= 4;
    var rows = [];
    current.lgas.forEach(function (l) {
      l.wards.forEach(function (w) {
        w.units.forEach(function (u) {
          var code = (current.code + l.c + w.c + u[0]);
          var hit = codeLike ? code.indexOf(digits) === 0 || (l.c + w.c + u[0]).indexOf(digits) === 0
            : u[1].toLowerCase().indexOf(q) >= 0;
          if (hit && rows.length < 60) rows.push({ lga: l, ward: w, u: u, showPlace: true });
        });
      });
    });
    statusEl.textContent = rows.length ? '' : 'No polling unit in ' + nice(current.name) + ' matches that.';
    listUnits(rows, rows.length === 60 ? 'First 60 matches: add more to narrow it down' : rows.length + ' match' + (rows.length === 1 ? '' : 'es'));
  }

  // "See the seats here" on a search result jumps to that ward.
  results.addEventListener('click', function (e) {
    var b = e.target.closest('.link-button');
    if (!b) return;
    lgaSel.value = b.getAttribute('data-l');
    chooseLga();
    wardSel.value = b.getAttribute('data-w');
    search.value = '';
    chooseWard();
    seatsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  stateSel.addEventListener('change', loadState);
  lgaSel.addEventListener('change', chooseLga);
  wardSel.addEventListener('change', chooseWard);
  var timer;
  search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(runSearch, 200); });

  fetch('data/meta.json')
    .then(function (r) { return r.json(); })
    .then(function (meta) {
      meta.states.forEach(function (s) { stateSel.appendChild(option(s.code, nice(s.name))); });
      var d = new Date(meta.builtAt);
      $('built').textContent = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });
    })
    .catch(function () { statusEl.textContent = 'The list of states could not be loaded. Check your connection and try again.'; });
})();
