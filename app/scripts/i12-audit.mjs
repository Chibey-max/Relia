import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const measureOnly = process.argv.includes('--measure-only');
const port = 9472;
const profile = await mkdtemp(join(tmpdir(), 'relia-i12-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', [
  '--headless', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function readJson(url, options) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(url, options); if (response.ok) return response.json(); } catch {}
    await delay(100);
  }
  throw new Error(`Unable to reach ${url}`);
}

let socket;
try {
  await readJson(`http://127.0.0.1:${port}/json/version`);
  const target = await readJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const waiters = new Map();
  const consoleMessages = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message)); else handler?.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled') consoleMessages.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    const handlers = waiters.get(message.method);
    if (handlers?.length) handlers.splice(0).forEach((resolve) => resolve(message.params));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
  const waitFor = (method) => new Promise((resolve) => { const handlers = waiters.get(method) ?? []; handlers.push(resolve); waiters.set(method, handlers); });
  const evaluate = async (expression) => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);

  async function inspect(width, height) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 560 });
    const loaded = waitFor('Page.loadEventFired');
    await send('Page.navigate', { url: origin });
    await loaded;
    await delay(1500);
    return evaluate(`(() => {
      const main = document.querySelector('.landing-main');
      const text = main?.innerText.trim() ?? '';
      const directSections = main ? [...main.children].filter((node) => node.tagName === 'SECTION') : [];
      const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
      return {
        width: innerWidth,
        words: text ? text.split(/\\s+/).length : 0,
        pageHeight: document.documentElement.scrollHeight,
        directSections: directSections.length,
        h2Count: main?.querySelectorAll('h2:not(.sr-only):not(.brand-motion-sr-only)').length ?? 0,
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        heroActions: main?.querySelectorAll('.hero-actions a').length ?? 0,
        hasSixBeats: Boolean(document.querySelector('.problem-story .record-comparison') && document.querySelector('.process-section .process-disclosure') && document.querySelector('.landing-evidence-status') && document.querySelector('.landing-final-actions')),
        obsoleteSectionsGone: !document.querySelector('.trust-section, .architecture-section, .status-section, .final-cta'),
        evidenceAccurate: text.includes('56') && !text.includes('46 automated'),
        disclosureCount: main?.querySelectorAll('details').length ?? 0,
        heroVisible: Boolean(rect('.editorial-hero h1')?.height),
        sendVisible: Boolean(document.querySelector('.hero-actions a[href="/send"]')),
        verifyVisible: Boolean(document.querySelector('.hero-actions a[href="/verify"]')),
      };
    })()`);
  }

  const mobile = await inspect(390, 844);
  const desktop = await inspect(1440, 1000);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const checks = {
    noOverflow: mobile.noOverflow && desktop.noOverflow,
    densityReduced: mobile.words <= 735 && desktop.words <= 735 && mobile.pageHeight <= 9500,
    i13MobileDensity: mobile.words >= 525 && mobile.words <= 575 && mobile.pageHeight <= 7000,
    focusedHierarchy: mobile.h2Count <= 6 && mobile.directSections <= 7,
    sixBeats: mobile.hasSixBeats && desktop.hasSixBeats,
    obsoleteSectionsGone: mobile.obsoleteSectionsGone && desktop.obsoleteSectionsGone,
    evidenceAccurate: mobile.evidenceAccurate && desktop.evidenceAccurate,
    primaryPaths: mobile.heroVisible && mobile.sendVisible && mobile.verifyVisible,
    hydrationStable: hydrationMessages.length === 0,
  };
  const passed = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ passed: measureOnly ? null : passed, measureOnly, mobile, desktop, checks, hydrationMessages }, null, 2));
  if (!measureOnly && !passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
