/* Admin demo: dashboard, orders with tracking steps, products, promotions, quote requests.
   Browser only. It reads and writes the same localStorage the shop uses, so a change here
   shows on the shop and on the customer's tracking page straight away. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, money = LV.money;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var app = $('#app'), DAY = 864e5;
  LV.seed();

  var ic = LV.icon;
  var NAV = [['dashboard', 'Dashboard', 'building'], ['orders', 'Orders', 'box'], ['products', 'Products', 'cup'], ['promos', 'Promotions', 'card'], ['quotes', 'Quote requests', 'mail'], ['settings', 'Settings', 'power']];
  var ui = { ordersTab: 'open', ordersQ: '', prodCat: 'all', prodQ: '' };
  var returnFocus = null;

  /* ---------- helpers ---------- */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 3200); }
  function live(o) { return o.status !== 'cancelled'; }
  function nextStep(o) { var i = LV.STEPS.indexOf(o.status); return i >= 0 && i < LV.STEPS.length - 1 ? LV.STEPS[i + 1] : null; }
  function nextLabel(o) {
    var n = nextStep(o), z = LV.ZONES[o.zone];
    return { confirmed: 'Confirm order', packed: 'Mark as packed', shipped: o.zone === 'pickup' ? 'Mark ready to collect' : o.zone === 'atoll' || o.zone === 'resort' ? 'Hand to the boat' : 'Send out for delivery', delivered: 'Mark as ' + z.done.toLowerCase() }[n];
  }
  function pill(o) { return '<span class="pill s-' + o.status + '">' + esc(LV.stepLabel(o, o.status)) + '</span>'; }
  function payCell(o) { return '<span class="pay ' + (o.pay.state === 'paid' ? 'ok' : 'wait') + '">' + (o.pay.state === 'paid' ? ic.check : ic.clock) + esc(LV.payLabel(o)) + '</span>'; }
  function who(o) { return o.customer.company || o.customer.name; }
  function itemsCount(o) { return o.items.reduce(function (n, l) { return n + l.qty; }, 0); }
  function mvDay(t) { return new Date(t).toLocaleDateString('en-CA', { timeZone: 'Indian/Maldives' }); }

  /* ---------- sign in ---------- */
  function login() {
    app.innerHTML = '<div class="login"><form class="login-card" id="login">' + LV.logo().replace('<svg', '<svg class="logo"') +
      '<div><span class="demo-flag">Demo</span></div><h1>Shop admin</h1><p>Sign in to manage orders, products and promotions. This demo accepts any email and password.</p>' +
      '<label class="field"><span>Email</span><input type="email" name="email" value="manager@example.com" autocomplete="username" required></label>' +
      '<label class="field"><span>Password</span><input type="password" name="pw" value="demo-password" autocomplete="current-password" required></label>' +
      '<button class="btn" type="submit">Sign in</button><p class="hint">Nothing is sent anywhere. The password is not stored.</p></form></div>';
    $('#login').addEventListener('submit', function (e) { e.preventDefault(); LV.set('admin', { email: e.target.elements.namedItem('email').value, t: Date.now() }); route(); });
  }

  /* ---------- shell ---------- */
  function shell(view, inner) {
    var open = LV.orders.all().filter(function (o) { return o.status === 'placed'; }).length;
    var newQ = LV.quotes.all().filter(function (q) { return q.state === 'new'; }).length;
    return '<div class="adm"><aside class="side">' + LV.logo().replace('<svg', '<svg class="logo"') + '<span class="demo-flag">Admin demo</span>' +
      '<nav aria-label="Admin">' + NAV.map(function (n) {
        var badge = n[0] === 'orders' && open ? '<b title="New orders">' + open + '</b>' : n[0] === 'quotes' && newQ ? '<b title="New requests">' + newQ + '</b>' : '';
        return '<a href="#' + n[0] + '"' + (view === n[0] ? ' aria-current="page"' : '') + '>' + ic[n[2]] + n[1] + badge + '</a>';
      }).join('') + '</nav>' +
      '<div class="side-foot"><a href="../index.html" target="_blank" rel="noopener">' + ic.go + 'Open the shop</a><button type="button" data-signout>' + ic.x + 'Sign out</button></div></aside>' +
      '<main class="main" id="main">' + inner + '</main></div>';
  }

  /* ---------- dashboard ---------- */
  function dashboard() {
    var orders = LV.orders.all(), now = Date.now();
    var inWin = function (a, b) { return orders.filter(function (o) { return live(o) && o.created >= now - a * DAY && o.created < now - b * DAY; }); };
    var w = inWin(7, 0), pw = inWin(14, 7);
    var rev = function (l) { return l.reduce(function (s, o) { return s + o.total; }, 0); };
    var open = orders.filter(function (o) { return ['placed', 'confirmed', 'packed'].indexOf(o.status) >= 0; });
    var unpaid = orders.filter(function (o) { return live(o) && o.pay.state !== 'paid' && (o.pay.method === 'transfer' || o.pay.method === 'invoice'); });
    var low = LV.products({ all: true }).filter(function (p) { return p.stock <= 5; });
    var delta = function (a, b) {
      if (!b) return '<small>No orders the week before</small>';
      var d = Math.round((a - b) / b * 100);
      return '<small>' + (d >= 0 ? ic.go.replace('<svg', '<svg style="transform:rotate(-45deg)"') : ic.go.replace('<svg', '<svg style="transform:rotate(45deg)"')) + (d >= 0 ? 'Up ' : 'Down ') + Math.abs(d) + '% on the week before</small>';
    };

    // 14 days of revenue, Maldives days
    var days = [];
    for (var i = 13; i >= 0; i--) { var t = now - i * DAY; days.push({ key: mvDay(t), t: t, rev: 0, n: 0 }); }
    orders.forEach(function (o) { if (!live(o)) return; var k = mvDay(o.created); days.forEach(function (d) { if (d.key === k) { d.rev += o.total; d.n++; } }); });

    // top sellers
    var qty = {};
    orders.forEach(function (o) { if (live(o)) o.items.forEach(function (l) { qty[l.id] = qty[l.id] || { q: 0, r: 0, name: l.name, sub: l.sub }; qty[l.id].q += l.qty; qty[l.id].r += l.qty * l.price; }); });
    var top = Object.keys(qty).map(function (k) { return Object.assign({ id: k }, qty[k]); }).sort(function (a, b) { return b.q - a.q; }).slice(0, 5);
    var zones = {};
    orders.forEach(function (o) { if (live(o)) zones[o.zone] = (zones[o.zone] || 0) + 1; });

    return '<div class="top"><div><h1>Dashboard</h1><p>What needs you today, and how the last two weeks went. Sample data.</p></div>' +
      '<div class="top-actions"><a class="btn" href="#orders">' + ic.box + 'Go to orders</a></div></div>' +
      '<div class="kpis">' +
      '<div class="card kpi"><span>Orders, last 7 days</span><b class="num">' + w.length + '</b>' + delta(w.length, pw.length) + '</div>' +
      '<div class="card kpi"><span>Sales, last 7 days</span><b class="num">' + money(rev(w)) + '</b>' + delta(rev(w), rev(pw)) + '</div>' +
      '<div class="card kpi"><span>Orders to work on</span><b class="num">' + open.length + '</b><small>' + open.filter(function (o) { return o.status === 'placed'; }).length + ' new, ' + open.filter(function (o) { return o.status === 'confirmed'; }).length + ' to pack, ' + open.filter(function (o) { return o.status === 'packed'; }).length + ' to send</small></div>' +
      '<div class="card kpi"><span>Waiting for payment</span><b class="num">' + money(rev(unpaid)) + '</b><small>' + unpaid.length + ' orders by transfer or on account</small></div></div>' +
      '<div class="dash"><div style="display:grid;gap:14px">' +
      '<section class="card"><div class="card-h"><h2>Sales per day, last 14 days</h2><small>MVR, GST included, cancelled orders left out</small></div><div class="card-b chart" id="chart">' + chart(days) + '<div class="tip" id="tip"></div></div>' +
      '<details class="tbl"><summary>Show these numbers as a table</summary><div class="tw"><table class="t"><thead><tr><th>Day</th><th class="r">Orders</th><th class="r">Sales</th></tr></thead><tbody>' +
      days.map(function (d) { return '<tr><td>' + LV.date(d.t) + '</td><td class="r num">' + d.n + '</td><td class="r num">' + money(d.rev) + '</td></tr>'; }).join('') + '</tbody></table></div></details></section>' +
      '<section class="card"><div class="card-h"><h2>Latest orders</h2><a href="#orders">All orders</a></div><div class="tw">' + ordersTable(orders.slice(0, 6), true) + '</div></section></div>' +
      '<div style="display:grid;gap:14px">' +
      '<section class="card"><div class="card-h"><h2>Top sellers</h2><small>Units in all orders</small></div><ul class="list">' + top.map(function (x) {
        return '<li><span class="l"><img src="' + LV.img(x.id) + '" alt=""><span><b>' + esc(x.name) + '</b><small>' + esc(x.sub) + '</small></span></span><span class="num" style="text-align:right"><b>' + x.q + '</b><small>' + money(x.r) + '</small></span></li>';
      }).join('') + '</ul></section>' +
      '<section class="card"><div class="card-h"><h2>Low stock</h2><a href="#products">Products</a></div><ul class="list">' + (low.length ? low.slice(0, 6).map(function (p) {
        return '<li><span class="l"><img src="' + LV.img(p) + '" alt=""><span><b>' + esc(p.name) + '</b><small>' + esc(LV.subline(p)) + '</small></span></span><span class="num"><b>' + p.stock + '</b> left</span></li>';
      }).join('') : '<li><span class="hint">Nothing is running low.</span></li>') + '</ul></section>' +
      '<section class="card"><div class="card-h"><h2>Where orders go</h2><small>All orders</small></div><ul class="list">' + Object.keys(LV.ZONES).filter(function (z) { return zones[z]; }).sort(function (a, b) { return zones[b] - zones[a]; }).map(function (z) {
        return '<li><span>' + LV.ZONES[z].label + '</span><b class="num">' + zones[z] + '</b></li>';
      }).join('') + '</ul></section></div></div>';
  }

  function chart(days) {
    var W = 720, H = 250, L = 46, R = 8, T = 18, B = 30, pw = W - L - R, ph = H - T - B;
    var max = Math.max.apply(null, days.map(function (d) { return d.rev; })) || 1;
    var step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step;
    if (top / step > 5) { step *= 2; top = Math.ceil(max / step) * step; }
    if (top / step < 3) { step /= 2; }
    var band = pw / days.length, bw = Math.min(24, band - 6), g = '';
    for (var v = 0; v <= top + 1; v += step) {
      var y = T + ph - v / top * ph;
      g += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="axis-t" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000) + 'k' : v) + '</text>';
    }
    var peak = days.reduce(function (a, d, i) { return d.rev > days[a].rev ? i : a; }, 0);
    days.forEach(function (d, i) {
      var x = L + i * band + (band - bw) / 2, h = Math.max(d.rev ? 2 : 0, d.rev / top * ph), y = T + ph - h, r = Math.min(4, h);
      var label = LV.date(d.t).replace(/ \d{4}$/, '');
      // the wide see-through band is the hover and keyboard target, the bar is drawn after it
      g += '<rect class="band" tabindex="0" role="img" aria-label="' + label + ': ' + money(d.rev) + ', ' + d.n + (d.n === 1 ? ' order' : ' orders') + '" data-i="' + i + '" x="' + (L + i * band) + '" y="' + T + '" width="' + band + '" height="' + ph + '"/>';
      g += h ? '<path class="bar" d="M' + x + ' ' + (T + ph) + 'V' + (y + r) + 'q0 -' + r + ' ' + r + ' -' + r + 'h' + (bw - 2 * r) + 'q' + r + ' 0 ' + r + ' ' + r + 'V' + (T + ph) + 'z"/>' : '<path class="bar" d=""/>';
      if (i % 2 === 1 || i === days.length - 1) g += '<text class="axis-t" x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + (i === days.length - 1 ? 'Today' : label) + '</text>';
      if (d.rev && (i === peak || i === days.length - 1)) g += '<text class="val-t" x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + Math.round(d.rev).toLocaleString('en-US') + '</text>';
    });
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '" stroke="#9aa3b5" stroke-width="1"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Bar chart of sales per day for the last 14 days" data-days=\'' + JSON.stringify(days.map(function (d) { return [LV.date(d.t), d.rev, d.n]; })) + '\'>' + g + '</svg>';
  }
  function bindChart() {
    var box = $('#chart'), tip = $('#tip');
    if (!box) return;
    var svg = $('svg', box), data = JSON.parse(svg.getAttribute('data-days'));
    var show = function (el) {
      var d = data[+el.dataset.i], r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      tip.innerHTML = '<b>' + money(d[1]) + '</b>' + esc(d[0]) + ' · ' + d[2] + (d[2] === 1 ? ' order' : ' orders');
      tip.style.left = Math.max(70, Math.min(b.width - 70, r.left - b.left + r.width / 2)) + 'px'; tip.style.top = (r.top - b.top + 4) + 'px';
      tip.classList.add('is-on');
    };
    var hide = function () { tip.classList.remove('is-on'); };
    $$('.band', svg).forEach(function (el) {
      el.addEventListener('pointerenter', function () { show(el); }); el.addEventListener('pointerleave', hide);
      el.addEventListener('focus', function () { show(el); }); el.addEventListener('blur', hide);
    });
  }

  /* ---------- orders ---------- */
  function ordersTable(list, compact) {
    if (!list.length) return '<div class="empty">No orders here.</div>';
    return '<table class="t"><thead><tr><th>Order</th><th>Customer</th><th>Deliver to</th>' + (compact ? '' : '<th class="r">Items</th>') + '<th class="r">Total</th><th>Payment</th><th>Status</th>' + (compact ? '' : '<th></th>') + '</tr></thead><tbody>' +
      list.map(function (o) {
        var n = nextStep(o);
        return '<tr class="click" data-no="' + o.no + '"><td><button class="linkbtn" type="button" data-open="' + o.no + '">' + o.no + '</button><small>' + LV.date(o.created, true) + '</small></td>' +
          '<td>' + esc(who(o)) + '<small>' + esc(o.customer.phone) + (o.customer.business ? ' · Business' : '') + '</small></td>' +
          '<td>' + esc(LV.ZONES[o.zone].label) + '</td>' + (compact ? '' : '<td class="r num">' + itemsCount(o) + '</td>') +
          '<td class="r num"><b>' + money(o.total) + '</b></td><td>' + payCell(o) + '</td><td>' + pill(o) + '</td>' +
          (compact ? '' : '<td class="r">' + (n && live(o) ? '<button class="btn sm ghost" type="button" data-next="' + o.no + '">' + esc(nextLabel(o)) + '</button>' : '') + '</td>') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  var TABS = [['open', 'To work on', function (o) { return ['placed', 'confirmed', 'packed'].indexOf(o.status) >= 0; }], ['placed', 'New', null], ['confirmed', 'To pack', null], ['packed', 'To send', null], ['shipped', 'On the way', null], ['delivered', 'Delivered', null], ['cancelled', 'Cancelled', null], ['all', 'All', function () { return true; }]];
  function ordersView() {
    var all = LV.orders.all(), q = LV.fold(ui.ordersQ);
    var tab = TABS.filter(function (t) { return t[0] === ui.ordersTab; })[0] || TABS[0];
    var test = tab[2] || function (o) { return o.status === tab[0]; };
    var list = all.filter(test).filter(function (o) { return !q || LV.fold(o.no + ' ' + who(o) + ' ' + o.customer.name + ' ' + o.customer.phone).indexOf(q) >= 0; });
    return '<div class="top"><div><h1>Orders</h1><p>Move an order to its next step and the customer sees it on their tracking page.</p></div></div>' +
      '<div class="tabs" role="group" aria-label="Order status">' + TABS.map(function (t) {
        var n = all.filter(t[2] || function (o) { return o.status === t[0]; }).length;
        return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (t[0] === ui.ordersTab) + '">' + t[1] + ' <small>' + n + '</small></button>';
      }).join('') + '</div>' +
      '<div class="tools"><label class="sr" for="oq">Search orders</label><input class="inp" id="oq" type="search" placeholder="Search order number, name or phone" value="' + esc(ui.ordersQ) + '"><span class="hint">' + list.length + ' shown</span></div>' +
      '<section class="card"><div class="tw">' + ordersTable(list) + '</div></section>';
  }

  function orderPanel(no) {
    var o = LV.orders.get(no);
    if (!o) return '';
    var at = LV.STEPS.indexOf(o.status), n = nextStep(o), z = LV.ZONES[o.zone], c = o.customer;
    var canPay = live(o) && o.pay.state !== 'paid' && o.pay.method !== 'cod';
    return '<div class="scrim" data-close></div><aside class="panel" role="dialog" aria-modal="true" aria-labelledby="ph">' +
      '<div class="panel-h"><div><h2 id="ph" tabindex="-1">' + o.no + '</h2><p class="hint">Placed ' + LV.date(o.created, true) + (o.sample ? ' · sample order' : '') + '</p></div><div style="display:flex;gap:10px;align-items:center">' + pill(o) + '<button class="x" type="button" data-close aria-label="Close order">&times;</button></div></div>' +
      '<div class="panel-b">' +
      (live(o) ? '<ol class="stepper" aria-label="Progress">' + LV.STEPS.map(function (s, i) { return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + esc(LV.stepLabel(o, s)) + '</li>'; }).join('') + '</ol>' : '') +
      (live(o) && (n || canPay) ? '<div class="act">' +
        (n ? '<label class="field"><span>Note the customer sees (optional)</span><input id="note" placeholder="' + (n === 'shipped' && (o.zone === 'atoll' || o.zone === 'resort') ? 'Boat name and when it leaves' : n === 'shipped' ? 'Rider name or time' : 'Anything worth telling them') + '"></label>' : '') +
        '<div class="act-row">' + (n ? '<button class="btn" type="button" data-next="' + o.no + '" data-from-panel>' + esc(nextLabel(o)) + ' ' + ic.go + '</button>' : '') +
        (canPay ? '<button class="btn ghost" type="button" data-paid="' + o.no + '">' + (o.pay.method === 'invoice' ? 'Mark invoice paid' : 'Mark payment received') + '</button>' : '') +
        (o.status !== 'delivered' ? '<button class="btn danger" type="button" data-cancel="' + o.no + '">Cancel order</button>' : '') + '</div></div>' : '') +
      '<div><p class="sec-t">Customer and delivery</p><dl class="kv">' +
      '<dt>Customer</dt><dd>' + esc(c.company && c.company !== c.name ? c.company + ' (' + c.name + ')' : c.company || c.name) + (c.business ? ' · Business' : '') + '</dd>' +
      '<dt>Phone</dt><dd>' + esc(c.phone) + '</dd>' + (c.email ? '<dt>Email</dt><dd>' + esc(c.email) + '</dd>' : '') + (c.tin ? '<dt>TIN</dt><dd>' + esc(c.tin) + '</dd>' : '') +
      '<dt>Deliver to</dt><dd>' + esc(z.label) + (o.address ? '<br>' + esc(o.address) : '') + '</dd>' + (o.note ? '<dt>Their note</dt><dd>' + esc(o.note) + '</dd>' : '') +
      '<dt>Payment</dt><dd>' + payCell(o) + (o.pay.ref ? ' <span class="hint">ref ' + esc(o.pay.ref) + '</span>' : '') + (o.pay.card ? ' <span class="hint">' + esc(o.pay.card) + '</span>' : '') + (o.pay.slip ? '<br><span class="hint">Slip: ' + esc(o.pay.slip) + '</span>' : '') + '</dd></dl></div>' +
      '<div><p class="sec-t">Items</p><ul class="items">' + o.items.map(function (l) { return '<li><span>' + l.qty + ' × ' + esc(l.name) + ' <span class="hint">' + esc(l.sub) + '</span></span><span class="num">' + money(l.price * l.qty) + '</span></li>'; }).join('') +
      '<li><span>Delivery</span><span class="num">' + (o.fee ? money(o.fee) : 'Free') + '</span></li><li class="tot"><span>Total, GST included</span><span class="num">' + money(o.total) + '</span></li></ul></div>' +
      '<div><p class="sec-t">History</p><ul class="log">' + o.events.slice().reverse().map(function (e) {
        return '<li><time>' + LV.date(e.t, true) + '</time><span><b>' + esc(e.status === 'paid' ? 'Payment received' : LV.stepLabel(o, e.status)) + '</b>' + (e.note ? '<br><span class="hint">' + esc(e.note) + '</span>' : '') + '</span></li>';
      }).join('') + '</ul></div>' +
      '<p><a href="../track.html?order=' + encodeURIComponent(o.no) + '" target="_blank" rel="noopener">Open the customer tracking page</a></p></div></aside>';
  }

  /* ---------- products ---------- */
  function productsView() {
    var all = LV.products({ all: true }), q = LV.fold(ui.prodQ);
    var cats = ['all'].concat(Object.keys(LV.CATS));
    var list = all.filter(function (p) { return (ui.prodCat === 'all' || p.category === ui.prodCat) && (!q || LV.fold(p.name + ' ' + LV.subline(p)).indexOf(q) >= 0); });
    return '<div class="top"><div><h1>Products</h1><p>Change a price, stock level or badge. It saves as you go and the shop updates straight away.</p></div></div>' +
      '<div class="tabs" role="group" aria-label="Category">' + cats.map(function (c) {
        var n = c === 'all' ? all.length : all.filter(function (p) { return p.category === c; }).length;
        return '<button type="button" data-pcat="' + c + '" aria-pressed="' + (c === ui.prodCat) + '">' + (c === 'all' ? 'All' : LV.CATS[c]) + ' <small>' + n + '</small></button>';
      }).join('') + '</div>' +
      '<div class="tools"><label class="sr" for="pq">Search products</label><input class="inp" id="pq" type="search" placeholder="Search products" value="' + esc(ui.prodQ) + '"><span class="hint">' + list.length + ' shown</span></div>' +
      '<section class="card"><div class="tw"><table class="t"><thead><tr><th>Product</th><th>Class</th><th class="r">Price, MVR</th><th class="r">In stock</th><th>Best seller</th><th>New</th><th>Shown in shop</th></tr></thead><tbody id="prows">' +
      (list.length ? list.map(prodRow).join('') : '<tr><td colspan="7"><div class="empty">No products match.</div></td></tr>') + '</tbody></table></div></section>';
  }
  function prodRow(p) {
    var k = 'data-id="' + p.id + '"';
    return '<tr ' + k + ' class="' + (p.stock <= 5 ? 'low' : '') + (p.hidden ? ' hidden-p' : '') + '"><td><div class="prod"><img loading="lazy" src="' + LV.img(p) + '" alt=""><span><b>' + esc(p.name) + '</b><small>' + esc(LV.subline(p)) + '</small></span></div></td>' +
      '<td>' + LV.CLASSES[p.cls].label + '</td>' +
      '<td class="r"><label class="sr" for="pr-' + p.id + '">Price of ' + esc(p.name) + '</label><input class="inp n num" id="pr-' + p.id + '" type="number" min="0" step="1" data-k="price" value="' + p.price + '"></td>' +
      '<td class="r"><label class="sr" for="st-' + p.id + '">Stock of ' + esc(p.name) + '</label><input class="inp n num" id="st-' + p.id + '" type="number" min="0" step="1" data-k="stock" value="' + p.stock + '">' + (p.stock <= 0 ? '<span class="badge-low">Out of stock</span>' : p.stock <= 5 ? '<span class="badge-low">Low</span>' : '') + '</td>' +
      '<td><input type="checkbox" data-k="best" aria-label="Best seller: ' + esc(p.name) + '"' + (p.best ? ' checked' : '') + '></td>' +
      '<td><input type="checkbox" data-k="isNew" aria-label="New: ' + esc(p.name) + '"' + (p.isNew ? ' checked' : '') + '></td>' +
      '<td><input type="checkbox" data-k="shown" aria-label="Shown in shop: ' + esc(p.name) + '"' + (p.hidden ? '' : ' checked') + '></td></tr>';
  }

  /* ---------- promotions ---------- */
  // where the banner button goes, worked out from the featured product
  function linkFor(kind, p) {
    if (kind === 'new') return 'shop.html?new=1';
    if (kind === 'range' && p) return (p.category === 'capsules' || p.category === 'machines') && LV.SYSTEMS[p.system] ? 'shop.html?system=' + p.system : 'shop.html?cat=' + p.category;
    return p ? 'product.html?id=' + p.id : 'shop.html';
  }
  function kindOf(b) { return b.kind || (/new=1/.test(b.href) ? 'new' : /product\.html/.test(b.href) ? 'product' : 'range'); }
  // the announcement bar has its own list of places to go. It does not follow the banner, so changing
  // the featured product can never leave the bar pointing somewhere its text does not mention
  var STRIP_LINKS = [['shop.html?new=1', 'All new releases'], ['shop.html?best=1', 'All best sellers'], ['shop.html?system=tabli', 'The Tablì range'],
    ['shop.html?system=amm', 'The A Modo Mio range'], ['shop.html?system=ncc', 'Nespresso Original compatible capsules'], ['shop.html?cat=capsules', 'All capsules'],
    ['shop.html?cat=beans,ground', 'Beans and ground coffee'], ['shop.html?cat=machines,makers', 'Machines'], ['shop.html', 'The whole shop']];
  function promosView() {
    var pr = LV.promo(), all = LV.products({ all: true });
    var opts = Object.keys(LV.CATS).map(function (c) {
      return '<optgroup label="' + LV.CATS[c] + '">' + all.filter(function (p) { return p.category === c; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === pr.banner.productId ? ' selected' : '') + '>' + esc(p.name + ' · ' + LV.subline(p)) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
    var sel = function (name, list, cur) {
      return '<select name="' + name + '">' + list.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>';
    };
    var stripCur = STRIP_LINKS.some(function (x) { return x[0] === pr.strip.href; }) ? pr.strip.href : 'shop.html';
    var BANNER_LINKS = [['range', 'The range the featured product belongs to'], ['product', 'The featured product page'], ['new', 'All new releases']];
    return '<div class="top"><div><h1>Promotions</h1><p>The yellow announcement bar and the new release banner on the home page.</p></div></div>' +
      '<div class="promo"><form id="promo-form" class="card"><div class="card-h"><h2>Announcement bar</h2><label class="switch"><input type="checkbox" name="stripOn"' + (pr.strip.on ? ' checked' : '') + '><span>Show it</span></label></div><div class="card-b" style="display:grid;gap:14px">' +
      '<label class="field"><span>Message</span><input name="stripText" maxlength="90" value="' + esc(pr.strip.text) + '"><small>Keep it to one line. Up to 90 characters.</small></label>' +
      '<div class="grid2"><label class="field"><span>Link text</span><input name="stripCta" maxlength="24" value="' + esc(pr.strip.cta) + '"></label><label class="field"><span>Link goes to</span>' + sel('stripHref', STRIP_LINKS, stripCur) + '</label></div></div>' +
      '<div class="card-h" style="border-top:1px solid var(--line)"><h2>New release banner</h2><label class="switch"><input type="checkbox" name="bannerOn"' + (pr.banner.on ? ' checked' : '') + '><span>Show it</span></label></div><div class="card-b" style="display:grid;gap:14px">' +
      '<label class="field"><span>Featured product</span><select name="productId">' + opts + '</select><small>Its photo, colour and price fill the banner and the round sticker in the hero.</small></label>' +
      '<div class="grid2"><label class="field"><span>Small label</span><input name="eyebrow" maxlength="24" value="' + esc(pr.banner.eyebrow) + '"></label><label class="field"><span>Button text</span><input name="cta" maxlength="24" value="' + esc(pr.banner.cta) + '"></label></div>' +
      '<label class="field"><span>Headline</span><input name="title" maxlength="48" value="' + esc(pr.banner.title) + '"></label>' +
      '<label class="field"><span>Text</span><textarea name="text" maxlength="220">' + esc(pr.banner.text) + '</textarea></label>' +
      '<label class="field"><span>Button goes to</span>' + sel('bannerLink', BANNER_LINKS, kindOf(pr.banner)) + '</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Save and publish</button><button class="btn ghost" type="button" data-promo-reset>Back to the original</button></div></div></form>' +
      '<section class="card preview"><div class="card-h"><h2>Home page preview, phone size</h2><a href="../index.html#new" target="_blank" rel="noopener">Open in a new tab</a></div><iframe id="pv" title="Home page preview" loading="lazy" src="../index.html"></iframe></section></div>';
  }

  /* ---------- quotes + settings ---------- */
  function quotesView() {
    var l = LV.quotes.all();
    return '<div class="top"><div><h1>Quote requests</h1><p>Sent from the business form on the home page.</p></div></div><section class="card">' +
      (l.length ? l.map(function (q) {
        return '<div class="quote"><div><h3>' + esc(q.name) + ' <span class="hint">' + esc(q.id) + '</span></h3><small>' + LV.date(q.t, true) + ' · ' + esc((LV.ENVS[q.env] || {}).label || '') + ' · ' + esc(q.contact) + ' · ' + esc(q.phone) + '</small>' +
          (q.volume ? '<p style="margin-top:8px"><b>Volume:</b> ' + esc(q.volume) + '</p>' : '') + (q.message ? '<p style="margin-top:4px">' + esc(q.message) + '</p>' : '') + '</div>' +
          '<label class="field" style="align-self:start;min-width:140px"><span class="sr">Status of ' + esc(q.id) + '</span><select data-quote="' + esc(q.id) + '">' + [['new', 'New'], ['replied', 'Replied'], ['won', 'Won'], ['lost', 'Lost']].map(function (s) { return '<option value="' + s[0] + '"' + (q.state === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label></div>';
      }).join('') : '<div class="empty">No requests yet.</div>') + '</section>';
  }
  function settingsView() {
    var a = LV.get('admin', {});
    return '<div class="top"><div><h1>Settings</h1><p>About this demo.</p></div></div>' +
      '<section class="card" style="max-width:760px"><div class="card-b" style="display:grid;gap:14px">' +
      '<p>Signed in as <b>' + esc(a.email || '') + '</b>.</p>' +
      '<p>This admin runs only in your browser. Orders, stock, prices and promotions are saved in this browser\'s storage, so another computer starts with its own sample data. On a live site these screens sit on a real database and the card step connects to the bank\'s payment gateway.</p>' +
      '<p><b>Try it:</b> open the shop in a second tab, place an order, then come back here. It appears under Orders. Move it along and watch the customer tracking page change.</p>' +
      '<div><button class="btn danger" type="button" data-reset>Reset the demo data</button><p class="hint" style="margin-top:6px">Clears your test orders, cart and edits, and puts the sample data back.</p></div></div></section>';
  }

  /* ---------- router ---------- */
  function route() {
    if (!LV.get('admin', false)) { login(); return; }
    var h = (location.hash || '#dashboard').slice(1).split('/'), view = h[0], arg = h[1];
    if (!NAV.some(function (n) { return n[0] === view; })) view = 'dashboard';
    var inner = view === 'dashboard' ? dashboard() : view === 'orders' ? ordersView() : view === 'products' ? productsView() : view === 'promos' ? promosView() : view === 'quotes' ? quotesView() : settingsView();
    var keep = document.activeElement && document.activeElement.id;
    app.innerHTML = shell(view, inner) + (view === 'orders' && arg ? orderPanel(arg) : '');
    document.title = NAV.filter(function (n) { return n[0] === view; })[0][1] + ' | Admin demo | Lavazza Maldives';
    if (view === 'dashboard') bindChart();
    var ph = $('#ph');
    if (ph) ph.focus();
    else if (returnFocus) { var el = document.querySelector(returnFocus); if (el) el.focus(); returnFocus = null; }
    else if (keep && document.getElementById(keep)) { var k = document.getElementById(keep); k.focus(); if (k.setSelectionRange && k.type === 'search') k.setSelectionRange(k.value.length, k.value.length); }
  }
  function openOrder(no) { returnFocus = '[data-open="' + no + '"]'; location.hash = '#orders/' + no; }
  function closeOrder() { var no = (location.hash.split('/')[1] || ''); returnFocus = '[data-open="' + no + '"]'; location.hash = '#orders'; }

  /* ---------- events ---------- */
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-signout],[data-tab],[data-pcat],[data-open],[data-next],[data-paid],[data-cancel],[data-close],[data-reset],[data-promo-reset],tr.click');
    if (!t) return;
    if (t.hasAttribute('data-signout')) { LV.set('admin', false); route(); }
    else if (t.hasAttribute('data-tab')) { ui.ordersTab = t.dataset.tab; returnFocus = '[data-tab="' + t.dataset.tab + '"]'; route(); }
    else if (t.hasAttribute('data-pcat')) { ui.prodCat = t.dataset.pcat; returnFocus = '[data-pcat="' + t.dataset.pcat + '"]'; route(); }
    else if (t.hasAttribute('data-next')) {
      e.stopPropagation();
      if (e.detail > 1) return; // second click of a double-click: the redrawn button under the pointer is already the next step
      var o = LV.orders.get(t.dataset.next), n = nextStep(o), note = $('#note') ? $('#note').value.trim() : '';
      if (!n) return;
      LV.orders.setStatus(o.no, n, note);
      toast(o.no + ' is now: ' + LV.stepLabel(o, n));
      if (!t.hasAttribute('data-from-panel')) returnFocus = '[data-open="' + o.no + '"]';
      route();
    }
    else if (t.hasAttribute('data-paid')) { LV.orders.markPaid(t.dataset.paid); toast('Payment recorded for ' + t.dataset.paid); route(); }
    else if (t.hasAttribute('data-cancel')) {
      if (!confirm('Cancel order ' + t.dataset.cancel + '? The customer will see it as cancelled.')) return;
      var back = LV.orders.cancel(t.dataset.cancel, ($('#note') && $('#note').value.trim()) || 'Cancelled by the shop');
      toast(t.dataset.cancel + ' cancelled' + (back ? ', ' + back + ' put back in stock' : '')); route();
    }
    else if (t.hasAttribute('data-close')) closeOrder();
    else if (t.hasAttribute('data-open')) { e.stopPropagation(); openOrder(t.dataset.open); }
    else if (t.hasAttribute('data-reset')) { if (confirm('Reset all demo data in this browser?')) { var a = LV.get('admin', false); LV.resetDemo(); LV.set('admin', a); toast('Demo data reset'); route(); } }
    else if (t.hasAttribute('data-promo-reset')) { LV.setPromo(LV.promoDefault()); LV.set('stripHidden', ''); toast('Promotions back to the original'); route(); }
    else if (t.matches('tr.click') && !e.target.closest('button, a, input')) openOrder(t.dataset.no);
  });
  document.addEventListener('keydown', function (e) {
    var panel = $('.panel');
    if (!panel) return;
    if (e.key === 'Escape') closeOrder(); else LV.trapTab(e, panel);
  });

  var qT;
  app.addEventListener('input', function (e) {
    if (e.target.id === 'oq' || e.target.id === 'pq') {
      var key = e.target.id === 'oq' ? 'ordersQ' : 'prodQ', v = e.target.value;
      clearTimeout(qT); qT = setTimeout(function () { ui[key] = v; route(); }, 160);
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target, row = t.closest('#prows tr');
    if (row && t.dataset.k) {
      var id = row.dataset.id, k = t.dataset.k, patch = {};
      if (k === 'price' || k === 'stock') {
        var v = Math.round(Number(t.value)), was = LV.product(id)[k];
        if (t.value.trim() === '' || !isFinite(v) || v < 0 || (k === 'price' && v < 1)) {
          t.value = was;
          toast(k === 'price' ? 'A price has to be MVR 1 or more. Nothing was changed.' : 'Stock has to be 0 or more. Nothing was changed.');
          return;
        }
        t.value = v; patch[k] = v;
      } else if (k === 'shown') patch.hidden = !t.checked; else patch[k] = t.checked;
      LV.setOverride(id, patch);
      var p = LV.product(id), fid = t.id, fk = t.dataset.k;
      row.outerHTML = prodRow(p);
      // the row was redrawn, so put the focus back where it was
      var again = fid ? document.getElementById(fid) : document.querySelector('#prows tr[data-id="' + id + '"] [data-k="' + fk + '"]');
      if (again) again.focus();
      toast('Saved: ' + p.name);
    } else if (t.dataset.quote) { LV.quotes.setState(t.dataset.quote, t.value); toast('Updated ' + t.dataset.quote); }
  });
  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'promo-form') return;
    e.preventDefault();
    var f = e.target.elements, v = function (n) { return f.namedItem(n).value.trim(); };
    var p = LV.product(v('productId')), cur = LV.promo();
    LV.setPromo({
      strip: { on: f.namedItem('stripOn').checked, text: v('stripText'), cta: v('stripCta'), href: LV.safeHref(v('stripHref')) },
      banner: { on: f.namedItem('bannerOn').checked, eyebrow: v('eyebrow') || cur.banner.eyebrow, title: v('title') || p.name, text: v('text'), productId: p.id, cta: v('cta') || 'Shop now', kind: v('bannerLink'), href: linkFor(v('bannerLink'), p) }
    });
    LV.set('stripHidden', '');
    toast('Published. The home page now shows it.');
    var pv = $('#pv'); if (pv && pv.contentWindow) pv.contentWindow.location.reload();
  });

  // an order placed in the shop tab shows up here without a reload
  var known = LV.orders.all().length;
  LV.on('orders', function () {
    var n = LV.orders.all().length;
    if (n > known) toast('New order ' + LV.orders.all()[0].no + ' just came in');
    known = n;
    if (!LV.get('admin', false)) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return; // do not redraw under someone typing
    route();
  });
  LV.on('quotes', function () { if (LV.get('admin', false) && /#quotes|#dashboard|^$/.test(location.hash)) route(); });
  window.addEventListener('hashchange', route);
  route();
})();
