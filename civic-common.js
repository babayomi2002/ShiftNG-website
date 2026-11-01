// Shared by the Civic pages (civic.html, project.html): the stage words,
// money lines and project card, worded exactly as in the ShiftNG app. A card
// reports money paid and what residents say, never work finished.
var Civic = (function () {
  var STAGE_LABEL = {
    sources_disagree: 'Sources disagree',
    residents_confirm: 'Residents confirm',
    fully_paid: 'Fully paid',
    not_in_latest_budget: 'Not in the latest budget',
    being_paid: 'Being paid',
    budgeted: 'Budgeted'
  };
  var STAGE_ORDER = ['budgeted', 'being_paid', 'fully_paid', 'sources_disagree', 'residents_confirm', 'not_in_latest_budget'];
  var PAID_NOTE = 'Money paid, not work done';
  var SECTOR_LABEL = {
    agriculture: 'Agriculture', energy: 'Energy', transport: 'Roads and transport', water: 'Water',
    government: 'Government', security: 'Security', economy: 'Economy', environment: 'Environment',
    housing: 'Housing and community', health: 'Health', recreation: 'Culture and sport',
    education: 'Education', social: 'Social protection'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function naira(n) {
    if (n === null || n === undefined) return null;
    if (n >= 1e9) return '₦' + (n / 1e9).toFixed(1) + 'bn';
    if (n >= 1e6) return '₦' + (n / 1e6).toFixed(1) + 'm';
    return '₦' + Math.round(n).toLocaleString('en-NG');
  }

  // ", p.90" for a PDF page; ', sheet "E.8 …", row 13' for a spreadsheet row.
  function pageRef(page) {
    if (!page || page === 'sample') return '';
    var cell = String(page).match(/^(.*)!(\d+)$/);
    return cell ? ', sheet "' + cell[1] + '", row ' + cell[2] : ', p.' + page;
  }

  function whoPays(c) {
    var kind = c.l === 'lga' ? 'LGA project' : c.l === 'federal' ? 'Federal project' : 'State project';
    return c.w ? kind + ' · ' + c.w : kind;
  }

  function sourceLine(c) {
    return c.src ? c.src + pageRef(c.pg) : null;
  }

  // Share of the budget paid, 0–1, for the money bar; null when there is no bar.
  function paidShare(c) {
    if (!c.b || c.b <= 0) return null;
    if (c.s !== 'being_paid' && c.s !== 'fully_paid' && c.s !== 'sources_disagree') return null;
    return Math.min(1, Math.max(0, (c.p || 0) / c.b));
  }

  function moneyLine(c) {
    var budget = naira(c.b);
    var paid = naira(c.p || 0);
    // Below the full budget never reads as 100%.
    var share = c.b ? ((c.p || 0) >= c.b ? 100 : Math.min(99, Math.round(((c.p || 0) / c.b) * 100))) : 0;
    // The government's own report can show money paid on a line with no
    // budget, or more paid than budgeted: say so, never hide it.
    if (!c.b && (c.p || 0) > 0) return paid + ' paid · no budget printed';
    if (!budget) return null;
    if ((c.p || 0) > c.b) return paid + ' paid against a ' + budget + ' budget (' + Math.round((c.p / c.b) * 100) + '%)';
    switch (c.s) {
      case 'budgeted': return budget + ' budgeted' + (c.y ? ' for ' + c.y : '');
      case 'being_paid':
      case 'fully_paid': return paid + ' of ' + budget + ' paid (' + share + '%)';
      case 'sources_disagree': return 'Report: ' + paid + ' paid (' + share + '%)';
      case 'not_in_latest_budget': return 'Last seen: ' + (c.y ? c.y + ' ' : '') + 'budget, ' + paid + ' of ' + budget + ' paid';
      case 'residents_confirm': return budget + ' budget · ' + paid + ' paid';
      default: return 'Budget: ' + budget;
    }
  }

  function stageNote(c) {
    switch (c.s) {
      case 'budgeted': return 'No spending reported yet';
      case 'fully_paid': return 'Is it finished? Residents can say in the ShiftNG app';
      case 'not_in_latest_budget': return c.y ? 'Not in the ' + (c.y + 1) + ' budget' : 'Not in the latest budget';
      case 'sources_disagree': return 'Residents say work has not started';
      case 'residents_confirm': return 'Residents say it is finished';
      default: return null;
    }
  }

  function placeLine(c, state) {
    return [c.W, c.L, state].filter(Boolean).join(', ');
  }

  function stagePill(c) {
    return c.s ? '<span class="stage stage-' + esc(c.s) + '">' + esc(STAGE_LABEL[c.s]) + '</span>' : '';
  }

  function bar(c, big) {
    var share = paidShare(c);
    if (share === null) return '';
    return '<div class="paid-bar' + (big ? ' paid-bar-big' : '') + '" role="img" aria-label="' +
      Math.round(share * 100) + '% of the budget paid"><span style="width:' + Math.round(share * 100) + '%"></span></div>' +
      '<p class="paid-note">' + PAID_NOTE + '</p>';
  }

  function card(c, state) {
    var money = moneyLine(c);
    var note = stageNote(c);
    var source = sourceLine(c);
    var where = placeLine(c, state);
    return '<a class="project-card" href="project.html?id=' + encodeURIComponent(c.i) + '">' +
      '<span class="pc-head"><span class="who-pays">' + esc(whoPays(c)) + '</span>' + stagePill(c) + '</span>' +
      '<span class="pc-title">' + esc(c.t) + '</span>' +
      (where ? '<span class="pc-place">' + esc(where) + '</span>' : '') +
      (money ? '<span class="pc-money">' + esc(money) + '</span>' : '') +
      bar(c) +
      (note ? '<span class="pc-note' + (c.s === 'sources_disagree' ? ' pc-alert' : '') + '">' + esc(note) + '</span>' : '') +
      (source ? '<span class="pc-source">' + esc(source) + '</span>' : '') +
      '</a>';
  }

  // Which section of a page a project belongs to. The same rules as the
  // app's database function civic_section_ids (doc "Places and drill-down").
  function inSection(c, section, lga, ward) {
    var pl = c.pl || [];
    function some(f) { return pl.some(f); }
    if (!pl.length) {
      if (!lga) return section === c.l;
      return section === 'here' && c.L === lga && (!ward || c.W === ward);
    }
    if (!lga) {
      return (section === 'state' && c.l === 'state') || (section === 'lga' && c.l === 'lga');
    }
    if (!ward) {
      var here = some(function (p) { return p[0] === lga; });
      if (section === 'here') return here && !some(function (p) { return p[0] === null || p[0] !== lga; });
      if (section === 'shared') return here && some(function (p) { return p[0] !== null && p[0] !== lga; });
      // Statewide leaves out only what is already under "Shared".
      if (section === 'statewide') {
        return c.l === 'state' && some(function (p) { return p[0] === null; }) &&
          !(here && some(function (p) { return p[0] !== null && p[0] !== lga; }));
      }
      return false;
    }
    if (section === 'here') return some(function (p) { return p[0] === lga && p[1] === ward && p[2] !== 'all_wards'; });
    if (section === 'all_wards') return some(function (p) { return p[0] === lga && p[2] === 'all_wards'; });
    if (section === 'lga_no_ward') {
      return some(function (p) { return p[0] === lga && p[1] === null; }) &&
        !some(function (p) { return p[0] === null || p[0] !== lga || p[1] !== null; });
    }
    return false;
  }

  return {
    STAGE_LABEL: STAGE_LABEL, STAGE_ORDER: STAGE_ORDER, SECTOR_LABEL: SECTOR_LABEL, PAID_NOTE: PAID_NOTE,
    esc: esc, naira: naira, pageRef: pageRef, whoPays: whoPays, sourceLine: sourceLine, moneyLine: moneyLine,
    stageNote: stageNote, stagePill: stagePill, bar: bar, card: card, inSection: inSection, placeLine: placeLine
  };
})();
