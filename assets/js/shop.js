/* Shop page: category tabs, filters with live counts, search, sort. The address bar keeps the state,
   so a link from the home page (shop.html?env=resort) opens already filtered. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, $ = LV.$ || function (s, r) { return (r || document).querySelector(s); };
  LV.mount({ active: 'shop' });
  var $$ = LV.$$;

  var CATS = ['all', 'capsules', 'beans', 'ground', 'machines', 'makers'];
  var CAT_LABEL = { all: 'All', capsules: 'Capsules & tabs', beans: 'Whole beans', ground: 'Ground coffee', machines: 'Machines', makers: 'Moka pots & makers' };
  var LEAD = {
    all: 'Everything in one place. Use the tabs for the kind of product and the filters to narrow it down.',
    capsules: 'Capsules for A Modo Mio and Nespresso Original machines, and Tablì coffee tabs. Check which system your machine takes.',
    beans: 'Whole beans for grinders and bean to cup machines, from 250 g bags to one kilo café bags.',
    ground: 'Ground for the moka pot, filter and espresso machines with a ground coffee handle.',
    machines: 'Capsule machines, the Tablì tab machine and a bean to cup. Filter by what the machine can do.',
    makers: 'Stove top moka pots and a French press, for ground coffee.'
  };
  var GROUPS = [
    { key: 'system', title: 'Works with', opts: Object.keys(LV.SYSTEMS).map(function (k) { return [k, LV.SYSTEMS[k]]; }), cats: ['all', 'capsules', 'machines'], test: function (p, v) { return p.system === v && (p.category === 'capsules' || p.category === 'machines'); } },
    { key: 'env', title: 'Where you serve it', opts: Object.keys(LV.ENVS).map(function (k) { return [k, LV.ENVS[k].label]; }), test: function (p, v) { return p.env.indexOf(v) >= 0; } },
    { key: 'cls', title: 'Class', opts: Object.keys(LV.CLASSES).map(function (k) { return [k, LV.CLASSES[k].label]; }), test: function (p, v) { return p.cls === v; } },
    { key: 'style', title: 'Style', opts: Object.keys(LV.STYLES).map(function (k) { return [k, LV.STYLES[k]]; }).concat([['decaf', 'Decaf']]), cats: ['all', 'capsules', 'beans', 'ground'], test: function (p, v) { return v === 'decaf' ? !!p.decaf : (!p.decaf && LV.styleOf(p) === v); } },
    { key: 'func', title: 'Machine functions', opts: ['milk', 'lungo', 'programmable', 'grinder', 'app', 'voice', 'compact'].map(function (k) { return [k, LV.FUNCS[k]]; }), cats: ['machines'], and: true, test: function (p, v) { return (p.funcs || []).indexOf(v) >= 0; } },
    { key: 'only', title: 'Show only', opts: [['best', 'Best sellers'], ['new', 'New releases']], test: function (p, v) { return v === 'best' ? p.best : p.isNew; } }
  ];
  var st = { cat: 'all', q: '', sort: 'featured', system: [], env: [], cls: [], style: [], func: [], only: [] };

  /* ---------- address bar ---------- */
  function readURL() {
    var q = new URLSearchParams(location.search);
    var cats = (q.get('cat') || '').split(',').filter(function (c) { return c !== 'all' && CATS.indexOf(c) >= 0; });
    st.cat = cats.length ? cats.join(',') : 'all';
    st.q = q.get('q') || '';
    st.sort = q.get('sort') || 'featured';
    GROUPS.forEach(function (g) {
      var allowed = g.opts.map(function (o) { return o[0]; });
      st[g.key] = (q.get(g.key) || '').split(',').filter(function (v) { return allowed.indexOf(v) >= 0; });
    });
    if (q.get('best')) st.only.push('best');
    if (q.get('new')) st.only.push('new');
  }
  function writeURL() {
    var q = new URLSearchParams();
    if (st.cat !== 'all') q.set('cat', st.cat);
    GROUPS.forEach(function (g) { if (st[g.key].length) q.set(g.key, st[g.key].join(',')); });
    if (st.q) q.set('q', st.q);
    if (st.sort !== 'featured') q.set('sort', st.sort);
    var s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  /* ---------- matching ---------- */
  function inCat(c) { return st.cat === 'all' ? c === 'all' : st.cat.split(',').indexOf(c) >= 0; }
  function groupOn(g) { return !g.cats || g.cats.some(inCat); }
  function matches(p, skipKey, extra) {
    if (st.cat !== 'all' && !inCat(p.category)) return false;
    if (st.q) {
      // accents are folded on both sides, so "qualita" finds "Qualità"
      var hay = LV.fold(p.name + ' ' + LV.subline(p) + ' ' + (p.notes || []).join(' ') + ' ' + (p.roast || '') + ' ' + p.desc);
      if (LV.fold(st.q).split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
    }
    return GROUPS.every(function (g) {
      if (!groupOn(g)) return true;
      var vals = st[g.key];
      if (g.key === skipKey) vals = g.and ? vals.concat(extra ? [extra] : []) : (extra ? [extra] : []);
      if (!vals.length) return true;
      return g.and ? vals.every(function (v) { return g.test(p, v); }) : vals.some(function (v) { return g.test(p, v); });
    });
  }
  function sorted(list) {
    var by = {
      featured: function (a, b) { return (b.best ? 2 : 0) + (b.isNew ? 1 : 0) - (a.best ? 2 : 0) - (a.isNew ? 1 : 0); },
      'price-asc': function (a, b) { return a.price - b.price; },
      'price-desc': function (a, b) { return b.price - a.price; },
      mild: function (a, b) { return (LV.strength(a) || 99) - (LV.strength(b) || 99); },
      bold: function (a, b) { return (LV.strength(b) || -1) - (LV.strength(a) || -1); },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    }[st.sort] || function () { return 0; };
    return list.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return by(a[0], b[0]) || a[1] - b[1]; }).map(function (x) { return x[0]; });
  }

  /* ---------- draw ---------- */
  function drawCats() {
    var all = LV.products();
    $('#cats').innerHTML = CATS.map(function (c) {
      var n = c === 'all' ? all.length : all.filter(function (p) { return p.category === c; }).length;
      return '<button type="button" data-cat="' + c + '" aria-pressed="' + inCat(c) + '">' + CAT_LABEL[c] + ' <small>' + n + '</small></button>';
    }).join('');
  }
  function drawGroups() {
    $('#fgroups').innerHTML = GROUPS.filter(groupOn).map(function (g) {
      return '<fieldset class="fgroup" data-g="' + g.key + '" style="border-left:0;border-right:0;border-bottom:0;margin:0;padding-left:0;padding-right:0"><legend class="sr">' + g.title + '</legend><h3 aria-hidden="true">' + g.title + '</h3>' +
        g.opts.map(function (o) {
          return '<label class="fopt"><input type="checkbox" value="' + o[0] + '"' + (st[g.key].indexOf(o[0]) >= 0 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span><small></small></label>';
        }).join('') + '</fieldset>';
    }).join('');
  }
  function draw() {
    var all = LV.products(), list = sorted(all.filter(function (p) { return matches(p); }));
    // counts beside each option: what you would get if you ticked it
    GROUPS.filter(groupOn).forEach(function (g) {
      $$('[data-g="' + g.key + '"] .fopt').forEach(function (lab) {
        var inp = $('input', lab), n = all.filter(function (p) { return matches(p, g.key, inp.value); }).length;
        $('small', lab).textContent = n;
        lab.classList.toggle('is-zero', !n && !inp.checked);
        inp.checked = st[g.key].indexOf(inp.value) >= 0;
      });
    });
    $$('#cats button').forEach(function (b) { b.setAttribute('aria-pressed', String(inCat(b.dataset.cat))); });
    var multi = { 'beans,ground': 'Beans & ground', 'machines,makers': 'Machines & makers' }[st.cat], firstCat = st.cat.split(',')[0];
    $('#shop-title').textContent = st.cat === 'all' ? (st.env.length === 1 ? 'For ' + LV.ENVS[st.env[0]].label.toLowerCase() : 'All coffee and machines') : multi || st.cat.split(',').map(function (c) { return CAT_LABEL[c]; }).join(' + ');
    $('#shop-lead').textContent = st.cat === 'all' && st.env.length === 1 ? LV.ENVS[st.env[0]].line
      : st.cat === 'beans,ground' ? 'Whole beans for grinders and bean to cup machines, and ground coffee for the moka pot and filter.'
        : st.cat === 'machines,makers' ? 'Capsule machines, the Tablì machine, a bean to cup, and moka pots for the stove.' : LEAD[firstCat];
    $('#count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
    $('#filters-done').textContent = 'Show ' + list.length + (list.length === 1 ? ' product' : ' products');
    // chips for what is switched on
    var chips = [];
    GROUPS.filter(groupOn).forEach(function (g) {
      st[g.key].forEach(function (v) {
        var o = g.opts.filter(function (x) { return x[0] === v; })[0];
        chips.push('<button type="button" data-g="' + g.key + '" data-v="' + v + '" aria-label="Remove filter ' + esc(o[1]) + '">' + esc(o[1]) + ' <span aria-hidden="true">&times;</span></button>');
      });
    });
    if (st.q) chips.push('<button type="button" data-g="q" aria-label="Clear search">Search: ' + esc(st.q) + ' <span aria-hidden="true">&times;</span></button>');
    if (chips.length) chips.push('<button type="button" class="clear" data-g="all">Clear all</button>');
    $('#active').innerHTML = chips.join('');
    $('#grid').innerHTML = list.length ? list.map(LV.card).join('')
      : '<div class="empty" style="grid-column:1/-1;padding:80px 20px"><b>No products match</b><p>Remove a filter or clear the search.</p><p style="margin-top:18px"><button class="btn" type="button" data-clear>Clear all filters</button></p></div>';
    writeURL();
  }
  function clearAll() { GROUPS.forEach(function (g) { st[g.key] = []; }); st.q = ''; $('#q').value = ''; draw(); }

  /* ---------- events ---------- */
  $('#cats').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    st.cat = b.dataset.cat;
    GROUPS.forEach(function (g) { if (!groupOn(g)) st[g.key] = []; });
    drawGroups(); draw();
  });
  $('#fgroups').addEventListener('change', function (e) {
    var g = e.target.closest('[data-g]').dataset.g, v = e.target.value, i = st[g].indexOf(v);
    if (e.target.checked && i < 0) st[g].push(v); else if (!e.target.checked && i >= 0) st[g].splice(i, 1);
    draw();
  });
  $('#active').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.g === 'all') clearAll();
    else if (b.dataset.g === 'q') { st.q = ''; $('#q').value = ''; draw(); }
    else { st[b.dataset.g] = st[b.dataset.g].filter(function (v) { return v !== b.dataset.v; }); draw(); }
    var next = $('#active button'); (next || $('#q')).focus();
  });
  $('#grid').addEventListener('click', function (e) { if (e.target.closest('[data-clear]')) { clearAll(); $('#q').focus(); } });
  var qt;
  $('#q').addEventListener('input', function (e) { clearTimeout(qt); qt = setTimeout(function () { st.q = e.target.value.trim(); draw(); }, 140); });
  $('#sort').addEventListener('change', function (e) { st.sort = e.target.value; draw(); });

  var panel = $('#filters');
  var setPanel = function (open) {
    panel.classList.toggle('is-open', open); document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('#filters-x').focus(); else $('#filters-btn').focus();
  };
  $('#filters-btn').addEventListener('click', function () { setPanel(true); });
  $('#filters-x').addEventListener('click', function () { setPanel(false); });
  $('#filters-done').addEventListener('click', function () { setPanel(false); window.scrollTo({ top: $('.shop-bar').offsetTop - 10 }); });
  document.addEventListener('keydown', function (e) {
    if (!panel.classList.contains('is-open')) return;
    if (e.key === 'Escape') setPanel(false); else LV.trapTab(e, panel);
  });

  readURL();
  $('#q').value = st.q; $('#sort').value = st.sort;
  drawCats(); drawGroups(); draw();
  LV.on('overrides', function () { drawCats(); draw(); });
})();
