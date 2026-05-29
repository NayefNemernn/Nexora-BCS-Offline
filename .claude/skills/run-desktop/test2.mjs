import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });
// clear old shots
for (const f of fs.readdirSync(SHOT_DIR)) fs.unlinkSync(path.join(SHOT_DIR, f));

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron');
let step = 0;

async function ss(page, label) {
  step++;
  const f = path.join(SHOT_DIR, `${String(step).padStart(2,'0')}-${label}.png`);
  await page.screenshot({ path: f });
  console.log(`[${step}] 📸 ${label} → ${f}`);
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clickText(page, text, desc) {
  const r = await page.evaluate(t => {
    const all = [...document.querySelectorAll('*')];
    const el = all.find(e =>
      e.children.length === 0 && e.textContent?.trim() === t ||
      e.tagName === 'BUTTON' && e.textContent?.includes(t) ||
      e.getAttribute('title') === t
    );
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK: ' + el.tagName + ' class=' + el.className.toString().substring(0, 60);
  }, text);
  console.log(`  click "${desc || text}" → ${r}`);
  return r !== 'NOT_FOUND';
}

async function click(page, sel, desc) {
  const r = await page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK';
  }, sel);
  console.log(`  click [${desc || sel}] → ${r}`);
  return r === 'OK';
}

async function getLinks(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('a, nav a, .sidebar a, aside a, [href]')];
    return els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim()?.substring(0,40) })).filter(e => e.text);
  });
}

async function getAllButtons(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="button"], [type="submit"]')];
    return els.map(e => e.textContent?.trim()?.substring(0, 50)).filter(Boolean).slice(0, 30);
  });
}

