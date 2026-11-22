// Checks for the bugs an independent review found (2026-11-23). Run after e2e.mjs.
// node tools/e2e-fixes.mjs [baseUrl] [engine=chromium|webkit]
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const { chromium, webkit } = require('playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:4173/';
const ENGINE = process.argv[3] || 'chromium';
const H = process.env.HOME + '/Library/Caches/ms-playwright/';
const b = ENGINE === 'webkit' ? await webkit.launch({ executablePath: H + 'webkit-2370/pw_run.sh' })
  : await chromium.launch({ executablePath: H + 'chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
let pass = 0, fail = 0; const errs = [];
const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log('FAIL', name, extra); } };
const watch = p => { p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); }); };
const txt = (p, s) => p.locator(s).first().innerText();
const p = await ctx.newPage(); watch(p);
const a = await ctx.newPage(); watch(a);
const pay = async (card = '4111 1111 1111 1111') => {
  await p.click('#place'); await p.click(`[data-fill="${card}"]`); await p.click('#gw-form button[type=submit]');
  await p.waitForSelector('.otp input'); await p.locator('.otp input').first().click(); await p.keyboard.type('123456');
  await p.click('#otp-form button[type=submit]');
};
const toPayment = async (zone = 'male') => {
  await p.goto(BASE + 'checkout.html', { waitUntil: 'networkidle' });
  await p.click('[data-go="2"]');
  await p.check('input[name=type][value=personal]');
  await p.fill('[name=name]', 'Review Tester'); await p.fill('[name=phone]', '7711111');
  await p.check(`input[name=zone][value=${zone}]`);
  if (zone !== 'pickup') await p.fill('[name=address]', 'H. Test House, 1st floor');
  await p.click('#details button[type=submit]');
  await p.waitForSelector('#place');
};

// search ignores accents, order lookup forgives spacing, home tile counts match their links
await p.goto(BASE + 'shop.html?q=qualita', { waitUntil: 'networkidle' });
ok(parseInt(await txt(p, '#count')) >= 8, 'search "qualita" finds Qualità', await txt(p, '#count'));
await p.goto(BASE + 'shop.html?q=tabli', { waitUntil: 'networkidle' });
ok(parseInt(await txt(p, '#count')) === 5, 'search "tabli" finds Tablì', await txt(p, '#count'));
await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
const tile = await p.locator('.tile').nth(1); const tileN = parseInt(await tile.locator('small').innerText());
await p.goto(BASE + (await tile.getAttribute('href')), { waitUntil: 'networkidle' });
ok(parseInt(await txt(p, '#count')) === tileN, 'beans and ground tile count equals the shop count', tileN + ' vs ' + await txt(p, '#count'));
ok((await txt(p, '#shop-title')).toLowerCase() === 'beans & ground', 'title for two categories', await txt(p, '#shop-title'));
ok(!(await p.content()).includes('—'), 'no em dash on the shop page');
await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
ok(!(await p.locator('main').innerText()).includes('—'), 'no em dash in the home page copy');
await p.goto(BASE + 'track.html', { waitUntil: 'networkidle' });
await p.fill('#order', 'lvz 24022'); await p.click('#track-form button');
ok(await p.locator('.trk').count() === 1, 'order lookup accepts "lvz 24022"');

// add button cannot stick on "Added"
await p.goto(BASE + 'shop.html?cat=ground', { waitUntil: 'networkidle' });
const add = p.locator('#grid [data-add]').first();
await add.click(); await add.click(); await p.waitForTimeout(1800);
ok((await add.innerText()).trim() === 'Add', 'Add button label comes back after two quick taps', await add.innerText());

// stock runs out while the customer is on the payment step: no empty paid order
await p.evaluate(() => { LV.cart.clear(); LV.cart.add('amm-qualita-rossa', 2); });
await toPayment();
await a.goto(BASE + 'admin/index.html#products', { waitUntil: 'networkidle' });
await a.click('#login button[type=submit]'); await a.waitForSelector('#prows');
const before = await p.evaluate(() => LV.orders.all().length);
const row = a.locator('#prows tr[data-id="amm-qualita-rossa"]');
await row.locator('[data-k="stock"]').fill('0'); await row.locator('[data-k="stock"]').press('Tab');
await p.waitForTimeout(600);
ok((await txt(p, '#co-root')).toLowerCase().includes('cart is empty'), 'checkout notices the sold-out product', (await txt(p, '#co-root')).slice(0, 60));
ok(await p.evaluate(() => LV.orders.all().length) === before, 'no order was created');
// blank price is refused
await row.locator('[data-k="stock"]').fill('140'); await row.locator('[data-k="stock"]').press('Tab');
const r2 = a.locator('#prows tr[data-id="amm-qualita-rossa"]');
await r2.locator('[data-k="price"]').fill(''); await r2.locator('[data-k="price"]').press('Tab'); await a.waitForTimeout(200);
ok(await a.evaluate(() => LV.product('amm-qualita-rossa').price) === 139, 'blank price is not saved');
// price change while on the payment step: the customer is told, nothing is saved at the old or new total silently
await p.evaluate(() => { LV.cart.clear(); LV.cart.add('amm-qualita-rossa', 2); });
await toPayment();
const r3 = a.locator('#prows tr[data-id="amm-qualita-rossa"]');
await r3.locator('[data-k="price"]').fill('999'); await r3.locator('[data-k="price"]').press('Tab'); await p.waitForTimeout(600);
ok((await txt(p, '#place')).replace(/\D/g, '') === String(999 * 2), 'payment button shows the new total', await txt(p, '#place'));
await r3.locator('[data-k="price"]').fill('139'); await r3.locator('[data-k="price"]').press('Tab'); await p.waitForTimeout(400);

