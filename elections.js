// Days left to each voting day, counted in Nigeria time (West Africa Time).
(function () {
  var now = new Date();
  var lagosToday = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  lagosToday.setHours(0, 0, 0, 0);
  document.querySelectorAll('.countdown').forEach(function (el) {
    var p = el.getAttribute('data-date').split('-');
    var day = new Date(+p[0], +p[1] - 1, +p[2]);
    var days = Math.round((day - lagosToday) / 86400000);
    el.textContent = days > 1 ? days + ' days to go' : days === 1 ? 'Tomorrow' : days === 0 ? 'Today' : '';
    if (!el.textContent) el.remove();
  });
})();