async function getNavItems(page) {
  return page.evaluate(() => {
    const sels = ['nav', 'aside', '.sidebar', '.menu', '[role="navigation"]', 'header', '.navbar', '.top-bar'];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return { sel: s, text: el.innerText?.substring(0, 300) };
    }
    return { sel: 'none', text: '' };
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
let app;
try {
  console.log('=== Nexora POS — Detailed Step-by-Step Test ===\n');
  app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    env: { ...process.env, DISPLAY: ':0' },
    timeout: 60_000,
  });
  console.log('Waiting 15s for backend + MongoDB startup...');
  await sleep(15_000);

  const wins = app.windows().filter(w => !w.url().startsWith('devtools://'));
  const page = wins[0] ?? await app.firstWindow();
  console.log('Main window URL:', page.url());

  // ── 1. Initial POS screen ─────────────────────────────────────────────────
  console.log('\n━━ Step 1: Initial POS screen ━━');
  await ss(page, 'pos-home');

  const buttons = await getAllButtons(page);
  console.log('  Buttons found:', buttons);

  const links = await getLinks(page);
  console.log('  Links found:', links.slice(0, 10));

  const nav = await getNavItems(page);
  console.log('  Nav element:', nav.sel, '→', nav.text.replace(/\n/g, ' | ').substring(0, 200));

  // ── 2. Inspect sidebar / left rail ────────────────────────────────────────
  console.log('\n━━ Step 2: Inspect sidebar icons ━━');
  const sidebar = await page.evaluate(() => {
    // Look for sidebar-style containers with icons/links
    const candidates = [...document.querySelectorAll('aside, .sidebar, [class*="sidebar"], [class*="nav"], [class*="menu"]')];
    return candidates.map(el => ({
      tag: el.tagName,
      cls: el.className?.toString().substring(0, 80),
      text: el.innerText?.substring(0, 200),
      children: el.children.length,
    }));
  });
  console.log('  Sidebar candidates:', JSON.stringify(sidebar, null, 2));

  // ── 3. Try clicking a product card ────────────────────────────────────────
  console.log('\n━━ Step 3: Add product to cart ━━');
  // Find first product card and click the + button or the card itself
  const productClicked = await page.evaluate(() => {
    // Try clicking first product card
    const card = document.querySelector('[class*="product"], [class*="item-card"], [class*="ProductCard"], .product-card');
    if (card) { card.click(); return 'clicked card: ' + card.className?.toString().substring(0,60); }
    // Try clicking a + button
    const plusBtns = [...document.querySelectorAll('button')].filter(b => b.textContent?.trim() === '+');
    if (plusBtns.length) { plusBtns[0].click(); return 'clicked + button'; }
    return 'NOT_FOUND';
  });
  console.log('  Product click:', productClicked);
  await sleep(800);
  await ss(page, 'product-added');

  // ── 4. Click another product ──────────────────────────────────────────────
  console.log('\n━━ Step 4: Add second product ━━');
  await page.evaluate(() => {
    const plusBtns = [...document.querySelectorAll('button')].filter(b => b.textContent?.trim() === '+');
    if (plusBtns.length > 1) plusBtns[1].click();
  });
  await sleep(800);
  await ss(page, 'two-products-in-cart');

  // ── 5. Check cart state ───────────────────────────────────────────────────
  console.log('\n━━ Step 5: Cart state ━━');
  const cartText = await page.evaluate(() => {
    const cart = document.querySelector('[class*="cart"], [class*="Cart"], [class*="order"], [class*="Order"], aside');
    return cart?.innerText?.substring(0, 400) ?? '(cart not found)';
  });
  console.log('  Cart:', cartText.replace(/\n/g, ' | '));

  // ── 6. Category filter ────────────────────────────────────────────────────
  console.log('\n━━ Step 6: Category filters ━━');
  const cats = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const catBtns = btns.filter(b => ['All', 'drinks', 'snacks', 'Dokhan', 'مواد غذائية', '🏪', '📦', '🥤', '🍟'].some(t => b.textContent?.includes(t)));
    return catBtns.map(b => b.textContent?.trim());
  });
  console.log('  Category buttons:', cats);

  // Click "drinks" category
  await clickText(page, 'drinks', 'drinks category');
  await sleep(600);
  await ss(page, 'category-drinks');

  // Click All
  const allClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const allBtn = btns.find(b => b.textContent?.includes('All') || b.textContent?.includes('🏪'));
    if (allBtn) { allBtn.click(); return 'OK'; }
    return 'NOT_FOUND';
  });
  console.log('  Click All:', allClicked);
  await sleep(600);

  // ── 7. Search bar ─────────────────────────────────────────────────────────
  console.log('\n━━ Step 7: Search ━━');
  const searchInput = await page.evaluate(() => {
    const input = document.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="scan" i], input[placeholder*="بحث"]');
    return input ? { placeholder: input.placeholder, name: input.name } : null;
  });
  console.log('  Search input:', searchInput);
  if (searchInput) {
    await click(page, 'input[type="search"], input[placeholder*="search" i], input[placeholder*="scan" i], input[placeholder*="بحث"]', 'search input');
    await page.keyboard.type('Pepsi', { delay: 50 });
    await sleep(600);
    await ss(page, 'search-pepsi');
    // clear search
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await sleep(400);
  }

  // ── 8. Top nav: Drawer button ─────────────────────────────────────────────
  console.log('\n━━ Step 8: Drawer button ━━');
  await clickText(page, 'Drawer', 'Drawer');
  await sleep(1000);
  await ss(page, 'drawer-panel');

  // Close if modal opened
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 9. Return button ──────────────────────────────────────────────────────
  console.log('\n━━ Step 9: Return button ━━');
  await clickText(page, 'Return', 'Return');
  await sleep(1000);
  await ss(page, 'return-panel');
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 10. History button ────────────────────────────────────────────────────
  console.log('\n━━ Step 10: History ━━');
  await clickText(page, 'History', 'History');
  await sleep(1000);
  await ss(page, 'history-panel');
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 11. Look for sidebar navigation to other pages ─────────────────────────
  console.log('\n━━ Step 11: Look for other pages (Shift, PayLater, etc.) ━━');
  const allLinks = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')];
    return links.map(a => ({ href: a.getAttribute('href'), text: a.textContent?.trim()?.substring(0,50) }));
  });
  console.log('  All anchor links:', JSON.stringify(allLinks));

  const leftSide = await page.evaluate(() => {
    const left = document.querySelector('aside, .sidebar, [class*="sidebar"], [class*="Sidebar"]');
    if (left) {
      const links = [...left.querySelectorAll('a, button, [role="button"]')];
      return links.map(el => ({ tag: el.tagName, href: el.getAttribute('href'), title: el.getAttribute('title'), text: el.textContent?.trim()?.substring(0,50), cls: el.className?.toString().substring(0,60) }));
    }
    return [];
  });
  console.log('  Left sidebar items:', JSON.stringify(leftSide, null, 2));

  // ── 12. Try navigating to different routes ────────────────────────────────
  console.log('\n━━ Step 12: Navigate to /shift ━━');
  const currentURL = page.url();
  const baseURL = currentURL.replace(/\/#.*$/, '').replace(/\/[^/]*$/, '');
  console.log('  Base URL:', baseURL);

  // Navigate to shift page
  await page.evaluate(() => { window.location.href = window.location.origin + '/#/shift'; });
  await sleep(2000);
  await ss(page, 'shift-page');
  console.log('  URL after nav:', page.url());
  const shiftText = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  console.log('  Shift page text:', shiftText?.replace(/\n/g,' | '));

  // ── 13. Navigate to /pay-later ────────────────────────────────────────────
  console.log('\n━━ Step 13: Navigate to pay-later ━━');
  await page.evaluate(() => { window.location.href = window.location.origin + '/#/pay-later'; });
  await sleep(2000);
  await ss(page, 'pay-later-page');
  const payLaterText = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  console.log('  PayLater text:', payLaterText?.replace(/\n/g,' | '));

  // ── 14. Navigate to dashboard/home ────────────────────────────────────────
  console.log('\n━━ Step 14: Navigate to /dashboard ━━');
  await page.evaluate(() => { window.location.href = window.location.origin + '/#/dashboard'; });
  await sleep(2000);
  await ss(page, 'dashboard-page');

  // ── 15. Go back to POS and do checkout ────────────────────────────────────
  console.log('\n━━ Step 15: Back to POS, checkout flow ━━');
  await page.evaluate(() => { window.location.href = window.location.origin + '/'; });
  await sleep(3000);
  await ss(page, 'back-to-pos');

  // Add item to cart
  await page.evaluate(() => {
    const plusBtns = [...document.querySelectorAll('button')].filter(b => b.textContent?.trim() === '+');
    if (plusBtns.length) plusBtns[0].click();
  });
  await sleep(500);

  // Click Checkout
  const checkoutClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => b.textContent?.includes('Checkout') || b.textContent?.includes('دفع'));
    if (btn) { btn.click(); return 'OK: ' + btn.textContent?.trim(); }
    return 'NOT_FOUND';
  });
  console.log('  Checkout click:', checkoutClicked);
  await sleep(1500);
  await ss(page, 'checkout-modal');

  // Screenshot the checkout modal
  const checkoutContent = await page.evaluate(() => {
    const modal = document.querySelector('[class*="modal"], [class*="Modal"], [class*="dialog"], [role="dialog"]');
    return modal?.innerText?.substring(0, 500) ?? document.body?.innerText?.substring(0, 500);
  });
  console.log('  Checkout content:', checkoutContent?.replace(/\n/g,' | '));

  // Close checkout
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 16. Final overview ────────────────────────────────────────────────────
  console.log('\n━━ Step 16: Final state ━━');
  await ss(page, 'final');

  console.log('\n=== Test complete ===');
  const files = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log('Screenshots:', files.join('\n             '));

} catch (e) {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
} finally {
  if (app) { await app.close().catch(() => {}); }
}