// approved payment survives closing the window early, and the thank-you page survives a reload
await pay();
await p.waitForSelector('#ono', { timeout: 8000 });
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const no = await txt(p, '#ono');
ok(/^LVZ-\d+$/.test(no), 'order saved the moment the payment is approved', no);
await p.waitForTimeout(1500);
await p.reload({ waitUntil: 'networkidle' });
ok(await p.locator('#ono').count() === 1 && (await txt(p, '#ono')) === no, 'thank-you page survives a reload');
// cancel puts back exactly what the order took; a sample order puts back nothing
const stock = () => a.evaluate(() => LV.product('amm-qualita-rossa').stock);
ok(await stock() === 138, 'order took 2 from stock', String(await stock()));
await a.goto(BASE + 'admin/index.html#orders/' + no, { waitUntil: 'networkidle' }); await a.waitForSelector('.panel');
a.once('dialog', d => d.accept()); await a.click('.panel [data-cancel]'); await a.waitForTimeout(300);
ok(await stock() === 140, 'cancel put 2 back', String(await stock()));
const sample = await a.evaluate(() => LV.orders.all().filter(o => o.sample && o.status === 'placed')[0]);
const sid = sample.items[0].id, sBefore = await a.evaluate(id => LV.product(id).stock, sid);
await a.goto(BASE + 'admin/index.html#orders/' + sample.no, { waitUntil: 'networkidle' }); await a.waitForSelector('.panel');
a.once('dialog', d => d.accept()); await a.click('.panel [data-cancel]'); await a.waitForTimeout(300);
ok(await a.evaluate(id => LV.product(id).stock, sid) === sBefore, 'cancelling a sample order adds no stock');
await p.goto(BASE + 'track.html?order=' + no, { waitUntil: 'networkidle' });
ok((await txt(p, '.trk')).includes('to be refunded'), 'cancelled paid order says a refund is due');

// double-click on a row action moves one step only
await a.goto(BASE + 'admin/index.html#orders', { waitUntil: 'networkidle' }); await a.waitForSelector('table.t');
const target = await a.evaluate(() => LV.orders.all().filter(o => o.status === 'confirmed')[0].no);
await a.locator(`[data-next="${target}"]`).dblclick(); await a.waitForTimeout(300);
ok(await a.evaluate(n => LV.orders.get(n).status, target) === 'packed', 'double-click moves one step', await a.evaluate(n => LV.orders.get(n).status, target));

// collect in store: no address on the order, no rider in the wording
await p.evaluate(() => { LV.cart.clear(); LV.cart.add('ground-qualita-oro', 1); });
await toPayment('male');
await p.click('.review [data-go="2"]');
await p.check('input[name=zone][value=pickup]'); await p.click('#details button[type=submit]'); await p.waitForSelector('#place');
ok(!(await txt(p, '.co-panel')).includes('Test House'), 'pickup shows no street address');
await p.check('input[name=method][value=cod]');
ok(!(await txt(p, '.co-panel')).toLowerCase().includes('rider'), 'pickup wording has no rider', (await txt(p, '.co-panel')).slice(0, 200));
await p.click('#place'); await p.waitForSelector('#ono');
const pno = await txt(p, '#ono');
ok(await p.evaluate(n => LV.orders.get(n).address, pno) === '', 'pickup order stores no address');
// back button inside checkout
await p.evaluate(() => { LV.cart.add('ground-qualita-oro', 1); });
await toPayment('male');
await p.goBack(); await p.waitForTimeout(300);
ok(await p.locator('#details').count() === 1, 'browser Back goes to the details step');
await p.reload({ waitUntil: 'networkidle' });
ok(await p.locator('#details').count() === 1 && (await p.inputValue('[name=name]')) === 'Review Tester', 'reload keeps the step and what was typed');

