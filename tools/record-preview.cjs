const puppeteer = require('puppeteer-core');
const fs = require('fs');
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
  const before = await page.evaluate(() => !!window.__soundscape);
  await page.click('[data-region="smokies"]');
  await page.waitForSelector('#sound-toggle', { timeout: 20000 });
  await page.click('#sound-toggle');
  await page.waitForFunction(() => !!window.__soundscape, { timeout: 10000 });
  const b64 = await page.evaluate(async () => {
    const { context, master } = window.__soundscape;
    const dest = context.createMediaStreamDestination();
    master.connect(dest);
    const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
    const chunks = []; rec.ondataavailable = e => chunks.push(e.data);
    const done = new Promise(res => { rec.onstop = res; });
    rec.start();
    await new Promise(r => setTimeout(r, 30000));
    rec.stop(); await done;
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(s);
  });
  fs.writeFileSync('/downloads/appalachian-trail-soundscape-preview.webm', Buffer.from(b64, 'base64'));
  await page.click('#sound-toggle');
  await new Promise(r => setTimeout(r, 800));
  const after = await page.evaluate(() => ({
    pressed: document.querySelector('#sound-toggle').getAttribute('aria-pressed'),
    engine: !!window.__soundscape,
  }));
  console.log(JSON.stringify({ before, after, errors }));
  await browser.close();
})();
