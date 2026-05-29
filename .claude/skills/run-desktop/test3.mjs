import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });
for (const f of fs.readdirSync(SHOT_DIR)) fs.unlinkSync(path.join(SHOT_DIR, f));

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron');
let step = 0;

async function ss(page, label) {
  step++;
  const f = path.join(SHOT_DIR, `${String(step).padStart(2,'0')}-${label}.png`);
  await page.screenshot({ path: f });
  console.log(`[${step}] 📸 ${label}`);
  return f;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Dump all interactive elements for debugging
async function dumpInteractives(page, area) {
  return page.evaluate(sel => {
    const root = sel ? document.querySelector(sel) : document.body;
    if (!root) return [];
    const els = [...root.querySelectorAll('button, a[href], input, [role="button"], [onclick]')];
    return els.map(e => ({
      tag: e.tagName,
      text: e.textContent?.trim()?.substring(0, 40),
      cls: e.className?.toString()?.substring(0, 60),
      title: e.getAttribute('title'),
      disabled: e.disabled,
    })).filter(e => e.text || e.title).slice(0, 40);
  }, area || null);
}

async function clickSel(page, sel, desc) {
  const r = await page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK';
  }, sel);
  console.log(`  click [${desc || sel}] → ${r}`);
  return r === 'OK';
}

async function clickText(page, text) {
  const r = await page.evaluate(t => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.children.length === 0 && node.textContent?.trim() === t) {
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return 'OK:leaf:' + node.tagName + ':' + node.className?.toString()?.substring(0,40);
      }
    }
    // fallback: partial match on button/a
    const btns = [...document.querySelectorAll('button, a')];
    const b = btns.find(e => e.textContent?.trim() === t || e.textContent?.includes(t));
    if (b) { b.click(); return 'OK:btn:' + b.textContent?.trim()?.substring(0,40); }
    return 'NOT_FOUND';
  }, text);
  console.log(`  click-text "${text}" → ${r}`);
  return !r.startsWith('NOT_FOUND');
}

