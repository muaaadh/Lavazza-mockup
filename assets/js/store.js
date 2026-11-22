/* Shared demo store for the shop and the admin.
   Everything lives in this browser's localStorage, there is no server.
   Keys are namespaced because every mockup on the same host shares one storage. */
(function () {
  'use strict';
  var NS = 'lavazza-mv:v1:';
  var LV = window.LV = window.LV || {};
  var listeners = {};

  LV.base = document.documentElement.getAttribute('data-base') || '';

  function read(k, fallback) {
    try {
      var v = localStorage.getItem(NS + k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(k, v, silent) {
    try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { /* private mode or full: keep going in memory */ mem[k] = v; }
    if (!silent) emit(k);
  }
  var mem = {};
  function get(k, fallback) { return k in mem ? mem[k] : read(k, fallback); }
  function emit(k) { (listeners[k] || []).slice().forEach(function (fn) { try { fn(k); } catch (e) { console.error(e); } }); }

  LV.on = function (k, fn) { (listeners[k] = listeners[k] || []).push(fn); };
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(NS) === 0) emit(e.key.slice(NS.length));
  });

  /* ---------- labels ---------- */
  LV.CATS = { capsules: 'Capsules & tabs', beans: 'Whole beans', ground: 'Ground coffee', machines: 'Machines', makers: 'Moka pots & makers' };
  LV.CAT_SHORT = { capsules: 'Capsules', beans: 'Beans', ground: 'Ground', machines: 'Machines', makers: 'Makers' };
  LV.SYSTEMS = { amm: 'A Modo Mio', ncc: 'Nespresso Original compatible', tabli: 'Tablì' };
  LV.ENVS = {
    resort: { label: 'Resorts & hotels', short: 'Resorts', line: 'In-villa capsules, breakfast service and the bar. Blends that hold up from the first cup at six to the last espresso after dinner.' },
    cafe: { label: 'Cafés & restaurants', short: 'Cafés', line: 'One kilo bags for the grinder. Blends with body and crema, built for a busy espresso machine and milk drinks.' },
    office: { label: 'Offices', short: 'Offices', line: 'A capsule machine in the pantry and a monthly box of capsules. No barista needed, no mess.' },
    guesthouse: { label: 'Guesthouses & liveaboards', short: 'Guesthouses', line: 'Compact machines for the breakfast corner and capsules guests already know. Sent on your island boat.' },
    home: { label: 'Home', short: 'Home', line: 'Capsules, ground coffee for the moka pot, and machines that fit a small kitchen counter.' }
  };
  LV.CLASSES = {
    everyday: { label: 'Everyday', line: 'The blends Italy drinks daily.' },
    premium: { label: 'Premium', line: 'Barista and 100% Arabica selections.' },
    signature: { label: 'Signature', line: 'Limited ranges, single projects, design machines.' }
  };
  LV.STYLES = { mild: 'Mild & smooth', balanced: 'Balanced', bold: 'Bold & intense' };
  LV.FUNCS = {
    espresso: 'Espresso', lungo: 'Long coffee', milk: 'Milk frother', programmable: 'Programmable doses',
    grinder: 'Bean to cup grinder', app: 'App connected', voice: 'Voice assistant', autoOff: 'Auto shut-off', compact: 'Compact'
  };

  LV.styleOf = function (p) {
    if (p.intensity && p.scale) {
      var r = p.intensity / p.scale;
      return r <= 0.5 ? 'mild' : r <= 0.75 ? 'balanced' : 'bold';
    }
    if (!p.roast) return null;
    var ro = p.roast.toLowerCase();
    return ro.indexOf('light') >= 0 ? 'mild' : ro.indexOf('dark') >= 0 ? 'bold' : 'balanced';
  };
  /* intensity on one 0..10 scale, so a 13 point capsule and a 10 point bag can share a slider */
  LV.strength = function (p) {
    if (p.intensity && p.scale) return Math.round(p.intensity / p.scale * 100) / 10;
    var s = LV.styleOf(p);
    return s === 'mild' ? 4 : s === 'bold' ? 9 : s ? 6.5 : null;
  };

  /* ---------- catalogue with admin overrides ---------- */
  LV.overrides = function () { return get('overrides', {}); };
  LV.setOverride = function (id, patch) {
    var o = LV.overrides();
    o[id] = Object.assign({}, o[id], patch);
    write('overrides', o);
  };
  LV.products = function (opts) {
    var o = LV.overrides();
    var list = (window.LV_CATALOGUE || []).map(function (p) { return Object.assign({}, p, o[p.id]); });
    return opts && opts.all ? list : list.filter(function (p) { return !p.hidden; });
  };
  LV.product = function (id) {
    return LV.products({ all: true }).filter(function (p) { return p.id === id; })[0] || null;
  };
  LV.img = function (p, suffix) { return LV.base + 'assets/img/products/' + (typeof p === 'string' ? p : p.id) + (suffix || '') + '.webp'; };
  LV.sysShort = function (p) {
    if (p.category === 'machines') return p.system === 'beans' ? 'Bean to cup machine' : LV.SYSTEMS[p.system].replace('Nespresso Original compatible', 'Nespresso Original') + ' machine';
    if (p.category === 'makers') return 'Moka pots & makers';
    if (p.category === 'capsules') return p.system === 'ncc' ? 'For Nespresso Original' : LV.SYSTEMS[p.system];
    return LV.CATS[p.category];
  };
  LV.subline = function (p) {
    if (p.category === 'machines') return p.system === 'beans' ? 'Bean to cup machine' : (LV.SYSTEMS[p.system] || '') + ' machine';
    if (p.category === 'makers') return 'For ground coffee';
    var sys = p.category === 'capsules' ? LV.SYSTEMS[p.system] : LV.CATS[p.category];
    return sys + (p.pack ? ' · ' + p.pack : '');
  };

  /* ---------- small helpers ---------- */
  // "qualita" finds "Qualità", "tabli" finds "Tablì"
  LV.fold = function (t) { return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  // promo links are stored text: only ever follow them to this site's own pages
  LV.safeHref = function (h) { return /^(shop|product|track|index)\.html([?#][\w=&,.%#-]*)?$/.test(h || '') ? h : 'shop.html'; };

  /* ---------- formatting ---------- */
  LV.money = function (n) { return 'MVR ' + Math.round(n).toLocaleString('en-US'); };
  LV.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  LV.date = function (t, withTime) {
    var d = new Date(t);
    var s = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Indian/Maldives' });
    if (withTime) s += ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Maldives' });
    return s;
  };

  /* ---------- cart ---------- */
  LV.cart = {
    raw: function () { return get('cart', []); },
    // only what can really be bought: a product the admin hid or that sold out drops out, and no line is larger than the stock
    items: function () {
      return LV.cart.raw().map(function (l) {
        var p = LV.product(l.id);
        if (!p || p.hidden || p.stock <= 0) return null;
        var q = Math.min(l.qty, p.stock);
        return { id: l.id, qty: q, product: p, total: p.price * q };
      }).filter(Boolean);
    },
    count: function () { return LV.cart.items().reduce(function (n, l) { return n + l.qty; }, 0); },
    subtotal: function () { return LV.cart.items().reduce(function (n, l) { return n + l.total; }, 0); },
    add: function (id, qty) {
      var p = LV.product(id);
      if (!p || p.hidden || p.stock <= 0) return 0;
      var c = LV.cart.raw(), l = c.filter(function (x) { return x.id === id; })[0], cap = Math.min(99, p.stock);
      var before = l ? Math.min(l.qty, cap) : 0, after = Math.min(cap, before + (qty || 1));
      if (l) l.qty = after; else c.push({ id: id, qty: after });
      write('cart', c);
      return after - before; // how many were really added
    },
    set: function (id, qty) {
      var p = LV.product(id), cap = p ? Math.min(99, p.stock) : 0;
      var c = LV.cart.raw().map(function (x) { return x.id === id ? { id: id, qty: Math.max(0, Math.min(cap, qty)) } : x; })
        .filter(function (x) { return x.qty > 0; });
      write('cart', c);
    },
    clear: function () { write('cart', []); }
  };

  /* ---------- delivery (sample fees) ---------- */
  LV.ZONES = {
    male: { label: 'Malé', fee: 25, freeOver: 500, eta: 'Same or next day', moving: 'Out for delivery', done: 'Delivered', ask: 'Building, floor and road' },
    hulhumale: { label: 'Hulhumalé', fee: 35, freeOver: 750, eta: 'Next day', moving: 'Out for delivery', done: 'Delivered', ask: 'Building, flat and lot number' },
    villimale: { label: 'Villimalé', fee: 35, freeOver: 750, eta: 'Next day', moving: 'Out for delivery', done: 'Delivered', ask: 'House name and road' },
    atoll: { label: 'Other islands, by boat', fee: 75, freeOver: 2500, eta: 'Handed to your island boat within 1 working day', moving: 'Handed to the boat', done: 'Received on the island', ask: 'Atoll, island and the boat you use' },
    resort: { label: 'Resort', fee: 0, freeOver: 0, eta: 'To your Malé office or supply boat within 1 working day', moving: 'With your supply boat', done: 'Received at the resort', ask: 'Resort name and Malé office or supply boat' },
    pickup: { label: 'Collect in store', fee: 0, freeOver: 0, eta: 'Ready in 2 hours during opening times', moving: 'Ready to collect', done: 'Collected', ask: '' }
  };
  LV.deliveryFee = function (zone, subtotal) {
    var z = LV.ZONES[zone];
    if (!z) return 0;
    return z.fee && subtotal >= z.freeOver && z.freeOver ? 0 : z.fee;
  };
  LV.GST = 0.08;
  LV.gstIn = function (total) { return total * LV.GST / (1 + LV.GST); };

  /* ---------- payment methods ---------- */
  LV.PAY = {
    card: { label: 'Card', line: 'Visa, Mastercard or Amex through the payment gateway.' },
    transfer: { label: 'Bank transfer', line: 'Transfer to our account and upload the slip. We confirm it within working hours.' },
    cod: { label: 'Cash on delivery', line: 'Pay the rider in cash or by card. Malé, Hulhumalé and Villimalé only.', zones: ['male', 'hulhumale', 'villimale', 'pickup'] },
    invoice: { label: 'On account (business)', line: 'For approved business accounts. We send an invoice with your credit terms.', business: true }
  };

  /* ---------- orders ---------- */
  LV.STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
  LV.stepLabel = function (order, step) {
    var z = LV.ZONES[order.zone] || LV.ZONES.male;
    return { placed: 'Order placed', confirmed: 'Confirmed', packed: 'Packed', shipped: z.moving, delivered: z.done, cancelled: 'Cancelled' }[step];
  };
  LV.payLabel = function (order) {
    var m = LV.PAY[order.pay.method].label, paid = order.pay.state === 'paid';
    if (order.status === 'cancelled') return paid ? 'Paid · ' + m + ', to be refunded' : 'Nothing was charged';
    return paid ? 'Paid · ' + m : order.pay.method === 'cod' ? (order.zone === 'pickup' ? 'Pay when you collect' : 'Pay on delivery') : order.pay.method === 'invoice' ? 'On account' : 'Awaiting ' + m.toLowerCase();
  };
  LV.orders = {
    all: function () { LV.seed(); return get('orders', []); },
    get: function (no) {
      var m = String(no || '').match(/\d{4,}/); // accepts LVZ-24027, lvz 24027, #24027
      no = m ? 'LVZ-' + m[0] : '';
      return LV.orders.all().filter(function (o) { return o.no === no; })[0] || null;
    },
    save: function (list) { write('orders', list); },
    create: function (o) {
      var list = LV.orders.all();
      var n = get('counter', 24031) + 1;
      write('counter', n);
      o.no = 'LVZ-' + n;
      o.created = Date.now();
      o.status = 'placed';
      o.events = [{ t: o.created, status: 'placed', note: '' }];
      if (o.pay.state === 'paid') {
        o.status = 'confirmed';
        o.events.push({ t: o.created + 1000, status: 'confirmed', note: 'Card payment approved, ref ' + o.pay.ref });
      }
      // take the stock down so the admin sees it move, and note how much each line took so a cancel can put back exactly that
      o.items.forEach(function (l) {
        var p = LV.product(l.id);
        l.taken = p ? Math.min(p.stock, l.qty) : 0;
      });
      list.unshift(o);
      LV.orders.save(list);
      o.items.forEach(function (l) {
        var p = LV.product(l.id);
        if (p && l.taken) LV.setOverride(l.id, { stock: p.stock - l.taken });
      });
      return o;
    },
    update: function (no, fn) {
      var list = LV.orders.all(), hit = null;
      list.forEach(function (o) { if (o.no === no) { fn(o); hit = o; } });
      LV.orders.save(list);
      return hit;
    },
    setStatus: function (no, status, note) {
      return LV.orders.update(no, function (o) {
        o.status = status;
        o.events.push({ t: Date.now(), status: status, note: note || '' });
        if (status === 'delivered' && o.pay.method === 'cod') o.pay.state = 'paid';
      });
    },
    cancel: function (no, note) {
      var back = 0;
      var o = LV.orders.update(no, function (o) {
        o.status = 'cancelled';
        o.events.push({ t: Date.now(), status: 'cancelled', note: note || '' });
      });
      if (o) o.items.forEach(function (l) {
        var p = LV.product(l.id);
        if (p && l.taken) { LV.setOverride(l.id, { stock: p.stock + l.taken }); back += l.taken; }
      });
      if (o) LV.orders.update(no, function (o) { o.items.forEach(function (l) { l.taken = 0; }); });
      return back;
    },
    markPaid: function (no, note) {
      return LV.orders.update(no, function (o) {
        o.pay.state = 'paid';
        o.events.push({ t: Date.now(), status: 'paid', note: note || 'Payment received' });
      });
    }
  };

  /* ---------- promotions the admin can edit ---------- */
  var PROMO_DEFAULT = {
    strip: { on: true, text: 'New release: Tablì, the coffee tab with no capsule.', cta: 'See Tablì', href: 'shop.html?system=tabli' },
    banner: {
      on: true, eyebrow: 'New release', title: 'Tablì. Coffee and nothing else.',
      text: 'A pressed tab of 100% coffee with no capsule around it. A new machine made only for it, with app and voice control.',
      productId: 'm-tabli', cta: 'Shop Tablì', kind: 'range', href: 'shop.html?system=tabli'
    }
  };
  LV.promoDefault = function () { return JSON.parse(JSON.stringify(PROMO_DEFAULT)); };
  LV.promo = function () {
    var s = get('promo', null), d = LV.promoDefault();
    if (!s) return d;
    return { strip: Object.assign(d.strip, s.strip), banner: Object.assign(d.banner, s.banner) };
  };
  LV.setPromo = function (p) { write('promo', p); };

  /* ---------- business quote requests ---------- */
  LV.quotes = {
    all: function () { LV.seed(); return get('quotes', []); },
    add: function (q) {
      var l = LV.quotes.all(), top = l.reduce(function (m, x) { return Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0); }, 1040);
      q.t = Date.now(); q.id = 'Q-' + (top + 1); q.state = 'new';
      l.unshift(q); write('quotes', l);
      return q;
    },
    setState: function (id, state) { var l = LV.quotes.all(); l.forEach(function (q) { if (q.id === id) q.state = state; }); write('quotes', l); }
  };

  /* ---------- sample data so the admin and tracker are not empty ---------- */
  var seeding = false;
  LV.seed = function () {
    if (seeding || get('seeded', false)) return;
    seeding = true; // listeners must not run while the sample data is half written
    var rnd = (function (s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })(20261123);
    var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
    var people = [
      ['Aishath Raufa', 'home', 'male', 'H. Meheli, 3rd floor, Majeedhee Magu'], ['Ahmed Nazim', 'home', 'hulhumale', 'Flat 7-2-04, Lot 10745'],
      ['Mariyam Shifa', 'home', 'male', 'M. Finivaage, Orchid Magu'], ['Ibrahim Rasheed', 'home', 'villimale', 'Saima, Jambu Magu'],
      ['Sample Island Guesthouse', 'guesthouse', 'atoll', 'K. Maafushi, on the Maafushi ferry'], ['Sample Dive Liveaboard', 'guesthouse', 'atoll', 'Hulhumalé lagoon, boat MV Sample'],
      ['Sample Resort and Spa', 'resort', 'resort', 'Baa Atoll, Malé office at Boduthakurufaanu Magu'], ['Sample Lagoon Resort', 'resort', 'resort', 'North Malé Atoll, supply boat at T-Jetty'],
      ['Sample Café', 'cafe', 'male', 'Ameenee Magu, ground floor'], ['Sample Bistro', 'cafe', 'hulhumale', 'Nirolhu Magu, Lot 10212'],
      ['Sample Trading Pvt Ltd', 'office', 'male', '4th floor, Chaandhanee Magu'], ['Sample Law Office', 'office', 'male', '2nd floor, Fareedhee Magu'],
      ['Fathimath Zeena', 'home', 'pickup', ''], ['Hassan Ali', 'home', 'atoll', 'Addu City, Hithadhoo, cargo boat'],
      ['Aminath Leesha', 'home', 'hulhumale', 'Flat 12-3-01, Lot 11302'], ['Mohamed Shiyam', 'home', 'male', 'G. Haalam, Lonuziyaaraiy Magu']
    ];
    var all = LV.products({ all: true });
    var byEnv = function (env) { return all.filter(function (p) { return p.env.indexOf(env) >= 0; }); };
    var now = Date.now(), H = 3600e3, orders = [];
    // newest first: hours ago, and how far each order has got
    var plan = [[1.5, 'placed'], [3, 'confirmed'], [5, 'confirmed'], [9, 'packed'], [22, 'packed'], [26, 'shipped'], [30, 'shipped'], [47, 'shipped'],
      [52, 'delivered'], [70, 'delivered'], [75, 'delivered'], [98, 'delivered'], [120, 'cancelled'], [124, 'delivered'], [146, 'delivered'], [170, 'delivered'],
      [175, 'delivered'], [196, 'delivered'], [220, 'delivered'], [242, 'delivered'], [250, 'delivered'], [270, 'delivered'], [292, 'delivered'], [300, 'delivered'],
      [315, 'delivered'], [322, 'delivered'], [330, 'delivered']];
    plan.forEach(function (pl, i) {
      var who = people[i % people.length], env = who[1], pool = byEnv(env), items = [], seen = {};
      var lines = env === 'home' ? 1 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 3);
      for (var k = 0; k < lines; k++) {
        var p = pick(pool);
        if (seen[p.id]) continue;
        seen[p.id] = 1;
        var big = env !== 'home' && p.category !== 'machines' && p.category !== 'makers';
        items.push({ id: p.id, name: p.name, sub: LV.subline(p), price: p.price, qty: p.category === 'machines' ? 1 : big ? 4 + Math.floor(rnd() * 12) : 1 + Math.floor(rnd() * 3) });
      }
      var subtotal = items.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
      var fee = LV.deliveryFee(who[2], subtotal);
      var biz = env !== 'home';
      var method = biz ? pick(['invoice', 'invoice', 'transfer', 'card']) : pick(['card', 'card', 'cod', 'transfer']);
      if (method === 'cod' && LV.PAY.cod.zones.indexOf(who[2]) < 0) method = 'card';
      var created = now - pl[0] * H, status = pl[1];
      if (status === 'placed' && method === 'card') method = biz ? 'invoice' : 'transfer'; // a paid card order confirms itself
      var paid = method === 'card' || (method === 'transfer' && status !== 'placed') || (method === 'cod' && status === 'delivered') || (method === 'invoice' && status === 'delivered' && pl[0] > 200);
      var o = {
        no: '', created: created, status: status,
        customer: { name: biz ? 'Purchasing' : who[0], phone: '7' + String(700000 + Math.floor(rnd() * 299999)), email: '', business: biz, company: biz ? who[0] : '', tin: '' },
        zone: who[2], address: who[3], note: '', items: items, subtotal: subtotal, fee: fee, total: subtotal + fee,
        pay: { method: method, state: paid ? 'paid' : 'pending', ref: method === 'card' ? 'DEMO' + Math.floor(100000 + rnd() * 899999) : '' },
        sample: true, events: []
      };
      var chain = status === 'cancelled' ? ['placed', 'confirmed', 'cancelled'] : LV.STEPS.slice(0, LV.STEPS.indexOf(status) + 1);
      var near = ['male', 'hulhumale', 'villimale', 'pickup'].indexOf(who[2]) >= 0;
      var gap = Math.min(pl[0] * H / (chain.length + 0.5), (near ? 5 : 18) * H); // Greater Malé: delivered within a day
      chain.forEach(function (st, j) {
        var note = st === 'shipped' && who[2] === 'atoll' ? 'Handed to the boat crew in Malé' : st === 'cancelled' ? 'Customer asked to cancel' : '';
        o.events.push({ t: created + j * gap, status: st, note: note });
      });
      orders.push(o);
    });
    // number them so the newest has the highest number
    orders.forEach(function (o, i) { o.no = 'LVZ-' + (24000 + orders.length - i); });
    write('orders', orders, true);
    write('counter', 24000 + orders.length, true);
    write('quotes', [
      { id: 'Q-1040', t: now - 20 * H, state: 'new', name: 'Sample Resort and Spa', contact: 'Purchasing manager', phone: '7780000', env: 'resort', volume: '40 kg beans and 6,000 capsules a month', message: 'Looking for in-villa capsules for 120 villas and beans for two outlets.' },
      { id: 'Q-1039', t: now - 68 * H, state: 'replied', name: 'Sample Café', contact: 'Owner', phone: '7790000', env: 'cafe', volume: '25 kg beans a month', message: 'Opening in Hulhumalé next month. Need a blend for milk drinks.' }
    ], true);
    write('seeded', true, true);
    seeding = false;
  };

  LV.resetDemo = function () {
    ['cart', 'orders', 'counter', 'quotes', 'overrides', 'promo', 'seeded', 'admin', 'last', 'stripHidden'].forEach(function (k) {
      try { localStorage.removeItem(NS + k); } catch (e) { /* ignore */ }
      delete mem[k];
    });
    LV.seed();
    ['cart', 'orders', 'quotes', 'overrides', 'promo'].forEach(emit);
  };

  LV.get = get;
  LV.set = write;
})();
