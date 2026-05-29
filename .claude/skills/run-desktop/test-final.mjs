/**
 * Nexora POS — Final step-by-step test
 *
 * Key discoveries:
 * - Navigation: floating button at bottom-left (` or F1) opens nav panel
 * - Add to cart: click the PRODUCT CARD body (not the ± quantity controls)
 * - Escape clears the cart — DO NOT use Escape
 * - The ± buttons inside the card adjust qty for already-added items
 * - Checkout button is disabled when cart is empty
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

const ss    = async (page, label) => { step++; const f = path.join(SHOT_DIR, `${String(step).padStart(2,'0')}-${label}.png`); await page.screenshot({ path: f }); console.log(`  [📸 ${step}] ${label}`); return f; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Click element via DOM — avoids coordinate-layer issues with overlays
const domClick = async (page, sel, desc) => {
  const r = await page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return 'NOT_FOUND';
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return 'OK';
  }, sel);
  console.log(`  domClick [${desc||sel}] → ${r}`); return r === 'OK';
};

// Click the floating nav button
const openNav = async (page) => {
  await page.mouse.click(44, 827);  // fixed bottom-left button center
  await sleep(600);
};
const closeNav = async (page) => {
  // Click outside the nav panel (right side of screen)
  await page.mouse.click(900, 400);
  await sleep(400);
};

// Navigate to a page by pressing the number key when nav is open
const navTo = async (page, label, keyNum) => {
  console.log(`\n━━ Navigate → ${label} ━━`);
  await openNav(page);
  await ss(page, `nav-open-for-${label.toLowerCase().replace(/\s/g,'-')}`);
  await page.keyboard.press(String(keyNum));
  await sleep(1500);
  await ss(page, label.toLowerCase().replace(/\s/g,'-'));
};

let app;
try {
  console.log('=== Nexora POS — Final Step-by-Step Test ===\n');
  app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    env: { ...process.env, DISPLAY: ':0' },
    timeout: 60_000,
  });
  console.log('Waiting 15s for startup...');
  await sleep(15_000);

  const page = app.windows().find(w => !w.url().startsWith('devtools://'))
             ?? await app.firstWindow();

  // Get actual button position (it's fixed at bottom-left)
  const navBtnPos = await page.evaluate(() => {
    const btn = document.querySelector('[title="Navigation (` or F1)"]');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height };
  });
  console.log('Nav button position:', navBtnPos);
  const NAV_X = navBtnPos?.x ?? 44;
  const NAV_Y = navBtnPos?.y ?? 827;

  // ── 1. POS Home ───────────────────────────────────────────────────────────
  console.log('\n━━ 1. POS Home ━━');
  await ss(page, 'pos-home');

  // ── 2. Open navigation panel ──────────────────────────────────────────────
  console.log('\n━━ 2. Open navigation panel ━━');
  await page.mouse.click(NAV_X, NAV_Y);
  await sleep(700);
  await ss(page, 'nav-panel-open');

  // Read nav items
  const navItems = await page.evaluate(() => {
    const panel = document.querySelector('[class*="absolute bottom-16"]');
    if (!panel) return '(panel not found)';
    return panel.innerText?.substring(0, 500);
  });
  console.log('  Nav panel content:', navItems?.replace(/\n/g, ' | '));

  // Also capture the nav buttons with labels and shortcut numbers
  const navButtons = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect();
      return r.x < 450 && r.y > 400 && r.width > 100 && b.textContent?.trim().length > 1;
    });
    return btns.map(b => ({
      text: b.textContent?.trim().substring(0, 50),
      x: Math.round(b.getBoundingClientRect().x),
      y: Math.round(b.getBoundingClientRect().y),
    }));
  });
  console.log('  Nav buttons:', JSON.stringify(navButtons, null, 2));

  // Close nav
  await page.keyboard.press('F1');
  await sleep(400);

  // ── 3. Add products to cart ───────────────────────────────────────────────
  console.log('\n━━ 3. Add products to cart ━━');

  // Find product cards: they're divs with cursor-pointer in the grid area
  const productCards = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="cursor-pointer"][class*="rounded-2xl"]')];
    return cards.filter(c => {
      const r = c.getBoundingClientRect();
      return r.x > 5 && r.x < 1000 && r.y > 100 && r.y < 800 && r.width > 80 && r.height > 80;
    }).slice(0, 6).map(c => ({
      text: c.textContent?.trim().substring(0, 40),
      x: Math.round(c.getBoundingClientRect().x),
      y: Math.round(c.getBoundingClientRect().y),
      w: Math.round(c.getBoundingClientRect().width),
      h: Math.round(c.getBoundingClientRect().height),
    }));
  });
  console.log('  Product cards found:', productCards.length);
  productCards.forEach(c => console.log(`    "${c.text}" at (${c.x},${c.y}) ${c.w}x${c.h}`));

  // Click first 3 product cards in their IMAGE area (top 40% of card)
  for (let i = 0; i < Math.min(3, productCards.length); i++) {
    const c = productCards[i];
    const clickX = c.x + c.w * 0.5;
    const clickY = c.y + c.h * 0.25;  // click top portion = image area, not qty controls
    console.log(`  Clicking product ${i+1} "${c.text}" at (${Math.round(clickX)}, ${Math.round(clickY)})`);
    await page.mouse.click(clickX, clickY);
    await sleep(400);
  }

  await ss(page, 'products-added-to-cart');

  // Read cart
  const cartState = await page.evaluate(() => {
    // Find right panel
    const allEls = [...document.querySelectorAll('*')];
    const cartEl = allEls.find(e => {
      const t = e.textContent?.trim() || '';
      return t.includes('Current Order') && e.getBoundingClientRect().x > 900;
    });
    return cartEl?.innerText?.substring(0, 400) ?? '(cart not found)';
  });
  console.log('  Cart state:', cartState.replace(/\n/g, ' | '));

  // ── 4. Category filter test ───────────────────────────────────────────────
  console.log('\n━━ 4. Category filters ━━');
  // Click "drinks" category
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.includes('drinks'));
    b?.click();
  });
  await sleep(500);
  await ss(page, 'category-drinks-filter');

  // Click All
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.includes('All'));
    b?.click();
  });
  await sleep(400);

  // ── 5. Search ─────────────────────────────────────────────────────────────
  console.log('\n━━ 5. Product search ━━');
  const searchSel = 'input[placeholder*="Search"]';
  await page.click(searchSel);
  await page.keyboard.type('Pepsi', { delay: 60 });
  await sleep(700);
  await ss(page, 'search-pepsi');

  // Add a Pepsi to cart
  const pepsiCard = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="cursor-pointer"][class*="rounded-2xl"]')].filter(c => {
      const r = c.getBoundingClientRect();
      return r.x > 5 && r.y > 100 && r.width > 80 && r.height > 80;
    });
    const card = cards.find(c => c.textContent?.includes('Pepsi'));
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return { x: r.x + r.width*0.5, y: r.y + r.height*0.25 };
  });
  if (pepsiCard) {
    await page.mouse.click(pepsiCard.x, pepsiCard.y);
    console.log('  Added Pepsi to cart');
    await sleep(400);
  }

  // Clear search
  await page.click(searchSel);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await sleep(400);

  await ss(page, 'after-search-clear');

  // ── 6. Checkout flow ──────────────────────────────────────────────────────
  console.log('\n━━ 6. Checkout flow ━━');
  const checkoutBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => b.textContent?.trim().includes('Checkout'));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { disabled: btn.disabled, x: r.x + r.width/2, y: r.y + r.height/2, text: btn.textContent?.trim() };
  });
  console.log('  Checkout button:', checkoutBtn);

  if (checkoutBtn && !checkoutBtn.disabled) {
    await page.mouse.click(checkoutBtn.x, checkoutBtn.y);
    await sleep(1500);
    await ss(page, 'checkout-modal-open');

    const checkoutContent = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [class*="Modal"], [class*="modal"]');
      return modal?.innerText?.substring(0, 600) ?? '(no modal found)';
    });
    console.log('  Checkout modal:', checkoutContent.replace(/\n/g, ' | '));

    // Click "Cash" payment option if available
    const cashBtn = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(b => b.textContent?.trim() === 'Cash' || b.textContent?.includes('Cash'));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { text: b.textContent?.trim(), x: r.x + r.width/2, y: r.y + r.height/2, visible: r.width > 0 };
    });
    console.log('  Cash button:', cashBtn);

    if (cashBtn?.visible) {
      await page.mouse.click(cashBtn.x, cashBtn.y);
      await sleep(500);
      await ss(page, 'checkout-cash-selected');
    }

    // Close checkout by clicking X button or backdrop
    const closeBtn = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(b => b.textContent?.trim() === 'Cancel' || b.getAttribute('aria-label') === 'Close');
      if (b) { const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }
      return null;
    });
    if (closeBtn) {
      await page.mouse.click(closeBtn.x, closeBtn.y);
      await sleep(500);
    }
  } else if (checkoutBtn?.disabled) {
    // Add items first, then try again
    console.log('  Checkout disabled — re-adding products...');
    const cards2 = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[class*="cursor-pointer"][class*="rounded-2xl"]')].filter(c => {
        const r = c.getBoundingClientRect();
        return r.x > 5 && r.y > 100 && r.width > 80 && r.height > 80;
      });
      if (!cards[0]) return null;
      const r = cards[0].getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height*0.25 };
    });
    if (cards2) {
      await page.mouse.click(cards2.x, cards2.y);
      await sleep(500);
      const btn2 = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Checkout'));
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { disabled: b.disabled, x: r.x + r.width/2, y: r.y + r.height/2 };
      });
      if (btn2 && !btn2.disabled) {
        await page.mouse.click(btn2.x, btn2.y);
        await sleep(1500);
        await ss(page, 'checkout-modal-open');
      }
    }
  }

  // ── 7. Drawer button ──────────────────────────────────────────────────────
  console.log('\n━━ 7. Drawer button ━━');
  // Navigate back to POS first
  await page.mouse.click(NAV_X, NAV_Y);
  await sleep(600);
  await page.keyboard.press('2');  // POS = item 2 (after Dashboard)
  await sleep(1000);

  const drawerBtn = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Drawer');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (drawerBtn) {
    await page.mouse.click(drawerBtn.x, drawerBtn.y);
    await sleep(800);
    await ss(page, 'drawer-open');
    // Close via X button (not Escape!)
    const xBtn = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(b => b.textContent?.trim() === '' && b.getBoundingClientRect().x > 800 && b.getBoundingClientRect().y < 200);
      return b ? { x: b.getBoundingClientRect().x + b.getBoundingClientRect().width/2, y: b.getBoundingClientRect().y + b.getBoundingClientRect().height/2 } : null;
    });
    if (xBtn) { await page.mouse.click(xBtn.x, xBtn.y); await sleep(300); }
    else {
      // Click outside
      await page.mouse.click(600, 600);
      await sleep(300);
    }
  }

  // ── 8. Return panel ───────────────────────────────────────────────────────
  console.log('\n━━ 8. Return panel ━━');
  const returnBtn = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Return');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (returnBtn) {
    await page.mouse.click(returnBtn.x, returnBtn.y);
    await sleep(800);
    await ss(page, 'return-modal');
    // Close by clicking Cancel button
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cancel');
      b?.click();
    });
    await sleep(400);
  }

  // ── 9. History panel ──────────────────────────────────────────────────────
  console.log('\n━━ 9. History panel ━━');
  const historyBtn = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'History');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (historyBtn) {
    await page.mouse.click(historyBtn.x, historyBtn.y);
    await sleep(800);
    await ss(page, 'history-panel');
    // Close by clicking the button again (toggle)
    await page.mouse.click(historyBtn.x, historyBtn.y);
    await sleep(400);
  }

  // ── 10. Navigate to Shift / Z-Report ──────────────────────────────────────
  console.log('\n━━ 10. Shift / Z-Report page ━━');
  await page.mouse.click(NAV_X, NAV_Y);
  await sleep(600);
  await ss(page, 'nav-open-for-shift');

  // Find "Shift / Z-Report" button in the nav panel and click it
  const shiftNavBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.includes('Shift') || b.textContent?.includes('Z-Report'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, text: b.textContent?.trim() };
  });
  console.log('  Shift nav button:', shiftNavBtn);
  if (shiftNavBtn) {
    await page.mouse.click(shiftNavBtn.x, shiftNavBtn.y);
    await sleep(1500);
    await ss(page, 'shift-zreport-page');

    const shiftText = await page.evaluate(() => document.body.innerText?.substring(0, 500));
    console.log('  Shift page:', shiftText?.replace(/\n/g,' | ').substring(0, 300));
  }

  // ── 11. Navigate to Pay Later ─────────────────────────────────────────────
  console.log('\n━━ 11. Pay Later page ━━');
  await page.mouse.click(NAV_X, NAV_Y);
  await sleep(600);
  const payLaterNavBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.includes('Pay Later'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, text: b.textContent?.trim() };
  });
  console.log('  Pay Later nav button:', payLaterNavBtn);
  if (payLaterNavBtn) {
    await page.mouse.click(payLaterNavBtn.x, payLaterNavBtn.y);
    await sleep(1500);
    await ss(page, 'pay-later-page');
    const text = await page.evaluate(() => document.body.innerText?.substring(0, 400));
    console.log('  Pay Later:', text?.replace(/\n/g,' | ').substring(0, 300));
  }

  // ── 12. Navigate to Products ───────────────────────────────────────────────
  console.log('\n━━ 12. Products page ━━');
  await page.mouse.click(NAV_X, NAV_Y);
  await sleep(600);
  const productsNavBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.trim() === 'Products');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (productsNavBtn) {
    await page.mouse.click(productsNavBtn.x, productsNavBtn.y);
    await sleep(1500);
    await ss(page, 'products-page');
  }

  // ── 13. Navigate back to POS ───────────────────────────────────────────────
  console.log('\n━━ 13. Back to POS ━━');
  await page.mouse.click(NAV_X, NAV_Y);
  await sleep(600);
  const posNavBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent?.trim() === 'POS');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (posNavBtn) {
    await page.mouse.click(posNavBtn.x, posNavBtn.y);
    await sleep(1200);
  }

  // ── 14. Currency toggle ────────────────────────────────────────────────────
  console.log('\n━━ 14. Currency toggle ━━');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const usd = btns.find(b => b.textContent?.trim() === 'USD');
    usd?.click();
  });
  await sleep(400);
  await ss(page, 'currency-usd');

  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const lbp = btns.find(b => b.textContent?.trim() === 'LBP');
    lbp?.click();
  });
  await sleep(400);
  await ss(page, 'currency-lbp');

  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const both = btns.find(b => b.textContent?.trim() === 'Both');
    both?.click();
  });
  await sleep(300);

  // ── 15. Final POS state ────────────────────────────────────────────────────
  console.log('\n━━ 15. Final POS state ━━');
  await ss(page, 'final-pos');

  console.log('\n=== Test Complete ===');
  const files = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log(`\n${files.length} screenshots:\n  ` + files.join('\n  '));

} catch(e) {
  console.error('FATAL:', e.message, '\n', e.stack);
} finally {
  if (app) await app.close().catch(()=>{});
}
