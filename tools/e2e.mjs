// End-to-end run of the demo: shop -> cart -> checkout -> gateway -> tracking -> admin and back.
// node e2e.mjs [baseUrl] [shotsDir] [engine=chromium|webkit]
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/'); // playwright-core is looked up from the folder you run this in
const { chromium, webkit } = require('playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:4173/';
const SHOTS = process.argv[3] || '.';
const ENGINE = process.argv[4] || 'chromium';
const H = process.env.HOME + '/Library/Caches/ms-playwright/';
const b = ENGINE === 'webkit' ? await webkit.launch({ executablePath: H + 'webkit-2370/pw_run.sh' })
  : await chromium.launch({ executablePath: H + 'chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
let pass = 0, fail = 0; const errs = [];
const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log('FAIL', name, extra); } };
const watch = p => { p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); }); p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); }); };
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/e2e-${n}.jpg`, type: 'jpeg', quality: 70 });
const txt = (p, s) => p.locator(s).first().innerText();

const p = await ctx.newPage(); watch(p);

// ---------- home ----------
await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
ok(await p.locator('.tile').count() === 3, 'three range tiles');
ok(await p.locator('#best-rail .bs').count() >= 6, 'best sellers rail');
ok(await p.locator('#new:not([hidden]) h2').count() === 1, 'new release banner shown');
ok((await txt(p, '#sticker')).includes('NEW'), 'sticker');
// machines: function chips
await p.locator('#machines').scrollIntoViewIfNeeded();
await p.click('#mach-chips [data-f="milk"]');
ok(await p.locator('.mach:not(.is-off)').count() === 3, 'milk frother -> 3 machines', String(await p.locator('.mach:not(.is-off)').count()));
await p.click('#mach-chips [data-f="grinder"]');
ok(await p.locator('.mach:not(.is-off)').count() === 1, 'milk + grinder -> 1 machine');
ok((await txt(p, '#mach-count')).includes('1 of 8'), 'machine count text', await txt(p, '#mach-count'));
await p.click('#mach-chips [data-f="voice"]');
ok((await txt(p, '#mach-count')).startsWith('No machine'), 'impossible combo message');
await shot(p, 'home-machines');
// finder
await p.locator('#finder').scrollIntoViewIfNeeded();
const before = await txt(p, '#find-out .pc-name');
await p.locator('#find-range').fill('10');
ok((await txt(p, '#find-style')) === 'Bold & intense', 'slider label', await txt(p, '#find-style'));
ok((await txt(p, '#find-out .pc-name')) !== before, 'finder results change with slider');
await p.click('#find-class [data-v="signature"]');
await p.click('#find-format [data-v="beans"]');
ok((await p.locator('#find-all').getAttribute('href')) === 'shop.html?style=bold&cls=signature&cat=beans', 'finder deep link', await p.locator('#find-all').getAttribute('href'));
await shot(p, 'home-finder');
// env tabs
await p.locator('#env').scrollIntoViewIfNeeded();
await p.click('#env-tab-cafe');
ok((await txt(p, '#env-cap')).toLowerCase().includes('caf'), 'env caption');
ok((await p.locator('#env-actions a').first().getAttribute('href')) === 'shop.html?env=cafe', 'env shop link');
ok(await p.locator('#env-picks .env-pick').count() === 3, 'env picks');
await p.waitForTimeout(900); await shot(p, 'home-env');
// add from best sellers + cart drawer
await p.locator('#best-rail').scrollIntoViewIfNeeded();
await p.locator('#best-rail [data-add]').first().click();
ok((await txt(p, '[data-cart-count]')) === '1', 'cart count 1');
ok(await p.locator('.toast.is-on').count() === 1, 'toast shown');
await p.click('.toast.is-on button');
await p.waitForTimeout(600);
ok(await p.locator('#cart.is-open .line').count() === 1, 'drawer shows line');
await p.click('#cart [data-q="1"]');
ok((await txt(p, '#cart .qty span')) === '2', 'qty 2 in drawer');
await shot(p, 'cart-drawer');
await p.keyboard.press('Escape');
ok(await p.locator('#cart.is-open').count() === 0, 'escape closes drawer');
// quote form
await p.locator('#quote').scrollIntoViewIfNeeded();
await p.click('#quote-form button[type=submit]');
ok(await p.locator('#quote-form .field.is-bad').count() === 3, 'quote validation', String(await p.locator('#quote-form .field.is-bad').count()));
await p.fill('#quote-form [name=name]', 'Test Resort'); await p.fill('#quote-form [name=contact]', 'Ali'); await p.fill('#quote-form [name=phone]', '7771234');
await p.fill('#quote-form [name=volume]', '30 kg'); await p.click('#quote-form button[type=submit]');
ok((await txt(p, '.biz-ok')).includes('Q-10'), 'quote confirmation');

// ---------- shop ----------
await p.goto(BASE + 'shop.html?env=resort', { waitUntil: 'networkidle' });
ok((await txt(p, '#shop-title')).toLowerCase() === 'for resorts & hotels', 'shop title for env', await txt(p, '#shop-title'));
const nResort = parseInt(await txt(p, '#count'));
ok(nResort > 5 && nResort < 57, 'resort filter count', String(nResort));
await p.click('#cats [data-cat="capsules"]');
await p.check('[data-g="system"] input[value="ncc"]');
ok(p.url().includes('cat=capsules') && p.url().includes('system=ncc') && p.url().includes('env=resort'), 'url sync', p.url());
const n2 = parseInt(await txt(p, '#count'));
ok(n2 > 0 && n2 < nResort, 'narrowed', n2 + '');
ok(await p.locator('#grid .pc').count() === n2, 'grid matches count');
await p.fill('#q', 'ristretto'); await p.waitForTimeout(400);
ok(parseInt(await txt(p, '#count')) === 1, 'search ristretto');
await p.click('#active .clear');
ok(parseInt(await txt(p, '#count')) === 25, 'clear all keeps category', await txt(p, '#count'));
await p.selectOption('#sort', 'price-desc');
const prices = await p.locator('#grid .pc-price').allInnerTexts();
ok(prices.map(x => +x.replace(/\D/g, '')).every((v, i, a) => !i || a[i - 1] >= v), 'sort price desc');
await shot(p, 'shop');
await p.goto(BASE + 'shop.html?cat=machines&func=milk,app', { waitUntil: 'networkidle' });
ok(parseInt(await txt(p, '#count')) === 1, 'machines with milk AND app', await txt(p, '#count'));

// ---------- product ----------
await p.goto(BASE + 'product.html?id=m-jolie-milk-evo', { waitUntil: 'networkidle' });
ok((await txt(p, '.pdp-info h1')).toUpperCase().includes('JOLIE & MILK'), 'pdp title');
ok(await p.locator('.specs tr').count() >= 8, 'specs table');
ok(await p.locator('#more-grid .pc').count() === 4, 'coffee for this machine');
await p.click('.pdp-thumbs [data-view="1"]');
ok(await p.locator('.pdp-media .photo:not([hidden])').count() === 1, 'gallery photo shows');
await p.click('.pdp-thumbs [data-view="pack"]');
await p.click('.pdp-buy [data-step="1"]');
await p.click('#buy');
ok((await txt(p, '[data-cart-count]')) === '4', 'cart count 4 (2 + 2)', await txt(p, '[data-cart-count]'));
await p.goto(BASE + 'product.html?id=nope', { waitUntil: 'networkidle' });
ok((await txt(p, '#pdp')).toLowerCase().includes('could not find'), 'unknown product state');

// ---------- checkout: card approved ----------
await p.goto(BASE + 'checkout.html', { waitUntil: 'networkidle' });
ok(await p.locator('.co-panel .line').count() === 2, 'checkout lines');
await p.click('[data-go="2"]');
await p.click('#details button[type=submit]');
ok(await p.locator('#details .field.is-bad').count() >= 3, 'details validation');
await p.fill('[name=name]', 'Aisha Test'); await p.fill('[name=phone]', '7712345'); await p.fill('[name=email]', 'aisha@example.com');
await p.check('input[name=zone][value=atoll]');
await p.fill('[name=address]', 'B. Eydhafushi, on the Baa ferry');
ok((await txt(p, '.co-sum')).includes('Other islands'), 'summary shows zone');
ok((await p.inputValue('[name=name]')) === 'Aisha Test', 'fields survive zone change');
await shot(p, 'checkout-details');
await p.click('#details button[type=submit]');
ok(await p.locator('input[name=method][value=cod]').isDisabled(), 'COD disabled for atoll');
ok(await p.locator('input[name=method][value=invoice]').isDisabled(), 'invoice disabled for personal');
const total = (await txt(p, '.co-sum .total')).replace(/\D/g, '');
await shot(p, 'checkout-payment');
await p.click('#place');
ok(await p.locator('dialog#gw[open]').count() === 1, 'gateway opens');
await p.click('#gw-form button[type=submit]');
ok(await p.locator('#gw-form .field.is-bad').count() >= 3, 'gateway validation');
// declined card first
await p.click('[data-fill="4000 0000 0000 0002"]');
await shot(p, 'gateway-card');
await p.click('#gw-form button[type=submit]');
await p.waitForSelector('.otp input');
for (const [i, c] of [...'123456'].entries()) await p.locator('.otp input').nth(i).fill(c);
await shot(p, 'gateway-otp');
await p.click('#otp-form button[type=submit]');
await p.waitForSelector('#gw-retry');
ok((await txt(p, '#gw-box')).includes('declined'), 'declined card path');
await p.click('#gw-retry');
await p.click('[data-fill="4111 1111 1111 1111"]');
await p.click('#gw-form button[type=submit]');
await p.waitForSelector('.otp input');
await p.locator('.otp input').first().click(); await p.keyboard.type('654321');
await p.click('#otp-form button[type=submit]');
await p.waitForSelector('#ono', { timeout: 8000 });
const orderNo = await txt(p, '#ono');
ok(/^LVZ-\d{5}$/.test(orderNo), 'order number', orderNo);
ok((await txt(p, '[data-cart-count]')) === '0', 'cart emptied');
await shot(p, 'order-done');

// ---------- tracking + admin in two tabs ----------
await p.click('a[href^="track.html?order="]');
await p.waitForSelector('.trk');
ok((await txt(p, '.trk-head .pill')).toLowerCase() === 'confirmed', 'paid order starts confirmed', await txt(p, '.trk-head .pill'));
ok(await p.locator('.tl li.is-done').count() === 2, 'two steps done');
const a = await ctx.newPage(); watch(a);
await a.goto(BASE + 'admin/index.html', { waitUntil: 'networkidle' });
await a.click('#login button[type=submit]');
await a.waitForSelector('.kpis');
ok(await a.locator('#chart .band').count() === 14, 'chart has 14 days');
await a.locator('#chart .band').nth(13).hover(); await a.waitForTimeout(250);
ok(await a.locator('#tip.is-on').count() === 1, 'chart tooltip');
await shot(a, 'admin-dashboard');
await a.click('nav a[href="#orders"]');
await a.waitForSelector('table.t');
ok((await txt(a, 'table.t tbody tr')).includes(orderNo), 'new order is first in admin', orderNo);
await shot(a, 'admin-orders');
await a.click(`[data-open="${orderNo}"]`);
await a.waitForSelector('.panel');
ok((await txt(a, '.panel')).includes('Aisha Test') && (await txt(a, '.panel')).includes('Eydhafushi'), 'panel shows customer');
await a.fill('#note', 'Packed by Ahmed');
await a.click('.panel [data-next]');
await a.waitForTimeout(300);
ok((await txt(a, '.panel .pill')).toLowerCase() === 'packed', 'admin moved to packed', await txt(a, '.panel .pill'));
await p.waitForTimeout(700);
ok((await txt(p, '.trk-head .pill')).toLowerCase() === 'packed', 'tracking tab updated live', await txt(p, '.trk-head .pill'));
ok((await txt(p, '.tl')).includes('Packed by Ahmed'), 'note visible to customer');
await a.fill('#note', 'On MV Baa Express, leaves 4pm');
await a.click('.panel [data-next]');
await p.waitForTimeout(700);
ok((await txt(p, '.trk-head .pill')).toLowerCase() === 'handed to the boat', 'shipped label for atoll', await txt(p, '.trk-head .pill'));
await shot(a, 'admin-order-panel'); await shot(p, 'track-live');
await a.keyboard.press('Escape'); await a.waitForTimeout(250);
ok(await a.locator('.panel').count() === 0, 'escape closes panel');

// products: price + hide, reflected in the shop
await a.click('nav a[href="#products"]');
await a.fill('#pq', 'Qualità Rossa'); await a.waitForTimeout(400);
const row = a.locator('#prows tr[data-id="amm-qualita-rossa"]');
await row.locator('[data-k="price"]').fill('155'); await row.locator('[data-k="price"]').press('Tab');
await a.waitForTimeout(200);
await a.locator('#prows tr[data-id="ground-qualita-rossa"] [data-k="shown"]').uncheck();
await shot(a, 'admin-products');
await p.goto(BASE + 'product.html?id=amm-qualita-rossa', { waitUntil: 'networkidle' });
ok((await txt(p, '.pdp-price')).includes('155'), 'price change shows in shop', await txt(p, '.pdp-price'));
await p.goto(BASE + 'shop.html?cat=ground', { waitUntil: 'networkidle' });
ok(parseInt(await txt(p, '#count')) === 6, 'hidden product gone from shop', await txt(p, '#count'));

// promotions
await a.click('nav a[href="#promos"]');
await a.waitForSelector('#promo-form');
await a.selectOption('[name=productId]', 'm-assoluta');
await a.fill('[name=title]', 'Assoluta. Beans in, espresso out.');
await a.fill('[name=stripText]', 'New: the Assoluta bean to cup machine is here.');
await a.click('#promo-form button[type=submit]');
await a.waitForTimeout(1500); await shot(a, 'admin-promos');
await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
ok((await txt(p, '.strip')).includes('Assoluta'), 'strip updated');
ok((await txt(p, '#new h2')).toUpperCase().includes('ASSOLUTA'), 'banner updated', await txt(p, '#new h2'));
await p.locator('#new').scrollIntoViewIfNeeded(); await p.waitForTimeout(1200); await shot(p, 'home-banner-edited');
// quotes
await a.click('nav a[href="#quotes"]'); await a.waitForSelector('.quote');
ok((await txt(a, '.main')).includes('Test Resort'), 'quote request in admin');

// ---------- checkout: business on account, COD, transfer ----------
await p.goto(BASE + 'product.html?id=beans-crema-e-aroma', { waitUntil: 'networkidle' });
await p.click('#buy');
await p.goto(BASE + 'checkout.html', { waitUntil: 'networkidle' });
await p.click('[data-go="2"]');
await p.check('input[name=type][value=business]');
await p.fill('[name=company]', 'Test Café Pvt Ltd');
await p.check('input[name=zone][value=male]');
await p.fill('[name=address]', 'Ameenee Magu');
await p.click('#details button[type=submit]');
ok(!(await p.locator('input[name=method][value=invoice]').isDisabled()), 'invoice enabled for business');
ok(!(await p.locator('input[name=method][value=cod]').isDisabled()), 'COD enabled in Malé');
await p.check('input[name=method][value=invoice]');
await p.click('#place');
await p.waitForSelector('#ono');
const no2 = await txt(p, '#ono');
ok(no2 !== orderNo && /^LVZ-/.test(no2), 'second order', no2);
await p.goto(BASE + 'track.html?order=' + no2, { waitUntil: 'networkidle' });
ok((await txt(p, '.trk-head .pill')).toLowerCase() === 'order placed', 'unpaid order is placed');
ok((await txt(p, '.trk')).includes('On account'), 'payment label');
await p.goto(BASE + 'track.html?order=LVZ-99999', { waitUntil: 'networkidle' });
ok((await txt(p, '#track-out')).toLowerCase().includes('no order'), 'unknown order state');
// admin: cancel puts stock back
await a.click('nav a[href="#orders"]');
await a.click(`[data-open="${no2}"]`);
a.once('dialog', d => d.accept());
await a.click('.panel [data-cancel]');
await a.waitForTimeout(300);
ok((await txt(a, '.panel .pill')).toLowerCase() === 'cancelled', 'cancelled');
// reset
await a.keyboard.press('Escape');
await a.click('nav a[href="#settings"]');
a.once('dialog', d => d.accept());
await a.click('[data-reset]'); await a.waitForTimeout(400);
await p.goto(BASE + 'product.html?id=amm-qualita-rossa', { waitUntil: 'networkidle' });
ok((await txt(p, '.pdp-price')).includes('139'), 'reset restores price');

console.log(`\n${ENGINE}: ${pass} passed, ${fail} failed`);
console.log(errs.length ? errs.slice(0, 20).join('\n') : 'no console or network errors');
await b.close();
