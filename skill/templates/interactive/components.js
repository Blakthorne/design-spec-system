// design/interactive/components.js — the minimal runtime the reference components need.
// Native elements do almost everything; this covers only what HTML cannot.
(function () {
  // Slider ↔ number sync: <div class="kx-sliderrow"><input type=range><output>…
  document.querySelectorAll('.kx-sliderrow').forEach(function (row) {
    var r = row.querySelector('input[type="range"]');
    var o = row.querySelector('output');
    if (!r || !o) return;
    var unit = o.dataset.unit || '';
    var show = function () { o.textContent = r.value + (unit ? ' ' + unit : ''); };
    r.addEventListener('input', show); show();
  });
  // Changes-chip ✕ removes its item and updates the count (demo of the revert-at-a-distance).
  document.querySelectorAll('details.kx-chipmod').forEach(function (d) {
    var count = function () {
      var n = d.querySelectorAll('.kx-changeitem').length;
      var t = d.querySelector('.kx-chipmod-pill .n');
      if (t) t.textContent = n + ' change' + (n === 1 ? '' : 's');
      if (!n) d.style.display = 'none'; // zero changes: the chip hides entirely
    };
    d.querySelectorAll('.kx-changeitem .x').forEach(function (x) {
      x.addEventListener('click', function () { x.closest('.kx-changeitem').remove(); count(); });
    });
    count();
  });
  // Mixed checkbox demo: indeterminate is a JS-only property.
  document.querySelectorAll('input[data-mixed]').forEach(function (c) { c.indeterminate = true; });
})();
