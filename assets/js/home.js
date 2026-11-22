/* Home page: hero motion, range tiles, best sellers, new release banner,
   shop by place, machine functions, class and style finder, order steps. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scene = function (name) { return 'assets/img/scenes/' + name + '.webp'; };
  var bg = function (p) { return LV.img(p, '--bg'); };

  LV.mount({ over: true });

  /* ---------- hero ---------- */
  function sticker() {
    var b = LV.promo().banner, p = LV.product(b.productId), el = $('#sticker');
    if (!b.on || !p || p.hidden) { el.hidden = true; return; }
    el.hidden = false;
    var pts = [];
    for (var i = 0; i <= 180; i++) {
      var a = i / 180 * Math.PI * 2, r = 93 + 5 * Math.cos(a * 18);
      pts.push((100 + r * Math.cos(a)).toFixed(1) + ' ' + (100 + r * Math.sin(a)).toFixed(1));
    }
    var name = p.name.length > 30 ? p.name.slice(0, 29).replace(/\s+\S*$/, '') + '…' : p.name;
    var label = (b.eyebrow || 'New') + ' · ' + name + ' · ';
    var text = label.length <= 24 ? label + label : label; // a short label goes round twice, a long one once
    var size = Math.max(7.5, Math.min(13.4, 427 / (text.length * 0.78))).toFixed(1); // 427 = the ring's length
    el.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M' + pts.join('L') + 'Z" fill="#e8b93c"/>' +
      '<g class="spin"><defs><path id="st-c" d="M100 100m-68 0a68 68 0 1 1 136 0a68 68 0 1 1-136 0"/></defs>' +
      '<text style="font-size:' + size + 'px"><textPath href="#st-c" textLength="420" lengthAdjust="spacing">' + esc(text) + '</textPath></text></g>' +
      '<text x="100" y="113" text-anchor="middle" style="font:800 40px var(--display);font-stretch:75%;letter-spacing:0">NEW</text></svg>';
    el.setAttribute('aria-label', 'New release: ' + p.name);
  }
  sticker();

  var art = $('#hero-art'), hero = $('.hero');
  if (art && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      art.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      art.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', function () { art.style.setProperty('--mx', 0); art.style.setProperty('--my', 0); });
  }

  /* ---------- 01 range tiles ---------- */
  var count = function (f) { return LV.products().filter(f).length; };
  var tiles = [
    { t: 'Capsules', s: 'A Modo Mio · Nespresso Original · Tablì', href: 'shop.html?cat=capsules', pack: 'ncc-qualita-oro', bg: 'ncc-qualita-oro', n: count(function (p) { return p.category === 'capsules'; }) },
    { t: 'Beans & ground', s: 'For grinders, moka pots and filter', href: 'shop.html?cat=beans,ground', pack: 'beans-qualita-rossa', bg: 'beans-qualita-rossa', n: count(function (p) { return p.category === 'beans' || p.category === 'ground'; }) },
    { t: 'Machines', s: 'Capsule, tab, bean to cup, moka', href: 'shop.html?cat=machines,makers', pack: 'm-jolie-milk-evo', bg: 'm-smeg', n: count(function (p) { return p.category === 'machines' || p.category === 'makers'; }) }
  ];
  $('#tiles').innerHTML = tiles.map(function (t, i) {
    return '<a class="tile" href="' + t.href + '" data-reveal style="--d:' + i + '">' +
      '<img class="tile-bg" loading="lazy" src="' + bg(t.bg) + '" alt="">' +
      '<img class="tile-pack" loading="lazy" src="' + LV.img(t.pack) + '" alt="">' +
      '<small>' + t.n + ' products · ' + t.s + '</small><b>' + t.t + '<span class="go">' + LV.icon.go + '</span></b></a>';
  }).join('');

  /* ---------- service band ---------- */
  var band = [['truck', 'Delivery across Malé, Hulhumalé and Villimalé'], ['boat', 'Boat delivery to every atoll'], ['card', 'Pay by card, transfer or on delivery'], ['box', 'Track every order'], ['cup', 'Roasted in Italy since 1895'], ['building', 'Business accounts for resorts, cafés and offices']];
  var ul = '<ul>' + band.map(function (b) { return '<li>' + LV.icon[b[0]] + b[1] + '</li>'; }).join('') + '</ul>';
  $('#marquee').innerHTML = ul + ul;

  /* ---------- 02 best sellers ---------- */
  function bestSellers() {
    var list = LV.products().filter(function (p) { return p.best; });
    $('#best-rail').innerHTML = list.map(function (p, i) {
      return '<article class="bs">' +
        '<a class="bs-media" href="' + LV.url(p) + '" tabindex="-1" aria-hidden="true"><img class="bg" loading="lazy" src="' + bg(p) + '" alt=""><img class="pk" loading="lazy" src="' + LV.img(p) + '" alt="">' + (p.isNew ? '<div class="tags"><span class="tag tag-new">New</span></div>' : '') + '</a>' +
        '<div class="bs-no"><span>' + (i < 9 ? '0' : '') + (i + 1) + '</span><span>' + esc(LV.sysShort(p) + (p.pack ? ' · ' + p.pack : '')) + '</span></div>' +
        '<div class="bs-body"><h3><a href="' + LV.url(p) + '" style="text-decoration:none">' + esc(p.name) + '</a></h3><p>' + esc(LV.notesLine(p)) + '</p></div>' +
        '<div class="bs-foot"><b>' + LV.money(p.price) + '</b>' + LV.addBtn(p) + '</div></article>';
    }).join('');
  }
  bestSellers();
  LV.rail($('#best-rail'), $('#best-prev'), $('#best-next'));

  /* ---------- new release banner ---------- */
  function banner() {
    var b = LV.promo().banner, p = LV.product(b.productId), el = $('#new');
    if (!b.on || !p || p.hidden) { el.hidden = true; return; }
    el.hidden = false;
    var mates = LV.products().filter(function (x) { return x.system === p.system && x.id !== p.id && x.category === 'capsules'; }).slice(0, 2);
    el.innerHTML = '<img class="banner-bg" loading="lazy" src="' + bg(p) + '" alt=""><div class="wrap">' +
      '<div class="banner-copy"><span class="eyebrow">' + esc(b.eyebrow) + '</span>' +
      '<h2 class="display h-lg" data-split>' + esc(b.title) + '</h2><p data-reveal style="--d:2">' + esc(b.text) + '</p>' +
      '<div class="banner-cta" data-reveal style="--d:3"><a class="btn btn-gold" href="' + esc(LV.safeHref(b.href)) + '">' + esc(b.cta) + ' ' + LV.icon.arrow + '</a>' +
      '<a class="btn btn-ghost" href="' + LV.url(p) + '">See the details</a><span class="banner-price">' + esc(p.name) + ' from ' + LV.money(p.price) + '</span></div></div>' +
      '<div class="banner-art" data-reveal="fade">' + mates.map(function (m, i) { return '<img class="mini ' + (i ? 'b' : 'a') + '" loading="lazy" src="' + LV.img(m) + '" alt="' + esc(m.name) + '">'; }).join('') +
      '<img loading="lazy" src="' + LV.img(p) + '" alt="' + esc(p.name) + '"></div></div>';
    LV.observe(el);
  }
  banner();
  LV.on('promo', function () { banner(); sticker(); });

  /* ---------- 03 shop by where you serve it ---------- */
  var ENV_PICKS = {
    resort: ['ncc-maestro-ristretto', 'beans-gran-riserva', 'beans-barista-perfetto'],
    cafe: ['beans-crema-e-aroma', 'beans-gran-crema', 'beans-barista-intenso'],
    office: ['m-assoluta', 'amm-qualita-rossa', 'ncc-maestro-lungo'],
    guesthouse: ['m-jolie-evo', 'amm-crema-e-gusto', 'ground-qualita-rossa'],
    home: ['m-jolie-evo-plus', 'amm-qualita-oro', 'mk-carmencita-pro']
  };
  var ENV_ALT = {
    resort: 'Breakfast and coffee on a resort deck over the lagoon', cafe: 'A barista pulling espresso at a café bar', office: 'Coffee on a desk in a bright office',
    guesthouse: 'A small island guesthouse terrace by the beach', home: 'A capsule machine on a kitchen counter in the morning'
  };
  var envKeys = Object.keys(LV.ENVS), envCur = null, envTimer = null, envEl = $('#env'), ENV_MS = 7000;
  $('#env-tabs').innerHTML = envKeys.map(function (k, i) {
    var e = LV.ENVS[k], n = LV.products().filter(function (p) { return p.env.indexOf(k) >= 0; }).length;
    return '<button class="env-tab" type="button" role="tab" id="env-tab-' + k + '" data-env="' + k + '" aria-selected="false" aria-controls="env-view" tabindex="-1">' +
      '<small>0' + (i + 1) + '</small><b>' + e.label + '</b><i>' + n + ' products</i><p><span>' + e.line + '</span></p></button>';
  }).join('');
  $('#env-photo').innerHTML = envKeys.map(function (k) { return '<img loading="lazy" data-env="' + k + '" src="' + scene('env-' + k) + '" alt="' + ENV_ALT[k] + '">'; }).join('') + '<figcaption id="env-cap"></figcaption>';
  function setEnv(k, user) {
    if (k === envCur) return;
    envCur = k;
    $$('.env-tab').forEach(function (t) { var on = t.dataset.env === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('#env-photo img').forEach(function (im) { im.classList.toggle('is-on', im.dataset.env === k); });
    $('#env-cap').textContent = LV.ENVS[k].label;
    $('#env-view').setAttribute('aria-labelledby', 'env-tab-' + k);
    var picks = ENV_PICKS[k].map(LV.product).filter(function (p) { return p && !p.hidden; });
    $('#env-picks').innerHTML = picks.map(function (p) {
      return '<a class="env-pick" href="' + LV.url(p) + '"><img loading="lazy" src="' + LV.img(p) + '" alt=""><span><b>' + esc(p.name) + '</b><small>' + esc(LV.subline(p)) + '</small><small class="price">' + LV.money(p.price) + '</small></span></a>';
    }).join('');
    $('#env-actions').innerHTML = '<a class="btn" href="shop.html?env=' + k + '">Shop for ' + LV.ENVS[k].short.toLowerCase() + ' ' + LV.icon.arrow + '</a>' +
      (k !== 'home' ? '<a class="btn btn-light" href="#quote">Request a business quote</a>' : '');
    if (user) stopAuto();
  }
  function stopAuto() {
    clearTimeout(envTimer); envTimer = null; envEl.classList.remove('is-auto');
    $('#env-view').setAttribute('aria-live', 'polite');
  }
  function tick() {
    if (!envEl.classList.contains('is-auto')) return;
    clearTimeout(envTimer);
    envTimer = setTimeout(function () { setEnv(envKeys[(envKeys.indexOf(envCur) + 1) % envKeys.length]); tick(); }, ENV_MS);
  }
  envEl.style.setProperty('--dur', ENV_MS + 'ms');
  $('#env-tabs').addEventListener('click', function (e) { var t = e.target.closest('.env-tab'); if (t) setEnv(t.dataset.env, true); });
  $('#env-tabs').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    var k = envKeys[(envKeys.indexOf(envCur) + d + envKeys.length) % envKeys.length];
    setEnv(k, true); $('#env-tab-' + k).focus();
  });
  setEnv('resort');
  if (reduce || !('IntersectionObserver' in window)) stopAuto();
  else {
    // the tabs only advance by themselves while the section is on screen and nobody is using it
    new IntersectionObserver(function (en) {
      if (!envEl.classList.contains('is-auto')) return;
      if (en[0].isIntersecting) tick(); else clearTimeout(envTimer);
    }, { threshold: 0.3 }).observe(envEl);
    envEl.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') stopAuto(); });
    envEl.addEventListener('pointerdown', stopAuto);
    envEl.addEventListener('focusin', stopAuto);
  }

  /* quote request */
  var qf = $('#quote-form');
  qf.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    $$('[required]', qf).forEach(function (inp) {
      var v = inp.value.trim(), lab = inp.closest('.field'), old = $('.err', lab);
      var msg = !v ? 'Please fill this in.' : inp.name === 'phone' && v.replace(/\D/g, '').length < 7 ? 'Enter a phone number with at least 7 digits.' : '';
      if (old) old.parentNode.removeChild(old);
      lab.classList.toggle('is-bad', !!msg);
      inp.setAttribute('aria-invalid', String(!!msg));
      if (msg) { var e2 = document.createElement('span'); e2.className = 'err'; e2.textContent = msg; lab.appendChild(e2); }
      if (msg && ok) { inp.focus(); ok = false; }
    });
    if (!ok) return;
    var f = qf.elements, q = LV.quotes.add({
      name: f.namedItem('name').value.trim(), contact: f.namedItem('contact').value.trim(), phone: f.namedItem('phone').value.trim(),
      env: f.namedItem('env').value, volume: f.namedItem('volume').value.trim(), message: f.namedItem('message').value.trim()
    });
    var box = document.createElement('div');
    box.className = 'biz-ok'; box.setAttribute('role', 'status'); box.tabIndex = -1;
    box.innerHTML = '<div class="gw-ok" style="margin:0 auto">' + LV.icon.check + '</div><h3 style="font-size:clamp(28px,3vw,40px)">Request received</h3>' +
      '<p>Reference <b>' + esc(q.id) + '</b>. In the live site our team would call you back. In this demo it is now in the <a class="link" href="admin/index.html#quotes">admin, under Quote requests</a>.</p>';
    qf.replaceWith(box); box.focus();
  });

  /* ---------- 04 machines and what they do ---------- */
  var FN = ['milk', 'lungo', 'programmable', 'grinder', 'app', 'voice', 'compact'], picked = [];
  var machines = LV.products().filter(function (p) { return p.category === 'machines'; });
  $('#mach-chips').innerHTML = FN.map(function (f) {
    return '<button class="chip" type="button" data-f="' + f + '" aria-pressed="false">' + LV.icon[LV.FUNC_ICON[f]] + LV.FUNCS[f] + '</button>';
  }).join('');
  function machStats(p) {
    // two facts per machine, taken from whatever its spec sheet has
    var spec = function (k) { var r = (p.specs || []).filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : ''; };
    var all = [[p.tank, 'Water tank'], [p.heat, 'Heat-up'], [spec('Width'), 'Width'], [spec('Weight'), 'Weight']].filter(function (x) { return x[0]; }).slice(0, 2);
    return all.map(function (x) { return '<span><b>' + esc(x[0]) + '</b>' + x[1] + '</span>'; }).join('');
  }
  $('#mach-grid').innerHTML = machines.map(function (p, i) {
    return '<a class="mach" href="' + LV.url(p) + '" data-id="' + p.id + '" data-reveal style="--d:' + (i % 4) + '">' +
      '<div class="mach-img">' + (p.isNew ? '<div class="tags"><span class="tag tag-new">New</span></div>' : '') + '<img loading="lazy" src="' + LV.img(p) + '" alt="' + esc(p.name) + '"></div>' +
      '<small>' + esc(LV.subline(p)) + '</small><h3>' + esc(p.name.replace('A Modo Mio ', '')) + '</h3>' +
      '<ul>' + p.funcs.filter(function (f) { return f !== 'autoOff'; }).map(function (f) { return '<li data-f="' + f + '">' + LV.FUNCS[f] + '</li>'; }).join('') + '</ul>' +
      '<div class="mach-stats">' + machStats(p) + '</div>' +
      '<div class="mach-foot"><b>' + LV.money(p.price) + '</b><span>View ' + LV.icon.go + '</span></div></a>';
  }).join('');
  function machFilter() {
    var hit = 0;
    $$('.mach').forEach(function (el) {
      var p = LV.product(el.dataset.id), ok = picked.every(function (f) { return p.funcs.indexOf(f) >= 0; });
      el.classList.toggle('is-off', !ok);
      el.setAttribute('aria-hidden', String(!ok)); el.tabIndex = ok ? 0 : -1;
      if (ok) hit++;
      $$('li', el).forEach(function (li) { li.classList.toggle('is-hit', picked.indexOf(li.dataset.f) >= 0); });
    });
    $('#mach-count').textContent = picked.length
      ? (hit ? hit + ' of ' + machines.length + ' machines ' + (hit === 1 ? 'does' : 'do') + ' this' : 'No machine does all of that. Remove one.')
      : 'All ' + machines.length + ' machines. Tap a function to narrow it down.';
  }
  $('#mach-chips').addEventListener('click', function (e) {
    var c = e.target.closest('.chip');
    if (!c) return;
    var f = c.dataset.f, i = picked.indexOf(f);
    if (i >= 0) picked.splice(i, 1); else picked.push(f);
    c.setAttribute('aria-pressed', String(i < 0));
    machFilter();
  });
  machFilter();
  LV.observe($('#mach-grid'));

  /* ---------- 05 class and style ---------- */
  var fState = { cls: null, cat: null, v: 6 };
  function styleFor(v) { return v <= 5 ? 'mild' : v <= 7 ? 'balanced' : 'bold'; }
  function finder() {
    var pool = LV.products().filter(function (p) {
      return (p.category === 'capsules' || p.category === 'beans' || p.category === 'ground') && !p.decaf &&
        (!fState.cls || p.cls === fState.cls) && (!fState.cat || p.category === fState.cat) && LV.strength(p) != null;
    });
    pool.sort(function (a, b) {
      var da = Math.abs(LV.strength(a) - fState.v), db = Math.abs(LV.strength(b) - fState.v);
      return da - db || (b.best ? 1 : 0) - (a.best ? 1 : 0) || a.price - b.price;
    });
    var show = pool.slice(0, 6), st = styleFor(fState.v);
    $('#find-out').innerHTML = show.length ? show.map(LV.card).join('') : '<div class="empty" style="grid-column:1/-1"><b>Nothing in that range</b><p>Try another class or format.</p></div>';
    $('#find-num').textContent = fState.v;
    $('#find-style').textContent = LV.STYLES[st];
    $('#find-range').setAttribute('aria-valuetext', fState.v + ' out of 10, ' + LV.STYLES[st]);
    $('#find-count').textContent = show.length ? 'Closest ' + show.length + ' of ' + pool.length + ' coffees' : 'No match';
    $('#find-class-note').textContent = fState.cls ? LV.CLASSES[fState.cls].line : 'Any class. Tap one to narrow it.';
    var q = ['style=' + st];
    if (fState.cls) q.push('cls=' + fState.cls);
    if (fState.cat) q.push('cat=' + fState.cat);
    $('#find-all').href = 'shop.html?' + q.join('&');
  }
  function seg(id, key) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      fState[key] = fState[key] === b.dataset.v ? null : b.dataset.v;
      $$('button', $(id)).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === fState[key])); });
      finder();
    });
  }
  seg('#find-class', 'cls'); seg('#find-format', 'cat');
  $('#find-range').addEventListener('input', function (e) { fState.v = +e.target.value; finder(); });
  finder();
  LV.on('overrides', function () { finder(); bestSellers(); });

  /* ---------- 06 order steps fill as you scroll ---------- */
  var steps = $('#steps'), stepEls = $$('.step', steps), ticking = false;
  function stepProgress() {
    ticking = false;
    var r = steps.getBoundingClientRect(), vh = window.innerHeight;
    var p = Math.max(0, Math.min(1, (vh * 0.82 - r.top) / (r.height + vh * 0.32)));
    if (reduce) p = 1;
    steps.style.setProperty('--p', p.toFixed(3));
    stepEls.forEach(function (s, i) { s.classList.toggle('is-on', p >= (i + 0.35) / stepEls.length); });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(stepProgress); } }, { passive: true });
  window.addEventListener('resize', stepProgress);
  stepProgress();

  var sample = LV.orders.all().filter(function (o) { return o.status === 'shipped'; })[0] || LV.orders.all()[0];
  if (sample) { $('#track-sample').textContent = sample.no; $('#track-no').placeholder = sample.no; }

  LV.observe(document);
})();
