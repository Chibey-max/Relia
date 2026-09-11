import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/';
const outputDir = resolve(process.cwd(), 'artifacts/i13-mobile');
const port = 9483;
const profile = await mkdtemp(join(tmpdir(), 'relia-i13-visual-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
const delay = (duration) => new Promise((resolveDelay) => setTimeout(resolveDelay, duration));

async function readJson(url, options) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(url, options); if (response.ok) return response.json(); } catch {}
    await delay(100);
  }
  throw new Error(`Unable to reach ${url}`);
}

let socket;
try {
  await mkdir(outputDir, { recursive: true });
  await readJson(`http://127.0.0.1:${port}/json/version`);
  const target = await readJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  const waiters = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message)); else handler?.resolve(message.result);
      return;
    }
    const handlers = waiters.get(message.method);
    if (handlers?.length) handlers.splice(0).forEach((resolveEvent) => resolveEvent(message.params));
  });
  const send = (method, params = {}) => new Promise((resolveCommand, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve: resolveCommand, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const waitFor = (method) => new Promise((resolveEvent) => {
    const handlers = waiters.get(method) ?? [];
    handlers.push(resolveEvent);
    waiters.set(method, handlers);
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__visualAudit = { cls: 0 };
    try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) window.__visualAudit.cls += entry.value;
    })).observe({ type: 'layout-shift', buffered: true }); } catch {}
  ` });

  const results = [];
  for (const { width, height } of [
    { width: 320, height: 667 }, { width: 375, height: 667 },
    { width: 390, height: 844 }, { width: 430, height: 844 },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const loaded = waitFor('Page.loadEventFired');
    await send('Page.navigate', { url: targetUrl });
    await Promise.race([loaded, delay(8000)]);
    await evaluate(`document.fonts?.ready`);
    await delay(900);

    const viewportShot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const viewportFile = join(outputDir, `${width}x${height}-first-viewport.png`);
    await writeFile(viewportFile, Buffer.from(viewportShot.data, 'base64'));
    const metrics = await send('Page.getLayoutMetrics');
    const content = metrics.cssContentSize ?? metrics.contentSize;
    const fullShot = await send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: content.width, height: content.height, scale: 1 },
    });
    const fullFile = join(outputDir, `${width}x${height}-full-page.png`);
    await writeFile(fullFile, Buffer.from(fullShot.data, 'base64'));

    results.push(await evaluate(`(() => {
      const visible = (node) => { const style = getComputedStyle(node); const rect = node.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0; };
      const targets = [...document.querySelectorAll('.site-nav-toggle, .wallet-button, .hero-actions a, .hero-proof-mobile-tabs button, .process-disclosure > summary, .landing-receipt-inspector summary, .faq-layout summary, .landing-final-actions a')].filter(visible);
      const clipped = [...document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main summary')].filter(visible).filter((node) => { const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; });
      return {
        width: innerWidth, height: innerHeight,
        fullPageHeight: document.documentElement.scrollHeight,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        noClippedContent: clipped.length === 0,
        importantTargetsAtLeast44: targets.every((node) => { const rect = node.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; }),
        firstViewportHasHeading: document.querySelector('h1').getBoundingClientRect().top < innerHeight,
        firstViewportHasPrimaryAction: document.querySelector('.hero-actions a[href="/send"]').getBoundingClientRect().top < innerHeight,
        cls: Number(window.__visualAudit.cls.toFixed(4)),
      };
    })()`));
    results.at(-1).viewportScreenshot = viewportFile;
    results.at(-1).fullPageScreenshot = fullFile;
  }

  const passed = results.every((result) => result.noHorizontalOverflow && result.noClippedContent
    && result.importantTargetsAtLeast44 && result.firstViewportHasHeading
    && result.firstViewportHasPrimaryAction && result.cls < 0.05);
  process.stdout.write(`${JSON.stringify({ passed, outputDir, results }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await delay(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
