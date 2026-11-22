/* Order tracking. Reads the same order list the admin writes to, and redraws when
   the admin (in another tab) moves the order along. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, $ = LV.$;
  LV.mount({ active: 'track' });
  var out = $('#track-out'), input = $('#order'), current = null, lastStatus = null;
  var ICON = { placed: 'receipt', confirmed: 'card', packed: 'box', shipped: 'boat', delivered: 'cup' };

  // a few sample orders to try, one per stage
  var samples = [], seen = {};
  LV.orders.all().forEach(function (o) { if (!seen[o.status] && o.sample && o.status !== 'cancelled') { seen[o.status] = 1; samples.push(o); } });
  $('#track-try').innerHTML = samples.length ? 'Sample orders to try: ' + samples.slice(0, 4).map(function (o) {
    return '<button type="button" data-no="' + esc(o.no) + '">' + esc(o.no) + '</button> (' + esc(LV.stepLabel(o, o.status).toLowerCase()) + ')';
  }).join(', ') + '.' : '';
  $('#track-try').addEventListener('click', function (e) { var b = e.target.closest('[data-no]'); if (b) { input.value = b.dataset.no; show(b.dataset.no, true); } });

  function eventFor(o, st) { for (var i = o.events.length - 1; i >= 0; i--) if (o.events[i].status === st) return o.events[i]; return null; }

  function render(o) {
    var z = LV.ZONES[o.zone], cancelled = o.status === 'cancelled', at = LV.STEPS.indexOf(o.status);
    if (cancelled) { at = -1; LV.STEPS.forEach(function (s, i) { if (eventFor(o, s)) at = i; }); }
    var icon = function (s) { return s === 'shipped' && (o.zone === 'male' || o.zone === 'hulhumale' || o.zone === 'villimale') ? 'truck' : s === 'shipped' && o.zone === 'pickup' ? 'bag' : ICON[s]; };
    var tl = LV.STEPS.map(function (s, i) {
      var ev = eventFor(o, s), done = i <= at && !!ev || (i <= at && !cancelled), now = i === at && !cancelled && o.status !== 'delivered';
      var sub = ev ? LV.date(ev.t, true) : (i === at + 1 && !cancelled ? (s === 'confirmed' && o.pay.state !== 'paid' && o.pay.method === 'transfer' ? 'Waiting for your transfer' : 'Next') : '');
      return '<li class="' + (done ? 'is-done' : '') + (now ? ' is-now' : '') + '"><span class="dot">' + LV.icon[icon(s)] + '</span><div><b>' + esc(LV.stepLabel(o, s)) + '</b>' +
        (sub ? '<small>' + esc(sub) + '</small>' : '') + (ev && ev.note ? '<em>' + esc(ev.note) + '</em>' : '') + '</div></li>';
    }).join('');
    if (cancelled) {
      var cev = eventFor(o, 'cancelled');
      tl += '<li class="is-done"><span class="dot" style="background:var(--red);border-color:var(--red)">' + LV.icon.x + '</span><div><b>Cancelled</b><small>' + esc(LV.date(cev.t, true)) + '</small>' + (cev.note ? '<em>' + esc(cev.note) + '</em>' : '') + '</div></li>';
    }
    var coll = o.zone === 'pickup';
    var headline = cancelled ? 'This order was cancelled.' : o.status === 'delivered' ? 'Enjoy your coffee.' : o.status === 'shipped' ? (coll ? 'It is ready for you at the store.' : 'It is on the way.') : o.status === 'packed' ? (coll ? 'Packed. We will call you when it is ready.' : 'Packed and waiting to leave.') : o.status === 'confirmed' ? 'Confirmed. We are packing it.' : 'We have your order.';
    out.innerHTML = '<div class="trk"><div class="trk-card"><div class="trk-head"><div><h2>' + esc(o.no) + '</h2><p>Placed ' + esc(LV.date(o.created, true)) + ' · ' + esc(headline) + '</p></div>' +
      '<span class="pill s-' + o.status + (o.status !== 'delivered' && !cancelled ? ' live' : '') + '">' + esc(LV.stepLabel(o, o.status)) + '</span></div>' +
      '<ol class="tl">' + tl + '</ol></div>' +
      '<div class="trk-card"><dl class="kv">' +
      '<div><dt>' + (coll ? 'Collect from' : 'Deliver to') + '</dt><dd>' + (coll ? 'Our store in Malé' : esc(z.label) + (o.address ? '<br>' + esc(o.address) : '')) + '</dd></div>' +
      (cancelled || o.status === 'delivered' ? '' : '<div><dt>When</dt><dd>' + esc(z.eta) + '</dd></div>') +
      '<div><dt>Payment</dt><dd>' + esc(LV.payLabel(o)) + '</dd></div>' +
      '<div><dt>Items</dt><dd>' + o.items.map(function (l) { return l.qty + ' × ' + esc(l.name) + ' <span style="color:var(--muted)">(' + esc(l.sub) + ')</span>'; }).join('<br>') + '</dd></div>' +
      '<div><dt>Total</dt><dd><b>' + LV.money(o.total) + '</b>' + (o.fee ? ' including ' + LV.money(o.fee) + ' delivery' : coll ? '' : ', free delivery') + '</dd></div></dl>' +
      '<p style="margin-top:20px;font-size:14px;color:var(--muted)">Something not right? Contact us and quote your order number.</p></div></div>';
  }

  function show(no, user) {
    var o = LV.orders.get(no);
    if (!o) {
      current = null;
      out.innerHTML = '<div class="empty" style="padding:50px 20px 120px"><b>No order with that number</b><p>Check the number on your confirmation. It looks like LVZ-24018.</p></div>';
      return;
    }
    current = o.no; lastStatus = o.status; input.value = o.no;
    render(o);
    history.replaceState(null, '', 'track.html?order=' + encodeURIComponent(o.no));
    if (user) { var h = out.querySelector('h2'); h.tabIndex = -1; h.focus({ preventScroll: true }); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  $('#track-form').addEventListener('submit', function (e) { e.preventDefault(); if (input.value.trim()) show(input.value, true); });

  // live update from the admin
  LV.on('orders', function () {
    if (!current) return;
    var o = LV.orders.get(current);
    if (!o) return;
    var changed = o.status !== lastStatus;
    lastStatus = o.status; render(o);
    if (changed) LV.toast('Update: ' + LV.stepLabel(o, o.status));
  });

  var q = new URLSearchParams(location.search).get('order');
  if (q) show(q, false);
})();
