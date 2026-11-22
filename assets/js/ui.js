/* Shared page parts: promo strip, header, cart drawer, footer, product cards, scroll reveals. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, B = LV.base;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  LV.$ = $; LV.$$ = $$;

  /* ---------- icons ---------- */
  var I = function (d, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + d + '</svg>'; };
  LV.icon = {
    arrow: I('<path d="M4 12h15M13 6l6 6-6 6"/>', ' class="arr"'),
    go: I('<path d="M4 12h15M13 6l6 6-6 6"/>'),
    check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    x: I('<path d="M6 6l12 12M18 6L6 18"/>'),
    bag: I('<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>'),
    box: I('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>'),
    boat: I('<path d="M3 15h18l-2.2 4.5H5.2L3 15z"/><path d="M12 15V4l6 8h-6M12 6L7 12h5"/>'),
    truck: I('<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.5h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'),
    card: I('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19M6 15h4"/>'),
    cup: I('<path d="M4 9h13v4a6 6 0 01-6 6h-1a6 6 0 01-6-6V9z"/><path d="M17 10h1.5a2.5 2.5 0 010 5H17M8 3c-1 1 1 2 0 3M12 3c-1 1 1 2 0 3"/>'),
    receipt: I('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>'),
    lock: I('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>'),
    pin: I('<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    clock: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    milk: I('<path d="M8 3h8v3l2 4v11H6V10l2-4V3z"/><path d="M6 13c2-1.5 4 1.5 6 0s4 1.5 6 0"/>'),
    grinder: I('<path d="M7 3h10l-2 6H9L7 3zM8 9h8v9a3 3 0 01-3 3h-2a3 3 0 01-3-3V9z"/><path d="M10.5 14h3"/>'),
    app: I('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18h3"/>'),
    voice: I('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3"/>'),
    power: I('<path d="M12 3v8"/><path d="M7 6.5a7.5 7.5 0 1010 0"/>'),
    compact: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="9" y="9" width="6" height="6"/>'),
    dose: I('<path d="M5 8h9v5a4.5 4.5 0 01-9 0V8z"/><path d="M14 9h1.5a2 2 0 010 4H14"/><path d="M17.5 17h3M19 15.5v3"/>'),
    long: I('<path d="M7 4h10l-1 16H8L7 4z"/><path d="M7.4 10h9.2"/>'),
    espresso: I('<path d="M5 10h11v3a5 5 0 01-5 5h-1a5 5 0 01-5-5v-3z"/><path d="M16 11h1.5a2 2 0 010 4H16M4 21h13"/>'),
    filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    search: I('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    building: I('<path d="M4 21V5l8-2v18M12 9l8 2v10M2.5 21h19M7.5 8v.01M7.5 12v.01M7.5 16v.01M16 14v.01M16 17.5v.01"/>'),
    leaf: I('<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>'),
    mail: I('<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 7l8.5 6.5L20.5 7"/>')
  };
  LV.FUNC_ICON = { espresso: 'espresso', lungo: 'long', milk: 'milk', programmable: 'dose', grinder: 'grinder', app: 'app', voice: 'voice', autoOff: 'power', compact: 'compact' };

  LV.logo = function (kind) {
    var b = window.LV_BRAND[kind || 'logo'];
    return '<svg viewBox="0 0 ' + b.w + ' 1024" fill="currentColor" role="img" aria-label="Lavazza"><path transform="translate(0 960) scale(1 -1)" d="' + b.d + '"/></svg>';
  };

  /* ---------- product bits ---------- */
  LV.intensity = function (p) {
    if (!p.intensity) return '';
    var s = '';
    for (var i = 1; i <= p.scale; i++) s += '<i' + (i <= p.intensity ? ' class="on"' : '') + '></i>';
    return '<div class="int" role="img" aria-label="Intensity ' + p.intensity + ' out of ' + p.scale + '"><span class="int-bar">' + s + '</span><span>Intensity ' + p.intensity + '/' + p.scale + '</span></div>';
  };
  LV.tags = function (p) {
    var t = '';
    if (p.stock <= 0) t += '<span class="tag tag-out">Out of stock</span>';
    if (p.isNew) t += '<span class="tag tag-new">New</span>';
    if (p.best) t += '<span class="tag tag-best">Best seller</span>';
    return t ? '<div class="tags">' + t + '</div>' : '';
  };
  LV.notesLine = function (p) {
    if (p.category === 'machines') return (p.funcs || []).filter(function (f) { return f !== 'espresso' && f !== 'autoOff'; }).slice(0, 2).map(function (f) { return LV.FUNCS[f]; }).join(' · ') || 'Espresso';
    if (p.category === 'makers') return 'For the stove or the table';
    var bits = (p.notes || []).slice(0, 2);
    if (p.roast) bits.push(p.roast + ' roast');
    return bits.join(' · ');
  };
  LV.url = function (p) { return B + 'product.html?id=' + encodeURIComponent(p.id); };
  LV.addBtn = function (p, cls) {
    return p.stock <= 0
      ? '<button class="btn btn-sm ' + (cls || '') + '" disabled>Sold out</button>'
      : '<button class="btn btn-sm pc-add ' + (cls || '') + '" data-add="' + esc(p.id) + '" aria-label="Add ' + esc(p.name) + ' to cart">Add</button>';
  };
  LV.card = function (p, i) {
    return '<article class="pc" style="--i:' + (i || 0) + '">' +
      '<div class="pc-media">' + LV.tags(p) + '<img loading="lazy" decoding="async" src="' + LV.img(p) + '" alt="' + esc(p.name) + ', ' + esc(LV.subline(p)) + '"></div>' +
      '<div class="pc-meta"><span>' + esc(LV.sysShort(p)) + '</span><span>' + esc(p.pack || '') + '</span></div>' +
      '<div class="pc-body">' +
      '<h3 class="pc-name"><a href="' + LV.url(p) + '">' + esc(p.name) + '</a></h3>' +
      '<p class="pc-notes">' + esc(LV.notesLine(p)) + '</p>' + LV.intensity(p) +
      '<div class="pc-foot"><span class="pc-price">' + LV.money(p.price) + '</span>' + LV.addBtn(p) + '</div>' +
      '</div></article>';
  };

  /* ---------- toast ---------- */
  var toastT;
  LV.toast = function (msg, actionLabel, action) {
    var t = $('.toast');
    if (!t) return;
    t.textContent = '';
    var s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    if (actionLabel) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = actionLabel;
      b.addEventListener('click', function () { t.classList.remove('is-on'); action(); });
      t.appendChild(b);
    }
    t.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('is-on'); }, 3600);
  };

  /* ---------- chrome ---------- */
  var NAV = [
    ['Capsules', 'shop.html?cat=capsules', 'capsules'], ['Beans', 'shop.html?cat=beans', 'beans'],
    ['Machines', 'shop.html?cat=machines', 'machines'], ['Business', 'index.html#business', 'business']
  ];
  var FOOT = [
    ['Capsules', 'A Modo Mio, Nespresso Original, Tablì', 'shop.html?cat=capsules'],
    ['Beans & ground', 'For grinders and moka pots', 'shop.html?cat=beans,ground'],
    ['Machines', 'Capsule and bean to cup', 'shop.html?cat=machines'],
    ['For business', 'Resorts, cafés, offices', 'index.html#business'],
    ['Track order', 'Where is my coffee', 'track.html'],
    ['Admin demo', 'Orders, products, promos', 'admin/index.html']
  ];

  function stripHTML() {
    var s = LV.promo().strip;
    if (!s.on || !s.text || LV.get('stripHidden', '') === s.text) return '';
    return '<div class="strip" role="region" aria-label="Announcement"><div class="wrap"><span class="strip-new">New</span><span>' + esc(s.text) + '</span>' +
      (s.cta ? '<a href="' + esc(B + LV.safeHref(s.href)) + '">' + esc(s.cta) + '</a>' : '') +
      '</div><button class="strip-x" aria-label="Hide announcement">&times;</button></div>';
  }

  function headerHTML(opts) {
    return '<header class="hdr' + (opts.over ? ' is-over' : '') + '"><div class="wrap">' +
      '<nav class="hdr-nav" aria-label="Main">' + NAV.map(function (n) {
        return '<a href="' + B + n[1] + '"' + (opts.active === n[2] ? ' aria-current="page"' : '') + '>' + n[0] + '</a>';
      }).join('') + '</nav>' +
      '<a class="hdr-logo" href="' + B + 'index.html" aria-label="Lavazza Maldives, home">' + LV.logo() + '</a>' +
      '<div class="hdr-right">' +
      '<a class="hdr-link track" href="' + B + 'track.html"' + (opts.active === 'track' ? ' aria-current="page"' : '') + '>Track order</a>' +
      '<button class="hdr-link hdr-cart" type="button" data-cart-open aria-haspopup="dialog">Cart <b data-cart-count aria-live="polite">0</b></button>' +
      '<a class="btn btn-sm hdr-shop" href="' + B + 'shop.html">Shop</a>' +
      '<button class="hdr-menu" type="button" aria-label="Open menu" aria-expanded="false"><span></span></button>' +
      '</div></div></header>';
  }

  function mnavHTML() {
    var items = [['Capsules', 'shop.html?cat=capsules'], ['Beans', 'shop.html?cat=beans'], ['Ground coffee', 'shop.html?cat=ground'], ['Machines', 'shop.html?cat=machines'], ['For business', 'index.html#business'], ['Track order', 'track.html']];
    return '<div class="mnav" id="mnav" aria-hidden="true"><div class="mnav-top">' + LV.logo() + '<button class="mnav-close" aria-label="Close menu">&times;</button></div><ol>' +
      items.map(function (n, i) { return '<li><a href="' + B + n[1] + '"><span>0' + (i + 1) + '</span><b>' + n[0] + '</b></a></li>'; }).join('') +
      '</ol></div>';
  }

  function drawerHTML() {
    return '<div class="scrim" data-cart-close></div>' +
      '<aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-label="Your cart" aria-hidden="true">' +
      '<div class="drawer-head"><h2>Your cart</h2><button class="x" data-cart-close aria-label="Close cart">&times;</button></div>' +
      '<div class="drawer-body"></div><div class="drawer-foot"></div></aside>' +
      '<div class="toast" role="status" aria-live="polite"></div>';
  }

  function footerHTML() {
    return '<footer class="ftr"><div class="wrap"><div class="ftr-top">' +
      '<div><div class="ftr-nav-head"><span class="eyebrow">Explore Lavazza</span><span class="eyebrow">Torino, Italia, 1895</span></div>' +
      '<nav class="ftr-nav" aria-label="Footer">' + FOOT.map(function (f, i) {
        return '<a href="' + B + f[2] + '"><small>(0' + (i + 1) + ')</small><b>' + f[0] + '</b><i>' + f[1] + '</i><span class="go">' + LV.icon.go + '</span></a>';
      }).join('') + '</nav></div>' +
      '<div class="ftr-side"><span class="eyebrow">Stay in the loop</span>' +
      '<p class="big">New blends, machine offers and restock alerts. One message a month.</p>' +
      '<form class="ftr-news" data-news>' + LV.icon.mail.replace('<svg', '<svg width="22" height="22"') + '<label class="sr" for="news-email">Email address</label><input id="news-email" type="email" placeholder="Your email address" required><button class="btn btn-sm btn-ghost" type="submit">Subscribe</button></form>' +
      '<div class="ftr-cols">' +
      '<div><h4>Visit</h4><p>Showroom, Malé</p><p class="dim">Address to be confirmed</p></div>' +
      '<div><h4>Hours</h4><p>Opening hours</p><p class="dim">To be confirmed</p></div>' +
      '<div><h4>Contact</h4><p>Phone and Viber</p><p class="dim">To be confirmed</p></div>' +
      '<div><h4>Follow</h4><a href="https://www.instagram.com/lavazzausa/" target="_blank" rel="noopener">Instagram</a><a href="https://www.lavazza.com/en" target="_blank" rel="noopener">lavazza.com</a></div>' +
      '</div></div></div>' +
      '<div class="ftr-base"><span>&copy; ' + new Date().getFullYear() + ' Lavazza Maldives. Prices in MVR, GST included.</span><span><a href="' + B + 'track.html">Track order</a> &nbsp; <a href="' + B + 'admin/index.html">Admin demo</a></span>' +
      '<a class="ftr-top-btn" href="#top">Back to top <span>' + LV.icon.go + '</span></a></div></div>' +
      '<div class="ftr-mark" aria-hidden="true">' + LV.logo() + '<img loading="lazy" src="' + LV.img('m-jolie-milk-evo') + '" alt=""></div>' +
      '<div class="demo-note">Concept demo. Prices, stock, orders and payments are samples and nothing is charged. Product details from lavazza.com.</div></footer>';
  }

  /* ---------- cart drawer ---------- */
  var lastFocus = null;
  function renderCart() {
    var body = $('#cart .drawer-body'), foot = $('#cart .drawer-foot');
    if (!body) return;
    var items = LV.cart.items(), count = LV.cart.count();
    $$('[data-cart-count]').forEach(function (b) {
      if (b.textContent !== String(count)) { b.textContent = count; b.classList.add('bump'); setTimeout(function () { b.classList.remove('bump'); }, 320); }
    });
    if (!items.length) {
      body.innerHTML = '<div class="empty"><b>Nothing here yet</b><p>Add capsules, beans or a machine and they will wait here.</p><p style="margin-top:18px"><a class="btn" href="' + B + 'shop.html">Shop coffee ' + LV.icon.arrow + '</a></p></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = items.map(function (l) {
      return '<div class="line" data-line="' + esc(l.id) + '"><img src="' + LV.img(l.product) + '" alt="">' +
        '<div><b>' + esc(l.product.name) + '</b><small>' + esc(LV.subline(l.product)) + '</small>' +
        '<div class="qty" role="group" aria-label="Quantity of ' + esc(l.product.name) + '"><button type="button" data-q="-1" aria-label="One less">&minus;</button><span aria-live="polite">' + l.qty + '</span><button type="button" data-q="1" aria-label="One more">+</button></div></div>' +
        '<div class="amt">' + LV.money(l.total) + '<br><button type="button" class="rm" data-rm>Remove</button></div></div>';
    }).join('');
    var sub = LV.cart.subtotal(), z = LV.ZONES.male, left = Math.max(0, z.freeOver - sub);
    foot.innerHTML = '<div class="ship-meter" style="--p:' + Math.min(1, sub / z.freeOver) + '">' +
      (left ? 'Add <b>' + LV.money(left) + '</b> for free delivery in Malé' : '<b>Free delivery in Malé</b> on this order') + '<div><i></i></div></div>' +
      '<div class="sum-row total"><span>Subtotal</span><span>' + LV.money(sub) + '</span></div>' +
      '<div class="sum-row"><small>GST included. Delivery is worked out at checkout.</small></div>' +
      '<a class="btn btn-block" href="' + B + 'checkout.html">Checkout ' + LV.icon.arrow + '</a>';
  }
  LV.openCart = function () {
    lastFocus = document.activeElement;
    renderCart();
    $('#cart').classList.add('is-open'); $('.scrim').classList.add('is-open');
    $('#cart').setAttribute('aria-hidden', 'false');
    setTimeout(function () { var x = $('#cart .x'); if (x) x.focus(); }, 60);
  };
  LV.closeCart = function () {
    var c = $('#cart');
    if (!c || !c.classList.contains('is-open')) return;
    c.classList.remove('is-open'); $('.scrim').classList.remove('is-open');
    c.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  /* ---------- reveal engine ---------- */
  var io = null, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function split(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'); o.className = 'sp-w';
            var w = document.createElement('span'); w.className = 'sp-word'; w.style.setProperty('--w', n++); w.textContent = part;
            o.appendChild(w); frag.appendChild(o);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
  }
  LV.observe = function (root) {
    $$('[data-split]', root).forEach(split);
    var els = $$('[data-reveal], [data-split]', root).filter(function (e) { return !e.classList.contains('is-in'); });
    if (!io || reduce) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    els.forEach(function (e) {
      // the hero is on screen from the start: play it on load, do not wait for the scroll observer
      if (e.closest('.hero')) requestAnimationFrame(function () { e.classList.add('is-in'); }); else io.observe(e);
    });
  };

  /* keep Tab inside a drawer, menu or panel while it is open */
  LV.trapTab = function (e, box) {
    if (e.key !== 'Tab' || !box) return;
    var f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', box)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  /* horizontal rail: drag with the mouse, arrows, wheel left to the browser */
  LV.rail = function (rail, prev, next) {
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 6) { rail.classList.add('is-drag'); rail.scrollLeft = sl - dx; }
    });
    window.addEventListener('pointerup', function () { down = false; setTimeout(function () { rail.classList.remove('is-drag'); }, 0); });
    rail.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    var step = function (dir) { var c = rail.firstElementChild; rail.scrollBy({ left: dir * (c ? c.getBoundingClientRect().width : 300) * 2, behavior: 'smooth' }); };
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
  };

  /* ---------- mount ---------- */
  LV.mount = function (opts) {
    opts = opts || {};
    LV.seed();
    var strip = stripHTML();
    document.body.insertAdjacentHTML('afterbegin', '<a class="sr" href="#main">Skip to content</a><span id="top"></span>' + strip + headerHTML(opts) + mnavHTML());
    document.body.insertAdjacentHTML('beforeend', (opts.footer === false ? '' : footerHTML()) + drawerHTML());
    if (strip) {
      document.documentElement.classList.add('has-strip');
      // the strip can wrap to two lines on a phone, so the header and hero follow its real height
      var fit = function () { var el = $('.strip'); if (el) document.documentElement.style.setProperty('--strip-h', el.offsetHeight + 'px'); };
      fit(); window.addEventListener('resize', fit);
    }

    // announcement
    var sx = $('.strip-x');
    if (sx) sx.addEventListener('click', function () {
      LV.set('stripHidden', LV.promo().strip.text);
      $('.strip').remove(); document.documentElement.classList.remove('has-strip');
      if (LV.fitHeader) LV.fitHeader();
    });

    // header state over the hero
    var hdr = $('.hdr');
    if (opts.over) {
      var onScroll = function () {
        var st = $('.strip'), sh = st ? st.offsetHeight : 0, y = window.scrollY;
        hdr.style.top = Math.max(0, sh - y) + 'px'; // sit under the announcement bar until it has scrolled away
        hdr.classList.toggle('is-stuck', y > Math.max(40, sh));
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      LV.fitHeader = onScroll; onScroll();
    }

    // mobile menu
    var mnav = $('#mnav'), mbtn = $('.hdr-menu');
    var setMenu = function (open) {
      mnav.classList.toggle('is-open', open); mnav.setAttribute('aria-hidden', String(!open)); mbtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) $('.mnav-close').focus(); else mbtn.focus();
    };
    mbtn.addEventListener('click', function () { setMenu(true); });
    $('.mnav-close').addEventListener('click', function () { setMenu(false); });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

    // cart
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cart-open], [data-cart-close], [data-add], [data-q], [data-rm]');
      if (!t) return;
      if (t.hasAttribute('data-cart-open')) { e.preventDefault(); LV.openCart(); }
      else if (t.hasAttribute('data-cart-close')) LV.closeCart();
      else if (t.hasAttribute('data-add')) {
        e.preventDefault();
        var id = t.getAttribute('data-add'), p = LV.product(id), qty = parseInt(t.getAttribute('data-qty') || '1', 10) || 1;
        if (!p || p.stock <= 0) return;
        var added = LV.cart.add(id, qty);
        if (!added) { LV.toast('That is all we have in stock of ' + p.name, 'View cart', LV.openCart); return; }
        if (!t._label) t._label = t.innerHTML; // kept once, so a second tap cannot freeze the button on "Added"
        clearTimeout(t._timer);
        t.classList.add('is-done'); t.innerHTML = 'Added ' + LV.icon.check.replace('<svg', '<svg width="16" height="16"');
        t._timer = setTimeout(function () { t.classList.remove('is-done'); t.innerHTML = t._label; }, 1400);
        LV.toast((added < qty ? 'Only ' + added + ' more in stock. ' : '') + p.name + ' added to your cart', 'View cart', LV.openCart);
      } else {
        var line = t.closest('[data-line]');
        if (!line) return;
        var lid = line.getAttribute('data-line'), cur = LV.cart.items().filter(function (x) { return x.id === lid; })[0];
        if (!cur) return;
        var inCart = !!t.closest('#cart'), scope = inCart ? '#cart ' : '#main '; // read before the redraw detaches the button
        if (t.hasAttribute('data-rm')) LV.cart.set(lid, 0); else LV.cart.set(lid, cur.qty + parseInt(t.getAttribute('data-q'), 10));
        // put the focus back on the same control after the redraw
        var sel = t.hasAttribute('data-rm') ? null : '[data-line="' + lid + '"] [data-q="' + t.getAttribute('data-q') + '"]';
        var again = sel && document.querySelector(scope + sel);
        if (again) again.focus(); else if (inCart) { var x = $('#cart .x'); if (x) x.focus(); } else { var h = document.querySelector('#main .co-panel h2'); if (h) { h.tabIndex = -1; h.focus(); } }
      }
    });
    document.addEventListener('keydown', function (e) {
      var cartOpen = $('#cart').classList.contains('is-open'), menuOpen = mnav.classList.contains('is-open');
      if (e.key === 'Tab') { if (menuOpen) LV.trapTab(e, mnav); else if (cartOpen) LV.trapTab(e, $('#cart')); return; }
      if (e.key !== 'Escape') return;
      if (menuOpen) setMenu(false); else LV.closeCart();
    });
    LV.on('cart', renderCart);
    LV.on('overrides', renderCart);
    renderCart();

    // newsletter is a demo
    $$('[data-news]').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); f.reset(); LV.toast('Thanks. This demo does not send email.'); });
    });

    // reveals
    if ('IntersectionObserver' in window && !reduce) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    LV.observe(document);
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
    window.LV_READY = true;
  };
})();
