const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:8802/', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#begin', { timeout: 20000 });
  await page.click('#begin');
  await page.waitForSelector('[data-region="smokies"]', { timeout: 20000 });
  await page.click('[data-region="smokies"]');
  await page.waitForSelector('#sound-toggle', { timeout: 20000, visible: true });
  const before = await page.evaluate(() => document.querySelector('#sound-toggle').getAttribute('aria-pressed'));
  await page.click('#sound-toggle');
  await new Promise(r => setTimeout(r, 2500));
  const on = await page.evaluate(() => ({
    pressed: document.querySelector('#sound-toggle').getAttribute('aria-pressed'),
  }));
  // switch region via any region control? just wait; then mute
  await page.click('#sound-toggle');
  await new Promise(r => setTimeout(r, 800));
  const off = await page.evaluate(() => document.querySelector('#sound-toggle').getAttribute('aria-pressed'));
  console.log(JSON.stringify({ before, on, off, errors }, null, 1));
  await browser.close();
})();
