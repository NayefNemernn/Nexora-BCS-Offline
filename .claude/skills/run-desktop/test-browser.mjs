// Verifies the standalone dev:browser workflow (no Electron) in a real Chromium tab.
import { chromium } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const SHOT_DIR = path.join(os.tmpdir(), 'nexora-shots-browser');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded' });
await sleep(1500);
await page.screenshot({ path: path.join(SHOT_DIR, '01-loaded.png') });

const isLoginScreen = await page.evaluate(() => !!document.querySelector('input[placeholder*="username" i]'));
console.log('login screen?', isLoginScreen);
if (isLoginScreen) {
  await page.evaluate(() => document.querySelector('input[placeholder*="username" i]')?.focus());
  await page.keyboard.type('admin', { delay: 40 });
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'))?.click());
  await sleep(500);
  await page.keyboard.type('886659', { delay: 60 });
  await sleep(1500);
}
await page.screenshot({ path: path.join(SHOT_DIR, '02-after-login.png') });
console.log('body text:', (await page.evaluate(() => document.body.innerText.substring(0, 200))).replace(/\n/g, ' | '));

await browser.close();
console.log('screenshots in', SHOT_DIR);
