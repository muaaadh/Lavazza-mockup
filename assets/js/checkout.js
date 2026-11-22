/* Checkout in three steps (cart, details, payment) and a payment gateway demo.
   Nothing leaves the browser: card numbers are checked and thrown away, the order is saved in localStorage. */
(function () {
  'use strict';
  var LV = window.LV, esc = LV.esc, $ = LV.$, $$ = LV.$$;
  LV.mount({});
  var root = $('#co-root'), step = 1, quoted = null;
  var d = Object.assign({ type: 'personal', name: '', phone: '', email: '', company: '', tin: '', zone: 'male', address: '', note: '', method: 'card', slip: '' }, LV.get('last', {}));
  d.method = d.method || 'card'; d.slip = '';
  if (!LV.ZONES[d.zone]) d.zone = 'male';

  var pickup = function () { return d.zone === 'pickup'; };
  function totals() {
    var sub = LV.cart.subtotal(), fee = LV.deliveryFee(d.zone, sub);
    return { sub: sub, fee: fee, total: sub + fee, gst: LV.gstIn(sub + fee) };
  }
  function methodOk(m) {
    var P = LV.PAY[m];
    if (P.business && d.type !== 'business') return false;
    if (P.zones && P.zones.indexOf(d.zone) < 0) return false;
    return true;
  }
  function detailsOk() { return !!(d.name && d.phone && (d.address || !LV.ZONES[d.zone].ask) && (d.type !== 'business' || d.company)); }
  function remember() { LV.set('last', { type: d.type, name: d.name, phone: d.phone, email: d.email, company: d.company, tin: d.tin, zone: d.zone, address: d.address, note: d.note, method: d.method }); }

  /* ---------- summary column ---------- */
  function summary() {
    var items = LV.cart.items(), t = totals(), z = LV.ZONES[d.zone];
    return '<aside class="co-sum" aria-label="Order summary"><h2>Your order</h2>' +
      items.map(function (l) {
        return '<div class="line"><img src="' + LV.img(l.product) + '" alt=""><div><b>' + esc(l.product.name) + '</b><small>' + esc(LV.subline(l.product)) + ' · Qty ' + l.qty + '</small></div><div class="amt">' + LV.money(l.total) + '</div></div>';
      }).join('') +
      '<div class="sums"><div class="sum-row"><span>Subtotal</span><span>' + LV.money(t.sub) + '</span></div>' +
      '<div class="sum-row"><span>' + (pickup() ? 'Collect in store' : 'Delivery · ' + esc(z.label)) + '</span><span>' + (t.fee ? LV.money(t.fee) : 'Free') + '</span></div>' +
      '<div class="sum-row total"><span>Total</span><span>' + LV.money(t.total) + '</span></div>' +
      '<div class="sum-row"><small>Includes GST 8%: ' + LV.money(t.gst) + '</small></div></div>' +
      '<p class="secure">' + LV.icon.lock + 'Demo checkout. No payment is taken and no details leave this browser.</p></aside>';
  }
  function stepsBar() {
    return '<ol class="co-steps" aria-label="Checkout steps">' + ['Cart', 'Details', 'Payment'].map(function (s, i) {
      var n = i + 1;
      return '<li class="' + (n === step ? 'is-on' : n < step ? 'is-done' : '') + '"' + (n === step ? ' aria-current="step"' : '') + '><i>' + (n < step ? '&#10003;' : n) + '</i><span>' + s + '</span></li>';
    }).join('') + '</ol>';
  }

  /* ---------- step 1: cart ---------- */
  function cartStep() {
    var items = LV.cart.items();
    return '<div class="co-panel"><h2>Your cart</h2>' + items.map(function (l) {
      return '<div class="line" data-line="' + esc(l.id) + '" style="grid-template-columns:88px 1fr auto"><img src="' + LV.img(l.product) + '" alt="" style="width:88px;height:100px">' +
        '<div><b><a href="' + LV.url(l.product) + '" style="text-decoration:none">' + esc(l.product.name) + '</a></b><small>' + esc(LV.subline(l.product)) + ' · ' + LV.money(l.product.price) + ' each</small>' +
        '<div class="qty" role="group" aria-label="Quantity of ' + esc(l.product.name) + '"><button type="button" data-q="-1" aria-label="One less">&minus;</button><span aria-live="polite">' + l.qty + '</span><button type="button" data-q="1" aria-label="One more">+</button></div></div>' +
        '<div class="amt">' + LV.money(l.total) + '<br><button type="button" class="rm" data-rm>Remove</button></div></div>';
    }).join('') +
      '<div class="co-actions"><a class="btn btn-light" href="shop.html">Keep shopping</a><button class="btn" type="button" data-go="2">Continue to details ' + LV.icon.arrow + '</button></div></div>';
  }

  /* ---------- step 2: details ---------- */
  function field(name, label, attrs, small) {
    return '<label class="field" data-f="' + name + '"><span>' + label + '</span><input name="' + name + '" value="' + esc(d[name]) + '" ' + (attrs || '') + '>' + (small ? '<small>' + small + '</small>' : '') + '</label>';
  }
  function detailsStep() {
    var sub = LV.cart.subtotal();
    var zones = Object.keys(LV.ZONES).map(function (k) {
      var z = LV.ZONES[k], fee = LV.deliveryFee(k, sub);
      return '<label class="opt"><input type="radio" name="zone" value="' + k + '"' + (d.zone === k ? ' checked' : '') + '><b>' + z.label + '</b><em>' + (fee ? LV.money(fee) : 'Free') + '</em><small>' + z.eta + (z.fee && z.freeOver && fee ? '. Free over ' + LV.money(z.freeOver) + '.' : '.') + '</small></label>';
    }).join('');
    var z = LV.ZONES[d.zone];
    return '<form class="co-panel" id="details" novalidate><h2>Your details</h2>' +
      '<h3 id="t-as">Ordering as</h3><div class="opts two" role="radiogroup" aria-labelledby="t-as">' +
      '<label class="opt"><input type="radio" name="type" value="personal"' + (d.type === 'personal' ? ' checked' : '') + '><b>Personal</b><small>For home.</small></label>' +
      '<label class="opt"><input type="radio" name="type" value="business"' + (d.type === 'business' ? ' checked' : '') + '><b>Business</b><small>Resort, café, office or guesthouse. Company name on the invoice.</small></label></div>' +
      '<div class="form-grid" style="margin-top:18px">' +
      (d.type === 'business' ? field('company', 'Company name', 'required autocomplete="organization"') + field('tin', 'GST TIN (optional)', 'inputmode="numeric" placeholder="1234567GST501"') : '') +
      field('name', d.type === 'business' ? 'Contact person' : 'Full name', 'required autocomplete="name"') +
      field('phone', 'Mobile number', 'required type="tel" inputmode="tel" autocomplete="tel" placeholder="7xx xxxx"', pickup() ? 'We call this number when your order is ready.' : 'We call this number about delivery.') +
      '<div class="full">' + field('email', 'Email (optional)', 'type="email" autocomplete="email"', 'For your receipt.') + '</div></div>' +
      '<h3 id="t-zone">Deliver to</h3><div class="opts" role="radiogroup" aria-labelledby="t-zone">' + zones + '</div>' +
      '<div class="form-grid" style="margin-top:18px">' +
      (z.ask ? '<div class="full">' + field('address', z.ask, 'required autocomplete="street-address"') + '</div>' : '<p class="full note-box" style="margin:0"><span><b>Collect in store.</b> We call you when it is ready. Bring your order number.</span></p>') +
      '<label class="field full" data-f="note"><span>Note for us (optional)</span><textarea name="note" rows="2">' + esc(d.note) + '</textarea></label></div>' +
      '<div class="co-actions"><button class="btn btn-light" type="button" data-go="1">Back to cart</button><button class="btn" type="submit">Continue to payment ' + LV.icon.arrow + '</button></div></form>';
  }
  function grab() {
    var f = $('#details');
    if (!f) return;
    ['company', 'tin', 'name', 'phone', 'email', 'address', 'note'].forEach(function (k) { var el = f.elements.namedItem(k); if (el) d[k] = el.value.trim(); });
  }
  function validate() {
    var f = $('#details'), first = null;
    $$('.field', f).forEach(function (lab) {
      var inp = $('input, textarea', lab), v = inp.value.trim(), msg = '';
      if (inp.required && !v) msg = 'Please fill this in.';
      else if (inp.name === 'phone' && v && v.replace(/\D/g, '').length < 7) msg = 'Enter a phone number with at least 7 digits.';
      else if (inp.name === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'That email does not look right.';
      var old = $('.err', lab); if (old) old.parentNode.removeChild(old);
      lab.classList.toggle('is-bad', !!msg);
      inp.setAttribute('aria-invalid', String(!!msg));
      if (msg) { var e = document.createElement('span'); e.className = 'err'; e.textContent = msg; lab.appendChild(e); if (!first) first = inp; }
    });
    if (first) first.focus();
    return !first;
  }

  /* ---------- step 3: payment ---------- */
  function payStep() {
    var t = totals(), z = LV.ZONES[d.zone];
    quoted = t.total; // the amount this screen shows; checked again before any order is saved
    if (!methodOk(d.method)) d.method = 'card';
    var opts = Object.keys(LV.PAY).map(function (k) {
      var P = LV.PAY[k], ok = methodOk(k), label = P.label, line = P.line;
      if (k === 'cod' && pickup()) { label = 'Pay when you collect'; line = 'Pay in cash or by card at the store.'; }
      var why = !ok ? '<small class="why">' + (P.business ? 'Choose Business in your details to use this.' : 'Not offered for ' + esc(z.label) + '.') + '</small>' : '';
      return '<label class="opt' + (ok ? '' : ' is-disabled') + '"><input type="radio" name="method" value="' + k + '"' + (d.method === k ? ' checked' : '') + (ok ? '' : ' disabled') + '><b>' + label + '</b><em></em><small>' + line + '</small>' + why + '</label>';
    }).join('');
    var extra = '';
    if (d.method === 'transfer') {
      extra = '<div class="note-box"><span><b>Bank details.</b> Account name, bank and account number would be shown here.</span><span>Use your order number as the reference.</span></div>' +
        '<label class="field" style="margin-top:14px"><span>Upload your transfer slip (optional now, you can send it later)</span><input type="file" id="slip" accept="image/*,.pdf"><small>Demo: the file stays on your device. Only its name is saved.</small></label>';
    } else if (d.method === 'card') {
      extra = '<p class="secure" style="margin-top:14px">' + LV.icon.lock + 'You enter your card on the secure gateway page. We never see or store card numbers.</p>';
    } else if (d.method === 'cod') {
      extra = '<div class="note-box"><span>' + (pickup() ? '<b>Pay at the store</b> ' + LV.money(t.total) + ' in cash or by card when you collect your order.' : '<b>Pay the rider</b> ' + LV.money(t.total) + ' in cash or by card when your order arrives.') + '</span></div>';
    } else if (d.method === 'invoice') {
      extra = '<div class="note-box"><span><b>On account.</b> We send an invoice to ' + esc(d.company || 'your company') + '. New accounts are checked before the first order ships.</span></div>';
    }
    var cta = d.method === 'card' ? 'Pay ' + LV.money(t.total) : 'Place order';
    return '<div class="co-panel"><h2>Payment</h2>' +
      '<div class="review"><b>Contact</b><span>' + esc(d.type === 'business' ? d.company + ' · ' : '') + esc(d.name) + ' · ' + esc(d.phone) + (d.email ? ' · ' + esc(d.email) : '') + '</span><button type="button" data-go="2">Change</button></div>' +
      '<div class="review"><b>' + (pickup() ? 'Collection' : 'Delivery') + '</b><span>' + esc(z.label) + (d.address && z.ask ? ' · ' + esc(d.address) : '') + '</span><span style="color:var(--muted)">' + esc(z.eta) + '</span><button type="button" data-go="2">Change</button></div>' +
      '<h3 id="t-pay">How would you like to pay?</h3><div class="opts" role="radiogroup" aria-labelledby="t-pay" id="methods">' + opts + '</div>' + extra +
      '<div class="co-actions"><button class="btn btn-light" type="button" data-go="2">Back</button><button class="btn" type="button" id="place">' + cta + ' ' + (d.method === 'card' ? LV.icon.lock.replace('<svg', '<svg width="18" height="18"') : LV.icon.arrow) + '</button></div></div>';
  }

  /* ---------- draw ---------- */
  function draw(focusTitle) {
    if (!LV.cart.count()) {
      root.innerHTML = '<div class="empty" style="padding:90px 20px 140px"><b>Your cart is empty</b><p>Add something from the shop and come back here.</p><p style="margin-top:20px"><a class="btn" href="shop.html">Shop coffee ' + LV.icon.arrow + '</a></p></div>';
      return;
    }
    if (step === 3 && !detailsOk()) step = 2;
    var body = step === 1 ? cartStep() : step === 2 ? detailsStep() : payStep();
    root.innerHTML = '<div class="co"><div>' + stepsBar() + body + '</div>' + summary() + '</div>';
    if (focusTitle) { var h = $('.co-panel h2'); h.tabIndex = -1; h.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  }
  // each step is a history entry, so Back and Forward and a reload land where you were
  function go(n, replace) {
    step = n;
    try { history[replace ? 'replaceState' : 'pushState']({ step: n }, '', 'checkout.html' + (n > 1 ? '?step=' + n : '')); } catch (e) { /* file:// */ }
    draw(true);
  }
  window.addEventListener('popstate', function () {
    if (step === 4) return;
    var n = parseInt(new URLSearchParams(location.search).get('step'), 10) || 1;
    grab(); remember(); step = Math.max(1, Math.min(3, n)); draw(true);
  });

  root.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) { grab(); remember(); go(+g.dataset.go); return; }
    if (e.target.closest('#place')) place();
  });
  root.addEventListener('submit', function (e) {
    e.preventDefault();
    grab();
    if (!validate()) return;
    if (!LV.ZONES[d.zone].ask) d.address = ''; // collecting in store: no address goes on the order
    remember();
    go(3);
  });
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'zone' || t.name === 'type') {
      grab(); d[t.name] = t.value; remember(); draw();
      var again = root.querySelector('input[name="' + t.name + '"][value="' + t.value + '"]'); if (again) again.focus();
    } else if (t.name === 'method') {
      d.method = t.value; remember(); draw();
      var m = root.querySelector('input[name="method"][value="' + t.value + '"]'); if (m) m.focus();
    } else if (t.id === 'slip') {
      d.slip = t.files && t.files[0] ? t.files[0].name : '';
    }
  });
  // the cart, or a price or stock level, can change from the drawer, another tab or the admin while this page is open
  function outside() {
    if (step === 4) return;
    var a = document.activeElement;
    if (a && root.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== 'radio') { grab(); } // do not redraw under someone typing
    else { if (!LV.cart.count()) step = 1; grab(); draw(); }
  }
  LV.on('cart', outside);
  LV.on('overrides', outside);

  /* ---------- place the order ---------- */
  function buildOrder(pay) {
    var t = totals();
    return {
      customer: { name: d.name, phone: d.phone, email: d.email, business: d.type === 'business', company: d.type === 'business' ? d.company : '', tin: d.type === 'business' ? d.tin : '' },
      zone: d.zone, address: LV.ZONES[d.zone].ask ? d.address : '', note: d.note,
      items: LV.cart.items().map(function (l) { return { id: l.id, name: l.product.name, sub: LV.subline(l.product), price: l.product.price, qty: l.qty }; }),
      subtotal: t.sub, fee: t.fee, total: t.total, pay: pay
    };
  }
  // true when what is in the cart no longer adds up to the amount this page showed
  function changed() {
    if (LV.cart.count() && totals().total === quoted) return false;
    if (gw.open) closeGateway();
    step = LV.cart.count() ? 3 : 1;
    draw(true);
    LV.toast(LV.cart.count() ? 'A price or stock level changed while you were here. Please check the new total.' : 'Those items just sold out. Nothing was charged.');
    return true;
  }
  function finish(pay) {
    if (changed()) return null;
    var o = LV.orders.create(buildOrder(pay));
    step = 4;
    LV.cart.clear();
    try { history.replaceState({ done: o.no }, '', 'checkout.html?done=' + encodeURIComponent(o.no)); } catch (e) { /* file:// */ }
    done(o);
    return o;
  }
  function place() {
    if (changed()) return;
    if (d.method === 'card') { openGateway(); return; }
    finish({ method: d.method, state: 'pending', ref: '', slip: d.slip });
  }

  function done(o) {
    var z = LV.ZONES[o.zone], coll = o.zone === 'pickup';
    var next = o.pay.state === 'paid' ? 'Your payment went through and the order is confirmed. We are packing it now.'
      : o.pay.method === 'transfer' ? 'Transfer ' + LV.money(o.total) + ' with ' + o.no + ' as the reference. We confirm the order when the money arrives.'
        : o.pay.method === 'cod' ? (coll ? 'We will confirm the order by phone, then get it ready. Pay when you collect.' : 'We will confirm the order by phone, then pack it. Pay the rider on delivery.')
          : 'We will check your account and confirm the order.';
    $('#co-title').textContent = 'Thank you';
    root.innerHTML = '<div class="done-hero"><div class="gw-ok">' + LV.icon.check + '</div><h2 class="display h-md">Order placed</h2>' +
      '<p class="lead">' + esc(next) + '</p>' +
      '<div class="order-no"><span>Order number</span><b id="ono">' + esc(o.no) + '</b><button type="button" id="copy">Copy</button></div>' +
      '<div class="cta-btns"><a class="btn" href="track.html?order=' + encodeURIComponent(o.no) + '">Track this order ' + LV.icon.arrow + '</a><a class="btn btn-light" href="shop.html">Keep shopping</a></div>' +
      '<p style="margin-top:22px;font-size:15px;color:var(--muted)">Demo tip: open the <a class="link" href="admin/index.html#orders">admin</a> in another tab, move this order along, and watch the tracking page update.</p></div>' +
      '<div class="trk" style="margin-top:8px"><div class="trk-card"><dl class="kv">' +
      '<div><dt>' + (coll ? 'Collect from' : 'Deliver to') + '</dt><dd>' + (coll ? 'Our store in Malé' : esc(z.label) + (o.address ? ', ' + esc(o.address) : '')) + '</dd></div>' +
      '<div><dt>When</dt><dd>' + esc(z.eta) + '</dd></div>' +
      '<div><dt>Payment</dt><dd>' + esc(LV.payLabel(o)) + (o.pay.ref ? ' · ref ' + esc(o.pay.ref) : '') + '</dd></div>' +
      '<div><dt>Contact</dt><dd>' + esc((o.customer.company ? o.customer.company + ' · ' : '') + o.customer.name + ' · ' + o.customer.phone) + '</dd></div></dl></div>' +
      '<div class="trk-card">' + o.items.map(function (l) { return '<div class="sum-row" style="padding:6px 0"><span>' + l.qty + ' × ' + esc(l.name) + '<br><small>' + esc(l.sub) + '</small></span><span>' + LV.money(l.price * l.qty) + '</span></div>'; }).join('') +
      '<div class="sum-row" style="padding-top:10px;border-top:1px solid var(--line);margin-top:8px"><span>' + (coll ? 'Collect in store' : 'Delivery') + '</span><span>' + (o.fee ? LV.money(o.fee) : 'Free') + '</span></div>' +
      '<div class="sum-row total" style="margin-top:6px"><span>Total</span><span>' + LV.money(o.total) + '</span></div></div></div>';
    window.scrollTo({ top: 0 });
    $('#co-title').focus({ preventScroll: true });
    $('#copy').addEventListener('click', function () {
      var done2 = function () { LV.toast('Order number copied'); };
      if (navigator.clipboard) navigator.clipboard.writeText(o.no).then(done2, done2); else done2();
    });
  }

  /* ---------- payment gateway demo ---------- */
  var gw = $('#gw'), box = $('#gw-box'), timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function luhn(n) {
    var s = 0, alt = false;
    for (var i = n.length - 1; i >= 0; i--) { var c = +n[i]; if (alt) { c *= 2; if (c > 9) c -= 9; } s += c; alt = !alt; }
    return n.length >= 13 && s % 10 === 0;
  }
  function brand(n) { return /^4/.test(n) ? 'visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'mc' : /^3[47]/.test(n) ? 'amex' : ''; }
  function head() {
    return '<div class="gw-head"><b id="gw-title">' + LV.icon.lock + 'Secure card payment</b><span>Demo</span></div>' +
      '<div class="gw-amt"><div><small>Paying</small>Lavazza Maldives</div><div style="text-align:right"><small>Amount</small><b>' + LV.money(quoted) + '</b></div></div>';
  }
  function openGateway() {
    cardForm();
    if (gw.showModal) gw.showModal(); else gw.setAttribute('open', '');
  }
  function closeGateway() {
    timers.forEach(clearTimeout); timers = [];
    if (gw.open) gw.close();
    var p = $('#place'); if (p) p.focus();
  }
  gw.addEventListener('cancel', function (e) { e.preventDefault(); closeGateway(); });

  function cardForm(msg) {
    box.innerHTML = head() + '<form class="gw-body" id="gw-form" novalidate>' +
      (msg ? '<p class="gw-hint" role="alert" style="background:#fdecec;color:#8f1717">' + esc(msg) + '</p>' : '') +
      '<label class="field" data-f="num"><span style="display:flex;justify-content:space-between;align-items:center">Card number <span class="gw-brands" aria-hidden="true"><i data-b="visa">VISA</i><i data-b="mc">MC</i><i data-b="amex">AMEX</i></span></span><input name="num" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="23" required></label>' +
      '<label class="field" data-f="holder"><span>Name on card</span><input name="holder" autocomplete="cc-name" required value="' + esc(d.name.toUpperCase()) + '"></label>' +
      '<div class="gw-row"><label class="field" data-f="exp"><span>Expiry</span><input name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" required></label>' +
      '<label class="field" data-f="cvv"><span>CVV</span><input name="cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" required type="password"></label></div>' +
      '<p class="gw-hint">Demo gateway, no card is charged. Test cards (tap to fill): <code data-fill="4111 1111 1111 1111">4111 1111 1111 1111</code> is approved, <code data-fill="4000 0000 0000 0002">4000 0000 0000 0002</code> is declined. On the live site this page is the bank\'s own payment page, for example the Bank of Maldives gateway.</p>' +
      '<button class="gw-btn" type="submit">Pay ' + LV.money(quoted) + '</button><button class="gw-cancel" type="button" data-gw-cancel>Cancel and go back</button></form>';
    var f = $('#gw-form'), num = f.elements.namedItem('num'), exp = f.elements.namedItem('exp');
    num.addEventListener('input', function () {
      var v = num.value.replace(/\D/g, '').slice(0, 19);
      num.value = v.replace(/(.{4})/g, '$1 ').trim();
      var b = brand(v);
      $$('.gw-brands i', f).forEach(function (i) { i.classList.toggle('is-on', i.dataset.b === b); });
    });
    exp.addEventListener('input', function (e) {
      var v = exp.value.replace(/\D/g, '').slice(0, 4);
      exp.value = v.length > 2 || (v.length === 2 && e.inputType !== 'deleteContentBackward') ? v.slice(0, 2) + '/' + v.slice(2) : v;
    });
    var clearErr = function (lab) { lab.classList.remove('is-bad'); var e = $('.err', lab); if (e) e.parentNode.removeChild(e); };
    f.addEventListener('input', function (e) { var lab = e.target.closest('.field'); if (lab) clearErr(lab); });
    f.addEventListener('click', function (e) {
      var c = e.target.closest('[data-fill]');
      if (c) {
        num.value = c.dataset.fill; num.dispatchEvent(new Event('input'));
        var now = new Date(); exp.value = '12/' + String((now.getFullYear() + 2) % 100).padStart(2, '0'); f.elements.namedItem('cvv').value = '123';
        $$('.field', f).forEach(clearErr);
      }
      if (e.target.closest('[data-gw-cancel]')) closeGateway();
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = num.value.replace(/\D/g, ''), m = exp.value.match(/^(\d\d)\/(\d\d)$/), bad = {};
      if (!luhn(n)) bad.num = 'Check the card number.';
      if (!f.elements.namedItem('holder').value.trim()) bad.holder = 'Enter the name on the card.';
      var now = new Date();
      if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < now.getFullYear() * 12 + now.getMonth() + 1) bad.exp = 'Check the expiry date.';
      if (!/^\d{3,4}$/.test(f.elements.namedItem('cvv').value)) bad.cvv = '3 or 4 digits.';
      var first = null;
      $$('.field', f).forEach(function (lab) {
        var k = lab.dataset.f; clearErr(lab);
        lab.classList.toggle('is-bad', !!bad[k]);
        if (bad[k]) { var s = document.createElement('span'); s.className = 'err'; s.textContent = bad[k]; lab.appendChild(s); if (!first) first = $('input', lab); }
      });
      if (first) { first.focus(); return; }
      wait('Contacting your bank', function () { otp(n); });
    });
    setTimeout(function () { num.focus(); }, 50);
  }
  function wait(text, then) {
    box.innerHTML = head() + '<div class="gw-wait" role="status"><div class="spinner"></div><b>' + text + '…</b><span style="color:#56607a">Do not close this window.</span></div>';
    later(then, 1500);
  }
  function otp(n) {
    box.innerHTML = head() + '<form class="gw-body" id="otp-form"><div><b style="font-size:17px">Confirm it is you</b><p style="color:#56607a;margin-top:6px">Your bank sent a 6 digit code by SMS to the phone linked to the card ending ' + n.slice(-4) + '.</p></div>' +
      '<div class="otp" role="group" aria-label="6 digit code">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" maxlength="1" aria-label="Digit ' + (i + 1) + '" autocomplete="' + (i ? 'off' : 'one-time-code') + '">'; }).join('') + '</div>' +
      '<p class="gw-hint">Demo: type any 6 digits. This step stands in for 3-D Secure.</p>' +
      '<button class="gw-btn" type="submit">Verify and pay</button><button class="gw-cancel" type="button" data-gw-cancel>Cancel payment</button></form>';
    var f = $('#otp-form'), ins = $$('.otp input', f);
    ins.forEach(function (inp, i) {
      inp.addEventListener('input', function () {
        var v = inp.value.replace(/\D/g, '');
        if (v.length > 1) { v.split('').slice(0, 6 - i).forEach(function (c, j) { ins[i + j].value = c; }); (ins[Math.min(5, i + v.length)] || inp).focus(); return; }
        inp.value = v; if (v && ins[i + 1]) ins[i + 1].focus();
      });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
      inp.addEventListener('paste', function (e) {
        var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!t) return; e.preventDefault(); t.split('').forEach(function (c, j) { if (ins[j]) ins[j].value = c; }); (ins[Math.min(5, t.length)] || ins[5]).focus();
      });
    });
    f.addEventListener('click', function (e) { if (e.target.closest('[data-gw-cancel]')) closeGateway(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ins.some(function (i) { return !i.value; })) { (ins.filter(function (i) { return !i.value; })[0]).focus(); return; }
      wait('Authorising payment', function () { result(n); });
    });
    setTimeout(function () { ins[0].focus(); }, 50);
  }
  function result(n) {
    if (/0002$/.test(n)) {
      box.innerHTML = head() + '<div class="gw-wait" role="alert"><div class="gw-ok bad">' + LV.icon.x + '</div><b style="font-size:18px">Payment declined</b><span style="color:#56607a">The bank did not approve this card. Nothing was charged.</span>' +
        '<button class="gw-btn" type="button" id="gw-retry" style="margin-top:6px">Try another card</button><button class="gw-cancel" type="button" id="gw-back">Choose another way to pay</button></div>';
      $('#gw-retry').addEventListener('click', function () { cardForm(); });
      $('#gw-back').addEventListener('click', closeGateway);
      $('#gw-retry').focus();
      return;
    }
    // approved: save the order straight away, so closing this window cannot lose a payment that went through
    var ref = 'DEMO' + Math.floor(100000 + Math.random() * 899999);
    var o = finish({ method: 'card', state: 'paid', ref: ref, card: brand(n).toUpperCase() + ' ending ' + n.slice(-4) });
    if (!o) return;
    box.innerHTML = head() + '<div class="gw-wait" role="status"><div class="gw-ok">' + LV.icon.check + '</div><b style="font-size:18px">Payment approved</b><span style="color:#56607a">Reference ' + ref + '. Taking you back to the shop.</span></div>';
    later(function () { if (gw.open) gw.close(); $('#co-title').focus({ preventScroll: true }); }, 1300);
  }

  /* ---------- start: a reload lands on the same step, or on the thank-you page of the order just placed ---------- */
  var qs = new URLSearchParams(location.search), doneNo = qs.get('done'), was = doneNo && LV.orders.get(doneNo);
  if (was) { step = 4; done(was); }
  else {
    step = Math.max(1, Math.min(3, parseInt(qs.get('step'), 10) || 1));
    draw();
  }
})();
