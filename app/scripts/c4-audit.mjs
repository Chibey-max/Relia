import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const assetId = process.argv[3];
if (!assetId) throw new Error('Pass the configured asset ID as the second argument.');
const port = 9454;
const profile = await mkdtemp(join(tmpdir(), 'relia-c4-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', ['--headless', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
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
  let id = 0;
  const pending = new Map();
  const waiters = new Map();
  const consoleMessages = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) { const handler = pending.get(message.id); pending.delete(message.id); if (message.error) handler?.reject(new Error(message.error.message)); else handler?.resolve(message.result); return; }
    if (message.method === 'Runtime.consoleAPICalled') consoleMessages.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    const handlers = waiters.get(message.method); if (handlers?.length) handlers.splice(0).forEach((resolve) => resolve(message.params));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
  const waitFor = (method) => new Promise((resolve) => { const handlers = waiters.get(method) ?? []; handlers.push(resolve); waiters.set(method, handlers); });
  const evaluate = async (expression) => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const navigate = async (url) => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await delay(10000); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      const originalFetch = window.fetch.bind(window);
      const word = (value) => BigInt(value).toString(16).padStart(64, '0');
      window.__c4StatusOverride = null;
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (/creditcoin/i.test(url) && init?.body) {
          try {
            const payload = JSON.parse(init.body);
            const data = payload?.params?.[0]?.data ?? '';
            if (payload.method === 'eth_call' && data.startsWith('0x7d4dd25e')) {
              const n = Number(BigInt('0x' + data.slice(-64)));
              const states = { 1: 3, 2: 2, 3: 4, 4: 5, 5: 1 };
              const status = window.__c4StatusOverride ?? states[n] ?? 1;
              const payTx = status === 4 ? '${'a'.repeat(64)}' : '${'0'.repeat(64)}';
              const result = '0x' + word(status) + word(1788134400) + word(1788134500) + payTx + '${'0'.repeat(64)}' + '${'0'.repeat(64)}' + word(status === 4 ? 1 : 0);
              return Promise.resolve(new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }), { status: 200, headers: { 'content-type': 'application/json' } }));
            }
          } catch {}
        }
        return originalFetch(input, init);
      };
    })();
  ` });

  await sendcodes();
  async function sendcodes() {
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    await navigate(`${origin}/tape`);
    const eligibility = await evaluate(`({ reclaimActions: [...document.querySelectorAll('button')].filter((node) => node.textContent.includes('Review reclaim')).length, states: [...document.querySelectorAll('.record-state-badge')].map((node) => node.textContent.trim()) })`);
    if (eligibility.reclaimActions !== 1) throw new Error(`Expected one reclaim action: ${JSON.stringify(eligibility)}`);
    await evaluate(`[...document.querySelectorAll('button')].find((node) => node.textContent.includes('Review reclaim')).click()`);
    await delay(150);
    const review = await evaluate(`({ dialog: Boolean(document.querySelector('.reclaim-dialog')), permissionless: document.body.innerText.includes('allows any caller'), asset: document.querySelector('.reclaim-dialog')?.innerText.includes('${assetId}'), slice: document.querySelector('.reclaim-dialog')?.innerText.includes('01 of 12'), evidence: document.querySelector('.reclaim-dialog')?.innerText.includes('No proven payment is recorded') })`);
    const refusalTitles = [];
    for (const [status, title] of [[2, 'Live slice protected'], [4, 'Disputed payment protected'], [1, 'Slice is not reclaimable']]) {
      await evaluate(`window.__c4StatusOverride = ${status}; [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Confirm reclaim')).click()`);
      await delay(350);
      refusalTitles.push(await evaluate(`document.querySelector('.reclaim-dialog')?.innerText.includes('${title}')`));
    }

    await navigate(`${origin}/assets/${assetId}`);
    const assetAction = await evaluate(`[...document.querySelectorAll('button')].filter((node) => node.textContent.includes('Review reclaim')).length`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await navigate(`${origin}/tape`);
    await evaluate(`[...document.querySelectorAll('button')].find((node) => node.textContent.includes('Review reclaim')).click()`);
    await delay(150);
    const mobile = await evaluate(`({ noPageOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, dialogFits: document.querySelector('.reclaim-dialog').getBoundingClientRect().right <= innerWidth + 1 })`);
    const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
    const passed = eligibility.reclaimActions === 1 && Object.values(review).every(Boolean) && refusalTitles.every(Boolean) && assetAction === 1 && Object.values(mobile).every(Boolean) && hydrationMessages.length === 0;
    console.log(JSON.stringify({ passed, eligibility, review, refusalTitles, assetAction, mobile, hydrationMessages }, null, 2));
    if (!passed) process.exitCode = 1;
  }
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
