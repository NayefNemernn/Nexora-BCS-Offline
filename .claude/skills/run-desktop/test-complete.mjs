/**
 * Nexora POS — Complete step-by-step test
 * Login: username "admin" / PIN "886659"  (superadmin)
 * OR store admin if session is already valid.
 *
 * Key behaviors to know:
 * - Navigation: floating button bottom-left (F1 / `) → opens panel
 * - Add to cart: click the product CARD body (top area)
 * - Escape clears the cart — never use it to close modals
 * - Login is 2-step: username → PIN
 * - JWT_SECRET is fixed "nexora-desktop-offline-secret"
 * - Window: 1400×900
 */
import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR   = path.resolve(__dirname, '../../..');
const SHOT_DIR  = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });
for (const f of fs.readdirSync(SHOT_DIR)) fs.unlinkSync(path.join(SHOT_DIR, f));

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron');
let step = 0;

const ss    = async (page, label) => {
  step++;
  const f = path.join(SHOT_DIR, `${String(step).padStart(2,'0')}-${label}.png`);
  await page.screenshot({ path: f });
  console.log(`  [📸 ${step}] ${label}`);
  return f;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const bodyText = async (page, len = 300) =>
  page.evaluate(n => document.body?.innerText?.substring(0, n) ?? '', len);

const evalClick = async (page, sel, desc) => {
  const r = await page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return 'NOT_FOUND';
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return 'OK';
  }, sel);
  console.log(`  click [${desc||sel}] → ${r}`);
  return r === 'OK';
};

// ─── Login helper ─────────────────────────────────────────────────────────────
async function loginIfNeeded(page) {
  const isLoginScreen = await page.evaluate(() =>
    !!document.querySelector('input[placeholder*="username" i], input[placeholder*="Enter your username"]')
  );
  if (!isLoginScreen) { console.log('  Already logged in ✓'); return; }

  console.log('  Login screen detected — logging in...');
  await ss(page, 'login-screen');

  // Step 1: Enter username
  const usernameInput = await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder*="username" i], input[placeholder*="Enter your username"]');
    if (!inp) return false;
    inp.focus();
    return true;
  });
  if (!usernameInput) { console.log('  ERROR: username input not found'); return; }
  await page.keyboard.type('admin', { delay: 80 });
  await sleep(300);

  // Click Continue
  const cont = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.includes('Continue'));
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('  Clicked Continue →', cont);
  await sleep(800);
  await ss(page, 'login-pin-step');

  // Step 2: Enter PIN "886659"
  // The PIN uses keyboard number keys or on-screen numpad buttons
  const pinDigits = '886659';

  // Try clicking numpad buttons first
  const numpadClicked = await page.evaluate(pin => {
    const btns = [...document.querySelectorAll('button')];
    let clicked = 0;
    for (const digit of pin) {
      const b = btns.find(b => b.textContent?.trim() === digit);
      if (b) { b.click(); clicked++; }
    }
    return clicked;
  }, pinDigits);
  console.log('  Numpad digits clicked:', numpadClicked);

  if (numpadClicked < 4) {
    // Fallback: use keyboard
    await page.keyboard.type(pinDigits, { delay: 100 });
  }

  await sleep(2000); // auto-submits at 6 digits
  await ss(page, 'after-login');

  const afterText = await bodyText(page, 200);
  console.log('  After login:', afterText.replace(/\n/g, ' | '));
}

