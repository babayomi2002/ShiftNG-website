// Project page (project.html?id=…). Reads data/civic/p/<id>.json, built
// every night from the app. Shows the figures with their sources, every
// document read for the project, how many residents say what they see, and
// the offices responsible. Reports themselves are made in the app.
(function () {
  var C = Civic;
  var esc = C.esc;
  var main = document.getElementById('project');
  var statusEl = document.getElementById('project-status');
  var id = new URLSearchParams(location.search).get('id') || '';

  var BASIS = {
    location_code: "the state's location code",
    named_ward: 'named in the project',
    all_wards: 'all wards of the LGA',
    named_in_text: 'from the project description',
    resident_report: 'reported by residents',
    admin: 'added by ShiftNG'
  };
  var KIND = { approved_budget: 'Approved budget', quarterly_report: 'Budget report', audit: 'Audit', sample: 'Sample data' };

  function placeText(p, state) {
    if (!p.lga) return state + ' (statewide)';
    if (p.role === 'all_wards') return 'All wards of ' + p.lga;
    return [p.ward, p.lga].filter(Boolean).join(', ');
  }

  function figures(h) {
    var parts = [];
    if (h.kind === 'approved_budget') {
      if (h.approved != null) parts.push(C.naira(h.approved) + ' approved');
    } else {
      var budget = h.final != null ? h.final : h.approved;
      if (budget != null) parts.push(C.naira(budget) + ' budget');
      if (h.toDate != null) parts.push(C.naira(h.toDate) + ' paid to date');
      if (h.inPeriod) parts.push(C.naira(h.inPeriod) + ' in the period');
    }
    return parts.join(' · ');
  }

  function stateLink(p) {
    var q = new URLSearchParams({ state: p.state });
    if (p.L) q.set('lga', p.L);
    return 'civic.html?' + q.toString();
  }

  function show(p) {
    document.title = p.t + ': ShiftNG';
    var r = p.residents || {};
    var residentText = [
      r.finished ? r.finished + ' say finished' : null,
      r.inProgress ? r.inProgress + ' say work going on' : null,
      r.notDone ? r.notDone + ' say not started' : null
    ].filter(Boolean).join(' · ') || 'No reports yet';
    var note = C.stageNote(p);
    var source = C.sourceLine(p);
    var place = p.places.length
      ? '<ul class="place-list">' + p.places.map(function (x) {
          return '<li>' + esc(placeText(x, p.state)) + ' <span class="basis">· ' + esc(BASIS[x.basis] || '') + '</span></li>';
        }).join('') + '</ul>'
      : (C.placeLine(p, p.state) ? '<p class="pc-place">' + esc(C.placeLine(p, p.state)) + '</p>' : '');

    var html = '<p class="crumbs"><a href="civic.html">All states</a> <span aria-hidden="true">›</span> ' +
      '<a href="' + esc(stateLink(p)) + '">' + esc(p.L ? p.L + ', ' + p.state : p.state) + '</a></p>' +
      '<div class="pc-head"><span class="who-pays">' + esc(C.whoPays(p)) + '</span>' + C.stagePill(p) + '</div>' +
      '<h1>' + esc(p.t) + '</h1>' + place +
      (p.d ? '<p class="muted">' + esc(p.d) + '</p>' : '') +
      (p.sec && C.SECTOR_LABEL[p.sec] ? '<p class="muted">Sector: ' + esc(C.SECTOR_LABEL[p.sec]) + '</p>' : '') +
      '<div class="tiles">' +
        '<div class="tile"><span>Budget' + (p.y ? ' ' + p.y : '') + '</span><strong>' + esc(C.naira(p.b) || 'Not given') + '</strong></div>' +
        '<div class="tile"><span>Paid to date</span><strong>' + esc(C.naira(p.p || 0)) + '</strong></div>' +
        '<div class="tile"><span>Residents</span><strong class="tile-small">' + esc(residentText) + '</strong></div>' +
      '</div>' +
      C.bar(p, true) +
      (note ? '<p class="pc-note' + (p.s === 'sources_disagree' ? ' pc-alert' : '') + '">' + esc(note) + '</p>' : '') +
      (source ? '<p class="pc-source">Source: ' + esc(source) + '</p>' : '') +
      '<p class="muted small-note">These are the government\'s own figures. Money paid is not the same as work done: residents\' reports in the ShiftNG app are how people say what they see on site.</p>' +
      '<div class="actions project-actions"><button type="button" class="button button-green" id="share">Share this project</button></div>';

    if (p.offices.length) {
      html += '<h2>Responsible offices</h2><ul class="office-list">' +
        p.offices.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>';
    }

    if (p.history.length) {
      html += '<h2>History</h2><ol class="history">' + p.history.map(function (h) {
        var fig = figures(h);
        return '<li><strong>' + esc(h.period) + ' · ' + esc(KIND[h.kind] || h.kind) + '</strong>' +
          (fig ? '<span>' + esc(fig) + '</span>' : '') +
          '<span class="muted">' + esc(h.title + C.pageRef(h.page)) + '</span>' +
          (h.url ? '<a href="' + esc(h.url) + '" target="_blank" rel="noopener noreferrer nofollow">Open the document ↗</a>' : '') +
          '</li>';
      }).join('') + '</ol>';
    }

    html += '<div class="cta-band"><div><h2>Seen this project?</h2>' +
      '<p>Residents say what they see on site, with a photo, in the ShiftNG app. The website shows how many say what; the reports stay in the app.</p></div>' +
      '<span class="soon-dark">Coming soon to the App Store and Google Play</span></div>';

    main.innerHTML = html;
    document.getElementById('share').addEventListener('click', function () {
      var text = p.t + (p.s ? ' — ' + C.STAGE_LABEL[p.s] + (C.moneyLine(p) ? ': ' + C.moneyLine(p) : '') : '') +
        (source ? '\nSource: ' + source : '');
      var shareUrl = location.origin + location.pathname + '?id=' + encodeURIComponent(p.i);
      if (navigator.share) {
        navigator.share({ title: p.t, text: text, url: shareUrl }).catch(function () { /* closed */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text + '\n' + shareUrl).then(function () {
          document.getElementById('share').textContent = 'Link copied';
        });
      }
    });
  }

  if (!/^[0-9a-f-]{36}$/.test(id)) {
    statusEl.textContent = 'This project link is not complete. Try opening it again.';
    return;
  }
  fetch('data/civic/p/' + id + '.json')
    .then(function (r) {
      if (r.status === 404) throw new Error('gone');
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (p) { statusEl.textContent = ''; show(p); })
    .catch(function (e) {
      statusEl.innerHTML = e.message === 'gone'
        ? 'This project is not on ShiftNG any more. <a href="civic.html">See the projects we have</a>.'
        : 'The project could not be loaded. Check your connection and try again.';
    });
})();
