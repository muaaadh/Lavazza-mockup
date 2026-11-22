/* Product page. One template for coffee, machines and makers. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, $ = LV.$, $$ = LV.$$;
  var id = new URLSearchParams(location.search).get('id');
  var p = id && LV.product(id);
  LV.mount({ active: p ? p.category : '' });
  var root = $('#pdp'), qty = 1, view = 'pack';

  if (!p || p.hidden) {
    root.innerHTML = '<div class="wrap"><div class="empty" style="padding:120px 20px"><b>We could not find that product</b><p>It may have been removed from the shop.</p><p style="margin-top:20px"><a class="btn" href="shop.html">Back to the shop ' + LV.icon.arrow + '</a></p></div></div>';
    return;
  }
  document.title = p.name + ' | ' + LV.subline(p) + ' | Lavazza Maldives';

  var coffee = p.category === 'capsules' || p.category === 'beans' || p.category === 'ground';
  var hasBg = p.category !== 'makers';
  var catName = LV.CATS[p.category];

  function facts() {
    var f = [];
    if (p.intensity) f.push(['Intensity', LV.intensity(p).replace('<span>Intensity ', '<span>')]);
    if (p.roast) f.push(['Roast', esc(p.roast)]);
    if (p.notes && p.notes.length) f.push(['Aromatic notes', esc(p.notes.join(', '))]);
    if (p.blend) f.push(['Blend', esc(p.blend)]);
    if (p.pack) f.push(['Pack', esc(p.pack)]);
    if (p.category === 'capsules') f.push(['Works with', esc(LV.SYSTEMS[p.system] + (p.system === 'ncc' ? ' machines' : ' machines only'))]);
    if (p.category === 'machines') {
      f.push(['Takes', esc(p.system === 'beans' ? 'Whole coffee beans' : p.system === 'tabli' ? 'Tablì coffee tabs' : 'A Modo Mio capsules')]);
      if (p.tank) f.push(['Water tank', esc(p.tank)]);
      if (p.heat) f.push(['Heat-up time', esc(p.heat)]);
      if (p.size) f.push(['Size (W x D x H)', esc(p.size)]);
    }
    f.push(['Class', esc(LV.CLASSES[p.cls].label)]);
    if (coffee && LV.styleOf(p)) f.push(['Style', esc(p.decaf ? 'Decaf' : LV.STYLES[LV.styleOf(p)])]);
    return '<dl class="facts">' + f.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl>';
  }

  function stockLine() {
    if (p.stock <= 0) return '<p class="pdp-stock out">Out of stock. Ask us when it is back.</p>';
    if (p.stock <= 5) return '<p class="pdp-stock low">Only ' + p.stock + ' left</p>';
    return '<p class="pdp-stock">In stock in Malé</p>';
  }

  function media() {
    var thumbs = '';
    if (p.gallery && p.gallery.length) {
      thumbs = '<div class="pdp-thumbs" role="group" aria-label="Photos"><button type="button" data-view="pack" aria-pressed="true" aria-label="Product photo"><img src="' + LV.img(p) + '" alt="" style="object-fit:contain"></button>' +
        p.gallery.slice(0, 4).map(function (g, i) { return '<button type="button" data-view="' + i + '" aria-pressed="false" aria-label="Photo ' + (i + 2) + '"><img loading="lazy" src="' + LV.base + 'assets/img/products/' + g + '" alt=""></button>'; }).join('') + '</div>';
    }
    return '<div class="pdp-media' + (hasBg ? '' : ' is-plain') + '">' + (hasBg ? '<img class="bg" src="' + LV.img(p, '--bg') + '" alt="">' : '') +
      '<img class="pk" src="' + LV.img(p) + '" alt="' + esc(p.name + ', ' + LV.subline(p)) + '"><img class="photo" alt="" hidden>' + thumbs + '</div>';
  }

  function info() {
    var h = '<nav class="crumbs" aria-label="Breadcrumb"><a href="shop.html">Shop</a><span>/</span><a href="shop.html?cat=' + p.category + '">' + catName + '</a><span>/</span><span>' + esc(p.name) + '</span></nav>';
    h += LV.tags(p) || '<div style="height:18px"></div>';
    h += '<h1 class="display">' + esc(p.name) + '</h1><p class="pdp-sub">' + esc(LV.subline(p)) + '</p><p class="pdp-desc">' + esc(p.desc) + '</p>';
    h += '<div class="pdp-buy"><div class="pdp-price">' + LV.money(p.price) + '<small>GST included' + (p.pack ? ' · ' + esc(p.pack) : '') + '</small></div>' +
      (p.stock > 0 ? '<div class="qty" role="group" aria-label="Quantity"><button type="button" data-step="-1" aria-label="One less">&minus;</button><span id="qty" aria-live="polite">1</span><button type="button" data-step="1" aria-label="One more">+</button></div>' +
        '<button class="btn" id="buy" data-add="' + esc(p.id) + '" data-qty="1">Add to cart ' + LV.icon.arrow + '</button>' : '<button class="btn" disabled>Sold out</button>') + '</div>';
    h += stockLine();
    if (p.category === 'machines') {
      h += '<div class="fn-list" aria-label="What it does">' + p.funcs.map(function (f) { return '<span>' + LV.icon[LV.FUNC_ICON[f]] + LV.FUNCS[f] + '</span>'; }).join('') + '</div>';
    }
    h += facts();
    h += '<h2 class="pdp-h">Good for</h2><div class="envs-list">' + p.env.map(function (e) { return '<a href="shop.html?env=' + e + '">' + LV.ENVS[e].label + '</a>'; }).join('') + '</div>';
    if (coffee && p.profile) h += '<h2 class="pdp-h">' + esc(p.profile) + '</h2><p class="pdp-desc" style="margin-top:0">' + esc(p.profileDesc) + '</p>';
    if (p.features && p.features.length) {
      h += '<h2 class="pdp-h">What it does</h2><ol class="feat">' + p.features.map(function (f, i) { return '<li><small>0' + (i + 1) + '</small><b>' + esc(f.t) + '</b><p>' + esc(f.d) + '</p></li>'; }).join('') + '</ol>';
    }
    if (p.specs && p.specs.length) {
      h += '<h2 class="pdp-h">Technical data</h2><table class="specs"><tbody>' + p.specs.map(function (s) { return '<tr><th scope="row">' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    if (p.system === 'ncc') h += '<p style="font-size:14px;color:var(--muted);margin-top:16px">Compatible with Nespresso Original machines for home use. Nespresso is a trademark of a third party with no connection to Luigi Lavazza S.p.A.</p>';
    h += '<div class="note-box"><span><b>Delivery.</b> Malé ' + LV.money(LV.ZONES.male.fee) + ', free over ' + LV.money(LV.ZONES.male.freeOver) + '. Hulhumalé and Villimalé ' + LV.money(LV.ZONES.hulhumale.fee) + '. Other islands by boat ' + LV.money(LV.ZONES.atoll.fee) + '.</span>' +
      '<span><b>Buying for a business?</b> <a class="link" href="index.html#quote">Request a quote</a> for case quantities.</span></div>';
    return h;
  }

  root.innerHTML = '<div class="pdp">' + media() + '<div class="pdp-info">' + info() + '</div></div>';

  // quantity
  root.addEventListener('click', function (e) {
    var s = e.target.closest('[data-step]');
    if (s) {
      qty = Math.max(1, Math.min(Math.min(99, p.stock), qty + parseInt(s.dataset.step, 10)));
      $('#qty').textContent = qty; $('#buy').setAttribute('data-qty', qty);
      return;
    }
    var t = e.target.closest('[data-view]');
    if (!t) return;
    view = t.dataset.view;
    $$('.pdp-thumbs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
    var ph = $('.pdp-media .photo');
    if (view === 'pack') { ph.hidden = true; }
    else { ph.src = LV.base + 'assets/img/products/' + p.gallery[+view]; ph.alt = p.name + ' at home'; ph.hidden = false; }
  });

  /* what goes with it */
  var more = [], title = '', eyebrow = '';
  var all = LV.products().filter(function (x) { return x.id !== p.id; });
  if (p.category === 'machines') {
    more = all.filter(function (x) { return p.system === 'beans' ? x.category === 'beans' : x.category === 'capsules' && x.system === p.system; });
    eyebrow = 'Goes with it'; title = p.system === 'beans' ? 'Beans for this machine' : 'Coffee for this machine';
  } else if (p.category === 'capsules' && p.system !== 'ncc') {
    more = all.filter(function (x) { return x.category === 'machines' && x.system === p.system; }).concat(all.filter(function (x) { return x.category === 'capsules' && x.system === p.system; }));
    eyebrow = 'Goes with it'; title = 'Machines that take it, and more ' + LV.SYSTEMS[p.system];
  } else {
    more = all.filter(function (x) { return x.category === p.category && (p.category !== 'capsules' || x.system === p.system); });
    more.sort(function (a, b) { return Math.abs((LV.strength(a) || 0) - (LV.strength(p) || 0)) - Math.abs((LV.strength(b) || 0) - (LV.strength(p) || 0)); });
    eyebrow = 'You may also like'; title = 'Close in taste';
  }
  more = more.slice(0, 4);
  if (more.length) {
    $('#more').hidden = false;
    $('#more-eyebrow').textContent = eyebrow; $('#more-title').textContent = title;
    $('#more-grid').innerHTML = more.map(LV.card).join('');
  }
})();
