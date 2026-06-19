import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR   = path.resolve(__dirname, '../../..');
const SHOT_DIR  = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'nexora-shots-zoom');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let app;
try {
  app = await electron.launch({ executablePath: electronBin, args: [APP_DIR], timeout: 60_000 });
  await sleep(16_000);
  const page = app.windows().find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow();

  // Make sure we're on POS
  const navBtn = await page.evaluate(() => {
    const btn = document.querySelector('[title*="Navigation"]');
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(navBtn.x, navBtn.y);
  await sleep(600);
  const navClicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim().startsWith('POS'));
    if (!b) return false;
    b.click(); return true;
  });
  console.log('nav to POS clicked:', navClicked);
  await sleep(1500);
  console.log('body text:', (await page.evaluate(() => document.body.innerText.substring(0, 150))).replace(/\n/g, ' | '));

  // Click the "3 sizes" cup to expand it
  const box = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes("Today's Menu"));
    if (!h2) return null;
    let wrap = h2; for (let i = 0; i < 3 && wrap.parentElement; i++) wrap = wrap.parentElement;
    const r = wrap.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('menu box', box);
  if (!box) throw new Error('Today\'s Menu section not found on POS page');

  const card = await page.evaluate(() => {
    const badge = [...document.querySelectorAll('span')].find(s => /\d+ sizes/.test(s.textContent || ''));
    let c = badge; for (let i = 0; i < 4 && c.parentElement; i++) { c = c.parentElement; if (c.className?.toString().includes('cursor-pointer')) break; }
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(card.x, card.y);
  await sleep(600);

  const clipBox = { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: Math.min(box.width + 20, 1380), height: Math.min(box.height + 220, 700) };
  const f = path.join(SHOT_DIR, 'menu-zoom-expanded.png');
  await page.screenshot({ path: f, clip: clipBox });
  console.log('saved', f);

} catch (e) {
  console.error('FATAL', e.message, e.stack);
} finally {
  if (app) await app.close().catch(() => {});
}
