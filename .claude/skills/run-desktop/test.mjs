import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron');
let step = 0;

async function ss(app, page, label) {
  step++;
  const name = `${String(step).padStart(2, '0')}-${label}`;
  const f = path.join(SHOT_DIR, name + '.png');
  await page.screenshot({ path: f });
  console.log(`[${step}] screenshot: ${f}`);
  return f;
}

async function clickText(page, text) {
  const r = await page.evaluate(t => {
    const els = [...document.querySelectorAll('button, a, [role="button"], li, td, div[class*="btn"], span[class*="btn"], input[type="submit"]')];
    const el = els.find(e => e.textContent?.trim() === t)
            ?? els.find(e => e.textContent?.includes(t));
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK: ' + el.tagName + ' "' + el.textContent?.trim().substring(0, 60) + '"';
  }, text);
  console.log(`  click-text "${text}" → ${r}`);
  return r;
}

async function click(page, sel) {
  const r = await page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK';
  }, sel);
  console.log(`  click "${sel}" → ${r}`);
  return r;
}

async function fillInput(page, sel, val) {
  const r = await page.evaluate(([s, v]) => {
    const el = document.querySelector(s);
    if (!el) return 'NOT_FOUND';
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) { setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }
    else { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }
    return 'OK';
  }, [sel, val]);
  console.log(`  fill "${sel}" = "${val}" → ${r}`);
  return r;
}

async function wait(page, sel, timeout = 12000) {
  try {
    await page.waitForSelector(sel, { timeout });
    console.log(`  wait "${sel}" → found`);
    return true;
  } catch {
    console.log(`  wait "${sel}" → TIMEOUT`);
    return false;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getBodyText(page) {
  return page.evaluate(() => document.body?.innerText?.substring(0, 1000) ?? '(empty)');
}

// ─── Main test ───────────────────────────────────────────────────────────────
let app;
try {
  console.log('\n=== Nexora POS — Step-by-step test ===\n');
  console.log('Launching Electron app...');

  app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
    timeout: 60_000,
  });

  console.log('Waiting for app initialization (backend + MongoDB startup)...');
  await sleep(15_000);

  // List all windows
  const wins = app.windows();
  console.log(`Windows count: ${wins.length}`);
  for (const w of wins) console.log('  window:', w.url());

  let page = wins.find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow();
  console.log('Using page:', page.url());

  // ── Step 1: Landing / loading screen ──────────────────────────────────────
  await ss(app, page, 'initial-load');
  let bodyText = await getBodyText(page);
  console.log('  Body preview:', bodyText.substring(0, 300));

  // Wait for the app to fully load (look for common elements)
  await sleep(3000);
  await ss(app, page, 'after-wait');

  // ── Step 2: Check all windows & webContents ───────────────────────────────
  console.log('\n[Step] Inspecting webContents...');
  try {
    const wcs = await app.evaluate(({ webContents }) =>
      webContents.getAllWebContents().map(w => ({ id: w.id, type: w.getType(), url: w.getURL() })));
    for (const w of wcs) console.log(`  [${w.id}] ${w.type}: ${w.url}`);

    // Try to find the main UI page
    const mainWC = wcs.find(w => w.url.includes('localhost') || w.url.includes('index.html') || w.url.includes('file://'));
    if (mainWC) console.log('  → Main UI appears to be id=' + mainWC.id);
  } catch (e) {
    console.log('  webContents inspect error:', e.message);
  }

  // ── Step 3: Login screen check ─────────────────────────────────────────────
  console.log('\n[Step] Checking for login screen...');
  await ss(app, page, 'login-check');
  const pageText = await getBodyText(page);
  console.log('  Page text:', pageText.substring(0, 500));

  // Try to find login form
  const hasLoginInput = await page.evaluate(() => !!document.querySelector('input[type="password"], input[placeholder*="password" i], input[placeholder*="كلمة" ]'));
  console.log('  Has login input:', hasLoginInput);

  if (hasLoginInput) {
    console.log('\n[Step] Attempting login...');
    // Fill username
    await fillInput(page, 'input[type="text"], input[type="email"], input[name="username"], input[placeholder*="user" i], input[placeholder*="اسم"]', 'admin');
    await sleep(300);
    // Fill password
    await fillInput(page, 'input[type="password"]', 'admin123');
    await sleep(300);
    await ss(app, page, 'login-filled');
    // Click login button
    await clickText(page, 'Login');
    await clickText(page, 'تسجيل الدخول');
    await click(page, 'button[type="submit"]');
    await sleep(3000);
    await ss(app, page, 'after-login');
  }

  // ── Step 4: Main dashboard ─────────────────────────────────────────────────
  console.log('\n[Step] Main dashboard...');
  await sleep(2000);
  await ss(app, page, 'dashboard');
  const dashText = await getBodyText(page);
  console.log('  Dashboard text:', dashText.substring(0, 500));

  // ── Step 5: Navigate to POS / Cashier ─────────────────────────────────────
  console.log('\n[Step] Looking for POS/Cashier navigation...');
  const navItems = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a, button, [role="menuitem"], nav li, .sidebar a, .menu a')];
    return links.map(el => el.textContent?.trim()).filter(t => t && t.length < 50).slice(0, 20);
  });
  console.log('  Nav items found:', navItems);

  // Try clicking POS link
  await clickText(page, 'POS');
  await sleep(1000);
  await clickText(page, 'نقطة البيع');
  await sleep(1000);
  await ss(app, page, 'pos-screen');

  // ── Step 6: Try ShiftPanel ────────────────────────────────────────────────
  console.log('\n[Step] Looking for Shift panel...');
  await clickText(page, 'Shift');
  await sleep(1000);
  await clickText(page, 'الوردية');
  await sleep(1000);
  await ss(app, page, 'shift-panel');

  // ── Step 7: Navigate to PayLater ──────────────────────────────────────────
  console.log('\n[Step] Looking for Pay Later...');
  await clickText(page, 'Pay Later');
  await sleep(1000);
  await clickText(page, 'الدفع لاحقاً');
  await sleep(1000);
  await ss(app, page, 'pay-later');

  // ── Step 8: Final state screenshot ───────────────────────────────────────
  console.log('\n[Step] Final state...');
  await sleep(2000);
  await ss(app, page, 'final');

  console.log('\n=== Test complete ===');
  console.log('Screenshots saved to:', SHOT_DIR);
  const shots = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log('Files:', shots.join(', '));

} catch (err) {
  console.error('\nFATAL ERROR:', err.message);
  console.error(err.stack);
} finally {
  if (app) {
    console.log('\nClosing app...');
    await app.close().catch(() => {});
  }
}
