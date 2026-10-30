// News page. Reads data/news.json from this site (refreshed every few
// hours from the stories approved in the app) and shows one section at a
// time, or the latest across all eight. Stories link out to their source.
(function () {
  var chips = document.getElementById('chips');
  var list = document.getElementById('news');
  var statusEl = document.getElementById('news-status');
  var data = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function day(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
  }

  function card(story, label) {
    return '<article class="news-card' + (story.star ? ' news-star' : '') + '">' +
      '<span class="tag">' + esc(label) + (story.star ? ' · Top story' : '') + '</span>' +
      '<h3><a href="' + esc(story.u) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(story.h) + '</a></h3>' +
      (story.e ? '<p>' + esc(story.e) + '</p>' : '') +
      '<p class="news-meta">' + esc(story.s) + (story.d ? ' · ' + esc(day(story.d)) : '') +
      ' · <a href="' + esc(story.u) + '" target="_blank" rel="noopener noreferrer nofollow">Read at ' + esc(story.s) + ' ↗</a></p>' +
      '</article>';
  }

  function show(slug) {
    chips.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-slug') === slug ? 'true' : 'false');
    });
    var html = '';
    if (slug === 'all') {
      // The latest across every section, newest first.
      var all = [];
      data.categories.forEach(function (c) { c.stories.forEach(function (s) { all.push({ s: s, label: c.label }); }); });
      all.sort(function (a, b) { return String(b.s.d).localeCompare(String(a.s.d)); });
      all.slice(0, 24).forEach(function (x) { html += card(x.s, x.label); });
    } else {
      var c = data.categories.find(function (x) { return x.slug === slug; });
      (c ? c.stories : []).forEach(function (s) { html += card(s, c.label); });
    }
    list.innerHTML = html || '<p class="muted">No stories in this section yet.</p>';
    try { history.replaceState(null, '', slug === 'all' ? location.pathname : '#' + slug); } catch (e) { /* not essential */ }
  }

  function chip(slug, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'tab');
    b.setAttribute('data-slug', slug);
    b.textContent = label;
    b.addEventListener('click', function () { show(slug); });
    chips.appendChild(b);
  }

  fetch('data/news.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      data = d;
      chip('all', 'Latest');
      d.categories.forEach(function (c) { chip(c.slug, c.label); });
      statusEl.textContent = '';
      var wanted = location.hash.replace('#', '');
      show(d.categories.some(function (c) { return c.slug === wanted; }) ? wanted : 'all');
      if (d.builtAt) {
        document.getElementById('news-updated').textContent = 'Updated ' + new Date(d.builtAt).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos'
        }) + ', Nigeria time.';
      }
    })
    .catch(function () { statusEl.textContent = 'The news could not be loaded. Check your connection and try again.'; });
})();