// promotions: bar link is independent, banner range falls back to the category, sticker hides with the product
await a.goto(BASE + 'admin/index.html#promos', { waitUntil: 'networkidle' }); await a.waitForSelector('#promo-form');
await a.selectOption('[name=productId]', 'beans-qualita-rossa'); await a.selectOption('[name=bannerLink]', 'range');
await a.click('#promo-form button[type=submit]'); await a.waitForTimeout(300);
const pr = await a.evaluate(() => LV.promo());
ok(pr.strip.href === 'shop.html?system=tabli', 'bar link unchanged when the featured product changes', pr.strip.href);
ok(pr.banner.href === 'shop.html?cat=beans', 'range link for beans goes to the category', pr.banner.href);
await a.selectOption('[name=productId]', 'ncc-gourmet-vanilla'); await a.click('#promo-form button[type=submit]'); await a.waitForTimeout(300);
await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
const fs = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#sticker text')).fontSize));
ok(fs < 13.4 && fs >= 7.5, 'sticker text shrinks for a long product name', String(fs));
await a.evaluate(() => LV.setOverride('ncc-gourmet-vanilla', { hidden: true })); await p.reload({ waitUntil: 'networkidle' });
ok(await p.locator('#sticker[hidden]').count() === 1 && await p.locator('#new[hidden]').count() === 1, 'sticker and banner hide with the product');

// phone: payment window fits a short screen, no sideways scroll with a long email, admin fits
const m = await (await b.newContext({ viewport: { width: 375, height: 553 }, isMobile: true, hasTouch: true })).newPage(); watch(m);
await m.goto(BASE + 'shop.html?cat=capsules', { waitUntil: 'networkidle' });
ok(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'capsule cards do not overflow at 375');
await m.locator('#grid [data-add]').first().click();
await m.goto(BASE + 'checkout.html', { waitUntil: 'networkidle' });
await m.click('[data-go="2"]'); await m.check('input[name=type][value=business]');
await m.fill('[name=company]', 'Sample Lagoon Resort'); await m.fill('[name=name]', 'Purchasing'); await m.fill('[name=phone]', '7722222');
await m.fill('[name=email]', 'purchasing.manager@samplelagoonresortmaldives.com'); await m.check('input[name=zone][value=male]'); await m.fill('[name=address]', 'Office');
await m.click('#details button[type=submit]'); await m.waitForSelector('#place');
ok(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'long email does not widen the payment step');
await m.click('#place'); await m.waitForSelector('#gw-form');
const fit = await m.evaluate(() => { const d = document.querySelector('#gw').getBoundingClientRect(); return [Math.round(d.top), Math.round(d.bottom), innerHeight, document.querySelector('#gw').scrollHeight > document.querySelector('#gw').clientHeight]; });
ok(fit[0] >= 0 && fit[1] <= fit[2] && fit[3], 'payment window fits and scrolls inside a 553 px tall screen', fit.join(','));
await m.goto(BASE + 'index.html#quote', { waitUntil: 'networkidle' }); await m.waitForTimeout(700);
ok(await m.evaluate(() => document.querySelector('#quote').getBoundingClientRect().top) >= 60, 'quote box lands below the header', String(await m.evaluate(() => document.querySelector('#quote').getBoundingClientRect().top)));
const am = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); watch(am);
await am.goto(BASE + 'admin/index.html', { waitUntil: 'networkidle' }); await am.click('#login button[type=submit]'); await am.waitForSelector('.kpis');
ok(await am.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'admin dashboard fits a phone', String(await am.evaluate(() => document.documentElement.scrollWidth)));
await am.click('nav a[href="#products"]'); await am.waitForSelector('#prows');
ok(await am.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'admin products fits a phone', String(await am.evaluate(() => document.documentElement.scrollWidth)));

// keyboard: skip link shows, Tab stays inside the open cart
await p.evaluate(() => LV.resetDemo()); await p.goto(BASE + 'shop.html', { waitUntil: 'networkidle' });
// Safari only tabs to links when the user switches that on, so focus the link directly
ok(await p.evaluate(() => { const l = document.querySelector('a.sr'); l.focus(); const r = l.getBoundingClientRect(); return document.activeElement === l && r.width > 50 && r.height > 20; }), 'skip link is visible when focused');
await p.locator('#grid [data-add]').first().click(); await p.click('[data-cart-open]'); await p.waitForTimeout(500);
for (let i = 0; i < 12; i++) await p.keyboard.press('Tab');
ok(await p.evaluate(() => !!document.activeElement.closest('#cart')), 'Tab stays inside the open cart');
await p.click('#cart [data-q="1"]');
ok(await p.evaluate(() => document.activeElement.getAttribute('data-q') === '1' && !!document.activeElement.closest('#cart')), 'focus stays on + after the cart redraws');

console.log(`\n${ENGINE} fixes: ${pass} passed, ${fail} failed`);
console.log(errs.length ? errs.slice(0, 12).join('\n') : 'no console errors');
await b.close();