// ─── Main ────────────────────────────────────────────────────────────────────
let app;
try {
  console.log('=== Nexora POS — Targeted Test ===\n');
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
  console.log('URL:', page.url(), '\n');

  // ── 1. POS home ───────────────────────────────────────────────────────────
  console.log('━━ 1. POS Home ━━');
  await ss(page, 'pos-home');

  // Dump all interactives in the page
  const interactives = await dumpInteractives(page);
  console.log('  All interactive elements:');
  interactives.forEach(e => console.log(`    [${e.tag}] "${e.text}" cls=${e.cls}`));

  // ── 2. Inspect product card structure ─────────────────────────────────────
  console.log('\n━━ 2. Product card structure ━━');
  const cardInfo = await page.evaluate(() => {
    // Find any card/grid item
    const candidates = [
      '[class*="product"]', '[class*="card"]', '[class*="item"]',
      '[class*="grid"] > *', '[class*="Product"]', '[class*="Card"]',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return {
        sel,
        outerHTML: el.outerHTML.substring(0, 400),
        tag: el.tagName,
        cls: el.className?.toString(),
        clickable: typeof el.onclick === 'function' || el.hasAttribute('onclick'),
      };
    }
    return null;
  });
  console.log('  Card info:', JSON.stringify(cardInfo, null, 2));

  // ── 3. Click the product image/name directly ───────────────────────────────
  console.log('\n━━ 3. Click product card (not + button) ━━');
  const addResult = await page.evaluate(() => {
    // Strategy: find product name text elements and click the parent card
    const candidates = [
      '[class*="product"]', '[class*="card"]',
      '[class*="grid"] > div', '[class*="grid"] > button',
      '[class*="grid"] > li', 'ul > li',
    ];
    for (const sel of candidates) {
      const els = [...document.querySelectorAll(sel)];
      if (els.length > 3) {
        // Click the 2nd one (skip possible "All categories" el)
        els[1].click();
        return 'clicked ' + sel + ' #1 cls=' + els[1].className?.toString().substring(0,60);
      }
    }
    return 'not found';
  });
  console.log('  Add result:', addResult);
  await sleep(800);
  await ss(page, 'after-card-click');

  // Check if a dialog opened
  const dialogOpen = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="Dialog"], [class*="dialog"]');
    return d ? { found: true, text: d.innerText?.substring(0, 200) } : { found: false };
  });
  console.log('  Dialog open?', dialogOpen);

  // Close any dialog
  if (dialogOpen.found) {
    await page.keyboard.press('Escape');
    await sleep(400);
  }

  // ── 4. Inspect right panel / cart ─────────────────────────────────────────
  console.log('\n━━ 4. Cart / right panel inspection ━━');
  const rightPanel = await page.evaluate(() => {
    // Cart is usually the right panel
    const all = [...document.querySelectorAll('*')];
    const cartEl = all.find(e =>
      e.className?.toString?.()?.includes('cart') ||
      e.className?.toString?.()?.includes('Cart') ||
      e.className?.toString?.()?.includes('order') ||
      e.className?.toString?.()?.includes('Order') ||
      e.className?.toString?.()?.includes('basket') ||
      e.className?.toString?.()?.includes('Basket')
    );
    if (cartEl) return { found: true, cls: cartEl.className?.toString().substring(0,80), text: cartEl.innerText?.substring(0,300) };

    // Try: find elements on the right side (x > 60% of window width)
    const rightEls = all.filter(e => {
      const r = e.getBoundingClientRect();
      return r.left > window.innerWidth * 0.6 && r.width > 50 && r.height > 50;
    });
    const biggestRight = rightEls.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    })[0];
    if (biggestRight) return { found: true, cls: biggestRight.className?.toString().substring(0,80), text: biggestRight.innerText?.substring(0,300) };

    return { found: false };
  });
  console.log('  Right panel:', rightPanel);

  // ── 5. Find and click product via coordinate/Playwright locator ───────────
  console.log('\n━━ 5. Click product via Playwright locator ━━');
  // Try using Playwright's locator to find a visible clickable product
  try {
    // Get bounding boxes of all buttons in the product grid
    const gridButtons = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.map(b => {
        const r = b.getBoundingClientRect();
        return {
          text: b.textContent?.trim().substring(0,30),
          x: r.x, y: r.y, w: r.width, h: r.height,
          cls: b.className?.toString().substring(0,60),
        };
      }).filter(b => b.w > 10 && b.h > 10);
    });
    console.log('  Grid buttons (first 10):');
    gridButtons.slice(0, 10).forEach(b => console.log(`    "${b.text}" at (${Math.round(b.x)},${Math.round(b.y)}) ${Math.round(b.w)}x${Math.round(b.h)}`));

    // Find + buttons and click them via coordinate
    const plusBtn = gridButtons.find(b => b.text === '+');
    if (plusBtn) {
      const cx = plusBtn.x + plusBtn.w / 2;
      const cy = plusBtn.y + plusBtn.h / 2;
      console.log(`  Clicking + at (${Math.round(cx)}, ${Math.round(cy)})`);
      await page.mouse.click(cx, cy);
      await sleep(600);
      await ss(page, 'after-plus-click');

      // Check what appeared
      const afterDialog = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"]');
        return d ? d.innerText?.substring(0, 200) : '(no dialog)';
      });
      console.log('  After + click:', afterDialog);
      await page.keyboard.press('Escape');
      await sleep(300);
    }

    // Find the actual product cards (larger clickable areas in left ~60% of screen)
    const productCards = gridButtons.filter(b =>
      b.x < 700 && b.w > 60 && b.h > 60 && b.text && !['−', '+', 'All', 'USD', 'LBP', 'Both', 'Drawer', 'Return', 'History'].includes(b.text)
    );
    console.log('  Product card candidates:');
    productCards.slice(0, 6).forEach(b => console.log(`    "${b.text}" at (${Math.round(b.x)},${Math.round(b.y)}) ${Math.round(b.w)}x${Math.round(b.h)}`));

    if (productCards.length > 0) {
      const card = productCards[0];
      console.log(`  Clicking product card "${card.text}"`);
      await page.mouse.click(card.x + card.w / 2, card.y + card.h / 2);
      await sleep(800);
      await ss(page, 'after-product-card-click');

      // Check cart and dialog
      const cartAfter = await page.evaluate(() => {
        const el = document.querySelector('[class*="checkout"], [class*="Checkout"]');
        return el?.innerText?.substring(0, 300) ?? '(not found)';
      });
      console.log('  Cart after:', cartAfter.replace(/\n/g, ' | '));

      // Check dialog
      const d2 = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"]');
        return d ? d.innerText?.substring(0, 300) : null;
      });
      if (d2) {
        console.log('  Dialog:', d2.replace(/\n/g, ' | '));
        // Close dialog
        await page.keyboard.press('Escape');
        await sleep(300);
      }
    }
  } catch (e) {
    console.log('  Locator error:', e.message);
  }

  // ── 6. Inspect left sidebar nav (what Drawer opens) ───────────────────────
  console.log('\n━━ 6. Left sidebar nav inspection ━━');
  const leftArea = await page.evaluate(() => {
    // Find elements in left 15% of screen
    const all = [...document.querySelectorAll('*')];
    const leftEls = all.filter(e => {
      const r = e.getBoundingClientRect();
      return r.left < 80 && r.width > 20 && r.height > 20;
    }).map(e => ({
      tag: e.tagName,
      cls: e.className?.toString().substring(0, 60),
      text: e.textContent?.trim().substring(0, 50),
      x: Math.round(e.getBoundingClientRect().x),
      y: Math.round(e.getBoundingClientRect().y),
      w: Math.round(e.getBoundingClientRect().width),
    }));
    return leftEls.slice(0, 20);
  });
  console.log('  Left area elements:', JSON.stringify(leftArea, null, 2));

  // ── 7. Click Drawer and inspect panel ────────────────────────────────────
  console.log('\n━━ 7. Drawer panel navigation ━━');
  await clickText(page, 'Drawer');
  await sleep(800);
  await ss(page, 'drawer-open');

  const drawerPanel = await page.evaluate(() => {
    // Find a visible panel/dropdown
    const panels = [...document.querySelectorAll('[class*="panel"], [class*="Panel"], [class*="popup"], [class*="Popup"], [class*="dropdown"], [class*="Dropdown"], [class*="Menu"]')];
    for (const p of panels) {
      const r = p.getBoundingClientRect();
      if (r.width > 50 && r.height > 50 && r.x < 200) {
        return { cls: p.className?.toString().substring(0, 80), text: p.innerText?.substring(0, 300) };
      }
    }
    // Fallback: left portion of screen
    const all = [...document.querySelectorAll('*')];
    const leftPanel = all.find(e => {
      const r = e.getBoundingClientRect();
      return r.x < 200 && r.width > 100 && r.height > 150 && e.children.length > 3;
    });
    return leftPanel ? { cls: leftPanel.className?.toString().substring(0,80), text: leftPanel.innerText?.substring(0,300) } : null;
  });
  console.log('  Drawer panel:', JSON.stringify(drawerPanel));

  // Inspect all buttons visible when drawer is open
  const drawerButtons = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a[href], [role="button"]')];
    return btns.map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent?.trim().substring(0,40), x: Math.round(r.x), y: Math.round(r.y), visible: r.width > 0 };
    }).filter(b => b.text && b.visible && b.x < 200);
  });
  console.log('  Buttons in left panel:', drawerButtons);

  // Try clicking "Pay Later" from drawer
  console.log('\n━━ 8. Navigate to Pay Later from sidebar ━━');
  const payLaterNav = await page.evaluate(() => {
    const all = [...document.querySelectorAll('button, a, [role="button"]')];
    const el = all.find(e => e.textContent?.includes('Pay Later') || e.textContent?.includes('PayLater'));
    if (el) {
      const r = el.getBoundingClientRect();
      el.click();
      return { found: true, text: el.textContent?.trim(), x: Math.round(r.x), y: Math.round(r.y) };
    }
    return { found: false };
  });
  console.log('  Pay Later nav:', payLaterNav);
  await sleep(1500);
  await ss(page, 'pay-later-nav');

  // ── 9. Navigate to Shift/Sessions page ────────────────────────────────────
  console.log('\n━━ 9. Navigate to Shift page ━━');
  await page.keyboard.press('Escape');
  await sleep(300);

  // Look for shift-related elements
  const shiftNav = await page.evaluate(() => {
    const all = [...document.querySelectorAll('button, a, [role="button"]')];
    const el = all.find(e =>
      e.textContent?.includes('Shift') ||
      e.textContent?.includes('Session') ||
      e.textContent?.includes('الوردية') ||
      e.getAttribute('href')?.includes('shift')
    );
    if (el) { el.click(); return el.textContent?.trim(); }
    return 'not found';
  });
  console.log('  Shift nav:', shiftNav);
  await sleep(1000);
  await ss(page, 'shift-nav');

  // ── 10. Back to POS, add items, checkout ─────────────────────────────────
  console.log('\n━━ 10. Checkout flow ━━');
  await page.keyboard.press('Escape');
  await sleep(300);
  // Make sure we're at POS root
  await page.evaluate(() => { if (window.location.hash !== '') window.history.back(); });
  await sleep(1000);

  // Look for product grid more carefully
  const productGridInfo = await page.evaluate(() => {
    // Find a grid container
    const grids = [...document.querySelectorAll('[class*="grid"]')];
    const mainGrid = grids.find(g => g.children.length > 5);
    if (!mainGrid) return null;
    const firstChild = mainGrid.children[0];
    return {
      gridCls: mainGrid.className?.toString().substring(0, 80),
      childTag: firstChild?.tagName,
      childCls: firstChild?.className?.toString().substring(0, 80),
      childText: firstChild?.textContent?.trim().substring(0, 100),
      childHTML: firstChild?.outerHTML.substring(0, 300),
      count: mainGrid.children.length,
    };
  });
  console.log('  Product grid:', JSON.stringify(productGridInfo, null, 2));

  // Try clicking using precise coordinates — find product area (middle-left of screen)
  const productArea = await page.evaluate(() => {
    // Find clickable elements in the product grid area (x: 0-700, y: 100-400)
    const all = [...document.querySelectorAll('*')];
    const inArea = all.filter(e => {
      const r = e.getBoundingClientRect();
      return r.x > 5 && r.x < 700 && r.y > 80 && r.y < 420 &&
             r.width > 80 && r.height > 80 &&
             (e.tagName === 'BUTTON' || e.tagName === 'DIV' || e.tagName === 'LI' || e.tagName === 'ARTICLE');
    });
    return inArea.slice(0, 8).map(e => {
      const r = e.getBoundingClientRect();
      return { tag: e.tagName, cls: e.className?.toString().substring(0,60), text: e.textContent?.trim().substring(0,40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
  });
  console.log('  Product area elements:');
  productArea.forEach(e => console.log(`    [${e.tag}] "${e.text}" at (${e.x},${e.y}) ${e.w}x${e.h} cls=${e.cls}`));

  // Click first product card
  if (productArea.length > 0) {
    const p = productArea[0];
    await page.mouse.click(p.x + p.w / 2, p.y + p.h / 2);
    await sleep(600);
    const d = await page.evaluate(() => document.querySelector('[role="dialog"], [class*="modal"]')?.innerText?.substring(0,200));
    if (d) {
      console.log('  Dialog after product click:', d.replace(/\n/g,' | '));
      await page.keyboard.press('Escape');
      await sleep(300);
    }
  }

  // Add a product using the inner + button (avoid barcode dialog)
  // The + button that's NOT inside the numpad should add to cart
  const addedToCart = await page.evaluate(() => {
    // Find all + buttons and pick one in the product grid area
    const btns = [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect();
      return b.textContent?.trim() === '+' && r.x < 700 && r.y > 80;
    });
    if (btns.length === 0) return 'NO_PLUS_BUTTONS';
    btns[0].click();
    return `clicked + at (${Math.round(btns[0].getBoundingClientRect().x)}, ${Math.round(btns[0].getBoundingClientRect().y)})`;
  });
  console.log('  Add to cart:', addedToCart);
  await sleep(500);

  const dialogAfterAdd = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"]');
    return d ? d.innerText?.substring(0,200) : null;
  });
  if (dialogAfterAdd) {
    console.log('  Dialog (closing):', dialogAfterAdd.replace(/\n/g,' | '));
    await page.keyboard.press('Escape');
    await sleep(300);
  }

  // Check cart content via the right side of the screen
  const cartItems = await page.evaluate(() => {
    const rightEl = [...document.querySelectorAll('*')].find(e => {
      const r = e.getBoundingClientRect();
      return r.x > window.innerWidth * 0.65 && r.width > 100 && r.height > 200 && e.children.length > 2;
    });
    return rightEl ? rightEl.innerText?.substring(0, 400) : '(none)';
  });
  console.log('  Cart content:', cartItems?.replace(/\n/g,' | '));

  await ss(page, 'cart-state');

  // Try checkout button
  const checkoutBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => b.textContent?.includes('Checkout') || b.textContent?.includes('دفع') || b.textContent?.includes('checkout'));
    if (btn) {
      const r = btn.getBoundingClientRect();
      return { text: btn.textContent?.trim(), disabled: btn.disabled, x: Math.round(r.x), y: Math.round(r.y) };
    }
    return null;
  });
  console.log('  Checkout button:', checkoutBtn);

  if (checkoutBtn && !checkoutBtn.disabled) {
    await page.mouse.click(checkoutBtn.x + 50, checkoutBtn.y + 15);
    await sleep(1500);
    await ss(page, 'checkout-modal');

    const checkoutModal = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="Checkout"]');
      return d ? d.innerText?.substring(0, 500) : document.body.innerText?.substring(0, 500);
    });
    console.log('  Checkout modal:', checkoutModal?.replace(/\n/g,' | ').substring(0,300));
    await page.keyboard.press('Escape');
    await sleep(500);
  }

  // ── 11. Final ─────────────────────────────────────────────────────────────
  console.log('\n━━ 11. Final state ━━');
  await ss(page, 'final');

  console.log('\n=== Done ===');
  const files = fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log('Screenshots:\n  ' + files.join('\n  '));

} catch (e) {
  console.error('FATAL:', e.message, '\n', e.stack);
} finally {
  if (app) await app.close().catch(() => {});
}
