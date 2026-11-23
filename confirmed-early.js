// The confirmation link brings sign-in details after the "#" in the web
// address. They are never sent to this website or kept: they are read for
// an error message only, then wiped from the address bar straight away.
(function () {
  var hash = window.location.hash.slice(1);
  window.__failed = /(^|&)error=/.test(hash) || /(^|&|\?)error=/.test(window.location.search);
  if (hash || window.location.search) {
    history.replaceState(null, '', window.location.pathname);
  }
})();