// ─── Find nav button ──────────────────────────────────────────────────────────
async function getNavBtn(page) {
  return page.evaluate(() => {
    // Try title attribute (backtick in selector is fine in JS strings)
    let btn = document.querySelector('button[title="Navigation (` or F1)"]');
    if (!btn) {
      // Fallback: fixed bottom-left button (bottom-5 left-5 = 20px from each)
      const all = [...document.querySelectorAll('button')];
      btn = all.find(b => {
        const r = b.getBoundingClientRect();
        return r.x >= 16 && r.x <= 30 && r.y >= 820 && r.y <= 870;
      });
    }
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
}

async function openNav(page, navBtn) {
  await page.mouse.click(navBtn.x, navBtn.y);
  await sleep(700);
}

async function closeNav(page) {
  // Click outside the panel — center of the product grid
  await page.mouse.click(700, 400);
  await sleep(400);
}

async function navToPage(page, navBtn, pageName) {
  console.log(`\n━━ Navigate → ${pageName} ━━`);
  await openNav(page, navBtn);
  const found = await page.evaluate(name => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.trim() === name || b.textContent?.includes(name));
    if (!b) return false;
    b.click(); return true;
  }, pageName);
  console.log(`  Nav to "${pageName}":`, found ? 'OK' : 'NOT_FOUND');
  await sleep(1500);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
let app;
try {
  console.log('=== Nexora POS — Complete Test ===\n');

  app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    env: { ...process.env, DISPLAY: ':0' },
    timeout: 60_000,
  });

  console.log('Waiting 18s for backend + MongoDB startup...');
  await sleep(18_000);

  const page = app.windows().find(w => !w.url().startsWith('devtools://'))
             ?? await app.firstWindow();
  console.log('URL:', page.url());

  // ── STEP 0: Handle login ──────────────────────────────────────────────────
  console.log('\n━━ Step 0: Login ━━');
  await loginIfNeeded(page);
  await sleep(1000);

  const currentText = await bodyText(page, 400);
  console.log('Current page text:', currentText.replace(/\n/g, ' | ').substring(0, 200));
  await ss(page, 'post-login-state');

  // ── STEP 1: POS / main screen ─────────────────────────────────────────────
  console.log('\n━━ Step 1: POS screen ━━');

  // Check if we're on superadmin panel or regular POS
  const isSuperAdmin = await page.evaluate(() =>
    document.body?.innerText?.includes('Super Admin') ||
    document.body?.innerText?.includes('superadmin') ||
    document.body?.innerText?.includes('Stores')
  );
  console.log('  Is super admin panel?', isSuperAdmin);

  if (isSuperAdmin) {
    await ss(page, 'superadmin-panel');
    // Explore super admin panel
    const saText = await bodyText(page, 600);
    console.log('  SuperAdmin content:', saText.replace(/\n/g, ' | ').substring(0, 400));

    // Check stores list
    const storesEl = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const el = all.find(e => e.textContent?.includes('BCS') || e.textContent?.includes('Stores'));
      return el?.innerText?.substring(0, 200);
    });
    console.log('  Stores:', storesEl?.replace(/\n/g, ' | '));
  } else {
    // Regular POS
    await ss(page, 'pos-home');

    // Find nav button
    const navBtn = await getNavBtn(page);
    console.log('  Nav button:', navBtn);

    if (navBtn) {
      // ── STEP 2: Open navigation panel ──────────────────────────────────
      console.log('\n━━ Step 2: Navigation panel ━━');
      await openNav(page, navBtn);
      await ss(page, 'nav-panel');

      const navText = await page.evaluate(() => {
        // Find the nav panel (absolute, bottom-16, from left)
        const all = [...document.querySelectorAll('div')];
        const panel = all.find(d => {
          const r = d.getBoundingClientRect();
          return r.x < 50 && r.y > 200 && r.width > 300 && r.height > 200;
        });
        return panel?.innerText?.substring(0, 300);
      });
      console.log('  Nav panel text:', navText?.replace(/\n/g, ' | '));

      await closeNav(page);

      // ── STEP 3: Add products to cart ───────────────────────────────────
      console.log('\n━━ Step 3: Add products ━━');
      const cards = await page.evaluate(() => {
        // Product cards are divs with cursor-pointer + rounded-2xl in the product grid
        const all = [...document.querySelectorAll('div[class*="cursor-pointer"]')];
        return all.filter(d => {
          const r = d.getBoundingClientRect();
          return r.x > 10 && r.x < 900 && r.y > 100 && r.y < 800 && r.width > 80 && r.height > 80;
        }).slice(0, 5).map(d => {
          const r = d.getBoundingClientRect();
          return { text: d.textContent?.trim().substring(0, 30), x: r.x + r.width*0.5, y: r.y + r.height*0.25 };
        });
      });
      console.log('  Product cards:', cards.length);
      cards.forEach((c, i) => console.log(`    ${i+1}. "${c.text}" click at (${Math.round(c.x)},${Math.round(c.y)})`));

      // Add 2 products
      for (const c of cards.slice(0, 2)) {
        await page.mouse.click(c.x, c.y);
        await sleep(350);
      }
      await ss(page, 'products-in-cart');

      const cart = await page.evaluate(() => {
        const all = [...document.querySelectorAll('*')];
        const el = all.find(e => e.textContent?.includes('Current Order') && e.getBoundingClientRect().x > 900);
        return el?.innerText?.substring(0, 300) ?? '(not found)';
      });
      console.log('  Cart:', cart.replace(/\n/g, ' | ').substring(0, 200));

      // ── STEP 4: Category filter ─────────────────────────────────────────
      console.log('\n━━ Step 4: Category filter ━━');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('drinks'));
        b?.click();
      });
      await sleep(500);
      await ss(page, 'filter-drinks');

      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('All'));
        b?.click();
      });
      await sleep(400);

      // ── STEP 5: Search ──────────────────────────────────────────────────
      console.log('\n━━ Step 5: Search ━━');
      await evalClick(page, 'input[placeholder*="Search"]', 'search input');
      await sleep(300);
      await page.keyboard.type('Pepsi', { delay: 60 });
      await sleep(700);
      await ss(page, 'search-pepsi');

      // Add pepsi
      const pepsiCard = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('div[class*="cursor-pointer"]')].filter(d => {
          const r = d.getBoundingClientRect();
          return r.x > 10 && r.y > 100 && r.width > 80 && r.height > 80 && d.textContent?.includes('Pepsi');
        });
        if (!cards[0]) return null;
        const r = cards[0].getBoundingClientRect();
        return { x: r.x + r.width/2, y: r.y + r.height*0.25 };
      });
      if (pepsiCard) { await page.mouse.click(pepsiCard.x, pepsiCard.y); await sleep(300); }

      // Clear search (use Delete key, not Escape)
      await evalClick(page, 'input[placeholder*="Search"]', 'search input');
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await sleep(400);

      // ── STEP 6: Checkout modal ──────────────────────────────────────────
      console.log('\n━━ Step 6: Checkout ━━');
      const checkout = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Checkout');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { disabled: b.disabled, x: r.x + r.width/2, y: r.y + r.height/2 };
      });
      console.log('  Checkout button:', checkout);

      if (checkout && !checkout.disabled) {
        await page.mouse.click(checkout.x, checkout.y);
        await sleep(1500);
        await ss(page, 'checkout-modal');

        const modalText = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"], [class*="Modal"], [class*="Checkout"]');
          return d?.innerText?.substring(0, 500) ?? '(no modal)';
        });
        console.log('  Checkout modal:', modalText.replace(/\n/g, ' | ').substring(0, 300));

        // Try clicking Cash
        const cashFound = await page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find(b =>
            b.textContent?.trim() === 'Cash' || b.textContent?.trim() === 'نقد'
          );
          if (b) { b.click(); return true; }
          return false;
        });
        console.log('  Cash option clicked:', cashFound);
        if (cashFound) { await sleep(500); await ss(page, 'checkout-cash'); }

        // Close via Cancel (NOT Escape)
        const cancelled = await page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find(b =>
            b.textContent?.trim() === 'Cancel' || b.textContent?.trim() === 'إلغاء'
          );
          if (b) { b.click(); return true; }
          return false;
        });
        if (!cancelled) {
          // Click X button in the top-right of modal
          await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const xBtn = btns.find(b => {
              const r = b.getBoundingClientRect();
              return r.x > 900 && r.y < 300 && (b.textContent?.trim() === '' || b.textContent?.trim() === '✕');
            });
            xBtn?.click();
          });
        }
        await sleep(500);
      }

      // ── STEP 7: Drawer button ────────────────────────────────────────────
      console.log('\n━━ Step 7: Cash Drawer button ━━');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Drawer');
        b?.click();
      });
      await sleep(800);
      await ss(page, 'drawer-action');

      // Close any toast/notification
      await sleep(500);

      // ── STEP 8: Return modal ─────────────────────────────────────────────
      console.log('\n━━ Step 8: Return modal ━━');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Return');
        b?.click();
      });
      await sleep(800);
      await ss(page, 'return-modal');

      // Close return modal via Cancel
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cancel');
        b?.click();
      });
      await sleep(400);

      // ── STEP 9: History panel ────────────────────────────────────────────
      console.log('\n━━ Step 9: Sales History ━━');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'History');
        b?.click();
      });
      await sleep(800);
      await ss(page, 'history-panel');

      const historyText = await page.evaluate(() => {
        const panel = [...document.querySelectorAll('*')].find(e => {
          const r = e.getBoundingClientRect();
          return r.x > 900 && r.width > 200 && r.height > 300 && e.textContent?.includes('Sales');
        });
        return panel?.innerText?.substring(0, 400) ?? '(not found)';
      });
      console.log('  History:', historyText.replace(/\n/g, ' | ').substring(0, 200));

      // Close history
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'History');
        b?.click();
      });
      await sleep(400);

      // ── STEP 10: Navigate to Shift/Z-Report ─────────────────────────────
      await navToPage(page, navBtn, 'Shift / Z-Report');
      await ss(page, 'shift-zreport');
      const shiftText = await bodyText(page, 400);
      console.log('  Shift page:', shiftText.replace(/\n/g, ' | ').substring(0, 200));

      // ── STEP 11: Pay Later ───────────────────────────────────────────────
      await navToPage(page, navBtn, 'Pay Later');
      await ss(page, 'pay-later');
      const payText = await bodyText(page, 400);
      console.log('  Pay Later:', payText.replace(/\n/g, ' | ').substring(0, 200));

      // ── STEP 12: Products page ───────────────────────────────────────────
      await navToPage(page, navBtn, 'Products');
      await ss(page, 'products-page');
      const prodText = await bodyText(page, 400);
      console.log('  Products page:', prodText.replace(/\n/g, ' | ').substring(0, 200));

      // ── STEP 13: Customers page ──────────────────────────────────────────
      await navToPage(page, navBtn, 'Customers');
      await ss(page, 'customers-page');

      // ── STEP 14: Dashboard ───────────────────────────────────────────────
      await navToPage(page, navBtn, 'Dashboard');
      await ss(page, 'dashboard');
      const dashText = await bodyText(page, 500);
      console.log('  Dashboard:', dashText.replace(/\n/g, ' | ').substring(0, 300));

      // ── STEP 15: Back to POS, currency toggle ────────────────────────────
      await navToPage(page, navBtn, 'POS');
      console.log('\n━━ Step 15: Currency toggle ━━');
      for (const currency of ['USD', 'LBP', 'Both']) {
        await page.evaluate(c => {
          const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === c);
          b?.click();
        }, currency);
        await sleep(300);
      }
      await ss(page, 'final-pos');
    }
  }

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n=== Test Complete ===');
  const files = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log(`\n${files.length} screenshots saved to ${SHOT_DIR}:`);
  files.forEach(f => console.log(`  ${f}`));

} catch (e) {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
} finally {
  if (app) await app.close().catch(() => {});
}
