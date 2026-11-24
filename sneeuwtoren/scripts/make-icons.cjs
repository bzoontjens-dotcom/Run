// Maakt de PNG-iconen voor het beginscherm uit public/icon.svg.
// Gebruik: npm run icons (vereist Playwright met Chromium).
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const publicDir = path.join(__dirname, '..', 'public');
const svg = readFileSync(path.join(publicDir, 'icon.svg'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  for (const [name, size] of [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: path.join(publicDir, name) });
    await page.close();
  }
  await browser.close();
})();
