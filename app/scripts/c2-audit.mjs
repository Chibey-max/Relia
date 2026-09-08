import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/assets/new';
const port = 9452;
const profile = await mkdtemp(join(tmpdir(), 'relia-c2-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', [
  '--headless', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function readJson(url, options) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
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
  let commandId = 0;
  const pending = new Map();
  const events = new Map();
  const consoleMessages = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message)); else handler?.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled') consoleMessages.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    const waiters = events.get(message.method); if (waiters?.length) waiters.splice(0).forEach((resolve) => resolve(message.params));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++commandId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const waitFor = (method) => new Promise((resolve) => { const waiters = events.get(method) ?? []; waiters.push(resolve); events.set(method, waiters); });
  const evaluate = async (expression) => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const navigate = async () => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url: targetUrl }); await loaded; await delay(800); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  const viewports = [];
  for (const width of [390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate();
    viewports.push(await evaluate(`({ width: innerWidth, noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, fields: document.querySelectorAll('.listing-form input, .listing-form select').length, deadlines: document.querySelectorAll('.listing-review-windows li').length })`));
  }

  await evaluate(`(() => {
    const values = {
      'input[placeholder="0x…"]:nth-of-type(1)': '',
    };
    const inputs = [...document.querySelectorAll('input[placeholder="0x…"]')];
    const next = ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333'];
    inputs.forEach((node, index) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, next[index]); node.dispatchEvent(new Event('input', { bubbles: true })); });
  })()`);
  await delay(100);
  await evaluate(`[...document.querySelectorAll('button')].find((node) => node.textContent.includes('Review immutable terms')).click()`);
  await delay(150);
  const review = await evaluate(`({ ready: Boolean([...document.querySelectorAll('button')].find((node) => node.textContent.includes('Create title on Creditcoin') && !node.disabled)), errorCount: document.querySelectorAll('.field-error').length, walletRequested: Boolean(window.ethereum) })`);

  await evaluate(`localStorage.setItem('relia:pending-shop-registration:v1', JSON.stringify({ assetId: '0x${'1'.repeat(64)}', shopSepolia: '0x3333333333333333333333333333333333333333', creditcoinTx: '0x${'2'.repeat(64)}' }))`);
  await navigate();
  const recovery = await evaluate(`({ finishVisible: document.body.innerText.includes('Finish shop registration.'), checkpointVisible: document.body.innerText.includes('The asset exists on Creditcoin.'), secondChainButton: Boolean([...document.querySelectorAll('button')].find((node) => node.textContent.includes('Register matching shop'))) })`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const result = { viewports, review, recovery, hydrationMessages };
  const passed = viewports.every((item) => item.noOverflow && item.deadlines === 12) && review.ready && review.errorCount === 0 && recovery.finishVisible && recovery.checkpointVisible && recovery.secondChainButton && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, ...result }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
