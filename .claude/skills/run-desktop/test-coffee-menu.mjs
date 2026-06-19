/**
 * Verify: Coffee Express category management (admin page) + "Today's Menu"
 * section on POS (category pills, price badges, multi-size expand).
 *
 * Adapted from the other scripts in this folder for Windows:
 * - electron.exe (not the Linux "electron" binary)
 * - no DISPLAY / xvfb needed
 * - screenshot dir under the Windows temp folder
 *
 * Login: username "admin" / PIN "886659"
 */
import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR   = path.resolve(__dirname, '../../..');
const SHOT_DIR  = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'nexora-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
for (const f of fs.readdirSync(SHOT_DIR)) fs.unlinkSync(path.join(SHOT_DIR, f));

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
let step = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function ss(page, label) {
  step++;
  const f = path.join(SHOT_DIR, `${String(step).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: f });
  console.log(`  [📸 ${step}] ${label} -> ${f}`);
  return f;
}
const bodyText = async (page, len = 300) =>
  page.evaluate(n => document.body?.innerText?.substring(0, n) ?? '', len);

let app;
try {
  console.log('=== Coffee Express / Today\'s Menu verification ===\n');
  console.log('electron binary:', electronBin, fs.existsSync(electronBin) ? '(found)' : '(MISSING)');

  app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR],
    timeout: 60_000,
  });

  console.log('Waiting for backend + Mongo startup...');
  await sleep(18_000);

  const page = app.windows().find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow();
  console.log('window url:', page.url());
  await ss(page, 'boot');

  // ── Login if needed ────────────────────────────────────────────────────────
  const isLoginScreen = await page.evaluate(() =>
    !!document.querySelector('input[placeholder*="username" i]'));
  console.log('login screen?', isLoginScreen);

  if (isLoginScreen) {
    await page.evaluate(() => document.querySelector('input[placeholder*="username" i]')?.focus());
    await page.keyboard.type('admin', { delay: 60 });
    await sleep(200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'));
      b?.click();
    });
    await sleep(800);
    await ss(page, 'login-pin-step');

    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      let n = 0;
      for (const d of '886659') { const b = btns.find(b => b.textContent?.trim() === d); if (b) { b.click(); n++; } }
      return n;
    });
    if (clicked < 6) await page.keyboard.type('886659', { delay: 80 });
    await sleep(2000);
    await ss(page, 'after-login');
  }

  console.log('body text after login/boot:', (await bodyText(page, 200)).replace(/\n/g, ' | '));

  // ── Helper: open the floating nav and click an item by text ────────────────
  async function navTo(label) {
    const navBtn = await page.evaluate(() => {
      const btn = document.querySelector('[title*="Navigation"]');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!navBtn) { console.log('  nav button NOT FOUND'); return false; }
    await page.mouse.click(navBtn.x, navBtn.y);
    await sleep(600);
    const found = await page.evaluate(name => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === name || b.textContent?.includes(name));
      if (!b) return false;
      b.click(); return true;
    }, label);
    console.log(`  nav -> "${label}":`, found);
    await sleep(1200);
    return found;
  }

  // ── 1. POS — check Today's Menu section exists with current cups ───────────
  console.log('\n━━ 1. POS — Today\'s Menu (before any category set) ━━');
  await navTo('POS');
  await ss(page, 'pos-initial');
  const menuInfo1 = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes("Today's Menu"));
    if (!h2) return { found: false };
    let box = h2; for (let i = 0; i < 3 && box.parentElement; i++) box = box.parentElement;
    return { found: true, text: box.innerText?.substring(0, 400) };
  });
  console.log('  Today\'s Menu section:', JSON.stringify(menuInfo1));

  // ── 2. Coffee Express admin page ────────────────────────────────────────────
  console.log('\n━━ 2. Coffee Express admin page ━━');
  await navTo('Coffee Express');
  await ss(page, 'coffee-express-admin');
  console.log('  page text:', (await bodyText(page, 250)).replace(/\n/g, ' | '));

  // Unlock if locked
  const locked = await page.evaluate(() => document.body.innerText.includes('Coffee Express is locked'));
  console.log('  locked?', locked);
  if (locked) {
    await page.evaluate(() => document.querySelector('input[placeholder*="coffee code" i]')?.focus());
    await page.keyboard.type('03037808', { delay: 50 });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Unlock'));
      b?.click();
    });
    await sleep(1000);
    await ss(page, 'coffee-express-unlocked');
  }

  // List existing cup group names
  const groupNames = await page.evaluate(() => {
    return [...document.querySelectorAll('p.text-xs.font-semibold.text-amber-950')].map(p => p.textContent.trim());
  });
  console.log('  existing cup groups:', groupNames);

  // ── 3. Set a category on the first existing cup via edit ───────────────────
  if (groupNames.length > 0) {
    const target = groupNames[0];
    console.log(`\n━━ 3. Set category "Hot" on "${target}" ━━`);
    const editClicked = await page.evaluate(name => {
      const p = [...document.querySelectorAll('p.text-xs.font-semibold.text-amber-950')].find(p => p.textContent.trim() === name);
      if (!p) return 'NAME_NOT_FOUND';
      let card = p; for (let i = 0; i < 6 && card.parentElement; i++) { card = card.parentElement; if (card.className?.toString().includes('rounded-2xl') && card.className?.toString().includes('border-amber-200')) break; }
      const editBtn = card.querySelector('button');
      const btns = [...card.querySelectorAll('button')];
      const pencil = btns.find(b => b.className?.toString().includes('bg-black/40'));
      if (!pencil) return 'EDIT_BTN_NOT_FOUND';
      pencil.click();
      return 'OK';
    }, target);
    console.log('  click edit ->', editClicked);
    await sleep(500);
    await ss(page, 'cup-edit-mode');

    const catClicked = await page.evaluate(name => {
      // Scope to the open edit card — find it via the name <input> showing the
      // group's name (value === name), not by button text (which also matches
      // the "Add a coffee cup" form's identical preset chips earlier in the DOM).
      const input = [...document.querySelectorAll('input')].find(i => i.value === name);
      if (!input) return 'CARD_NOT_FOUND';
      let card = input; for (let i = 0; i < 6 && card.parentElement; i++) { card = card.parentElement; if (card.className?.toString().includes('rounded-2xl')) break; }
      const b = [...card.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Hot');
      if (!b) return 'CHIP_NOT_FOUND';
      b.click(); return 'OK';
    }, target);
    console.log('  click "Hot" chip ->', catClicked);
    await sleep(300);
    await ss(page, 'cup-category-selected');

    const saveClicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Save'));
      if (!b) return 'NOT_FOUND';
      b.click(); return 'OK';
    });
    console.log('  click Save ->', saveClicked);
    await sleep(1200);
    await ss(page, 'cup-category-saved');
  }

  // ── 4. Search filter in cup list ────────────────────────────────────────────
  console.log('\n━━ 4. Cup search filter ━━');
  const searchTarget = groupNames[0] ? groupNames[0].slice(0, 3) : '';
  if (searchTarget) {
    await page.evaluate(() => document.querySelector('input[placeholder*="Search cups" i]')?.focus());
    await page.keyboard.type(searchTarget, { delay: 60 });
    await sleep(500);
    await ss(page, 'cup-search-filtered');
    const visibleCount = await page.evaluate(() =>
      document.querySelectorAll('p.text-xs.font-semibold.text-amber-950').length);
    console.log(`  typed "${searchTarget}" -> ${visibleCount} card(s) visible`);
    // clear
    await page.evaluate(() => {
      const el = document.querySelector('input[placeholder*="Search cups" i]');
      if (el) { el.focus(); document.execCommand && null; }
    });
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await sleep(300);
  }

  // ── 5. Back to POS — category pill + price badge + multi-size expand ───────
  console.log('\n━━ 5. POS — Today\'s Menu after setting category ━━');
  await navTo('POS');
  await sleep(1000);
  await ss(page, 'pos-after-category');

  const pills = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes("Today's Menu"));
    if (!h2) return null;
    let box = h2; for (let i = 0; i < 3 && box.parentElement; i++) box = box.parentElement;
    return [...box.querySelectorAll('button')].map(b => b.textContent.trim());
  });
  console.log('  category pills in Today\'s Menu:', pills);

  if (pills && pills.includes('Hot')) {
    const clicked = await page.evaluate(() => {
      const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes("Today's Menu"));
      let box = h2; for (let i = 0; i < 3 && box.parentElement; i++) box = box.parentElement;
      const b = [...box.querySelectorAll('button')].find(b => b.textContent.trim() === 'Hot');
      if (!b) return 'NOT_FOUND';
      b.click(); return 'OK';
    });
    console.log('  click "Hot" pill ->', clicked);
    await sleep(500);
    await ss(page, 'pos-menu-filtered-hot');

    // revert to All
    await page.evaluate(() => {
      const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes("Today's Menu"));
      let box = h2; for (let i = 0; i < 3 && box.parentElement; i++) box = box.parentElement;
      const b = [...box.querySelectorAll('button')].find(b => b.textContent.trim() === 'All');
      b?.click();
    });
    await sleep(400);
  }

  // Try expanding a multi-size cup ("X sizes" badge) if one exists
  const multiSizeCard = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes("Today's Menu"));
    let box = h2; for (let i = 0; i < 3 && box.parentElement; i++) box = box.parentElement;
    const badge = [...box.querySelectorAll('span')].find(s => /\d+ sizes/.test(s.textContent || ''));
    if (!badge) return null;
    let card = badge; for (let i = 0; i < 4 && card.parentElement; i++) { card = card.parentElement; if (card.className?.toString().includes('cursor-pointer')) break; }
    const r = card.getBoundingClientRect();
    return { text: badge.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log('  multi-size card found:', multiSizeCard);
  if (multiSizeCard) {
    await page.mouse.click(multiSizeCard.x, multiSizeCard.y);
    await sleep(500);
    await ss(page, 'pos-menu-multisize-expanded');
  }

  console.log('\n=== Done ===');
  const files = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log(`${files.length} screenshots in ${SHOT_DIR}:`);
  files.forEach(f => console.log('  ' + f));

} catch (e) {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
} finally {
  if (app) await app.close().catch(() => {});
}
