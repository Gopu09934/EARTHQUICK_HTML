// Opens the earthquake dashboard in a real (non-headless) Chromium window
// positioned inside the Xvfb virtual display that the CI workflow starts.
// ffmpeg's `x11grab` then captures that display and streams it to YouTube.
//
// Chromium is run *headed* (headless: false) on purpose — headless Chromium's
// software WebGL path is inconsistent across versions, while a real window
// rendered onto a virtual X display works reliably and is what x11grab expects.

const { chromium } = require('playwright');

const URL = process.env.PAGE_URL || 'http://localhost:8080/earthquake-dashboard.html';
const WIDTH = parseInt(process.env.STREAM_WIDTH || '1280', 10);
const HEIGHT = parseInt(process.env.STREAM_HEIGHT || '720', 10);
const RELOAD_MS = 6 * 60 * 60 * 1000; // safety reload every 6h in case a fetch/socket wedges

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-position=0,0`,
      `--window-size=${WIDTH},${HEIGHT}`,
      '--kiosk',
      '--noerrdialogs',
      '--disable-infobars',
      '--disable-session-crashed-bubble',
      '--autoplay-policy=no-user-gesture-required',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  page.on('console', (msg) => console.log('[page]', msg.text()));
  page.on('pageerror', (err) => console.error('[page error]', err.message));

  async function open() {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log(`Loaded ${URL} at ${WIDTH}x${HEIGHT}`);
  }

  await open();
  setInterval(() => open().catch((e) => console.error('reload failed', e.message)), RELOAD_MS);

  // Keep the node process (and therefore the browser) alive indefinitely.
  await new Promise(() => {});
})();
