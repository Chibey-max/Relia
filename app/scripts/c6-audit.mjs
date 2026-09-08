import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const assetId = process.argv[3];
if (!assetId) throw new Error('Pass the configured asset ID as the second argument.');
const port = 9456;
const profile = await mkdtemp(join(tmpdir(), 'relia-c6-'));
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
  const navigate = async (url, wait = 7000) => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await delay(wait); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      const originalFetch = window.fetch.bind(window);
      const word = (value) => BigInt(value).toString(16).padStart(64, '0');
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        const mode = new URLSearchParams(location.search).get('__c6mock');
        if (mode && /creditcoin/i.test(url) && init?.body) {
          try {
            const payload = JSON.parse(init.body);
            const data = payload?.params?.[0]?.data ?? '';
            if (payload.method === 'eth_call' && data.startsWith('0x2ef3360e')) {
              if (mode === 'error') return Promise.resolve(new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, error: { code: -32000, message: 'C6 audit RPC failure' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
              const count = mode === 'empty' ? 0 : 20;
              return Promise.resolve(new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: '0x' + word(count) }), { status: 200, headers: { 'content-type': 'application/json' } }));
            }
            if (payload.method === 'eth_call' && data.startsWith('0x5e0456a6')) {
              const index = Number(BigInt('0x' + data.slice(-64)));
              const status = index % 5 + 1;
              const n = index % 12 + 1;
              const payTx = status === 2 || status === 4 ? '${'a'.repeat(64)}' : '${'0'.repeat(64)}';
              const ackTx = status === 2 ? '${'b'.repeat(64)}' : '${'0'.repeat(64)}';
              const result = '0x' + '${assetId.slice(2)}' + word(n) + word(status) + word(1788134400 + index * 60) + payTx + ackTx;
              return Promise.resolve(new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }), { status: 200, headers: { 'content-type': 'application/json' } }));
            }
          } catch {}
        }
        return originalFetch(input, init);
      };
    })();
  ` });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
  await navigate(`${origin}/assets/${assetId}?__c6mock=full`, 10000);
  const bounded = await evaluate(`(() => { const cards = [...document.querySelectorAll('.tape-history-card')]; const dates = [...document.querySelectorAll('.tape-history-rail time')].map((node) => Date.parse(node.dateTime)); return { count: cards.length, ordered: dates.every((value, index) => index === 0 || value >= dates[index - 1]), older: [...document.querySelectorAll('button')].some((node) => node.textContent.includes('Load 4 older')), disputed: document.body.innerText.includes('Why reclaim is blocked'), payment: Boolean(document.querySelector('.tape-history-evidence a[href^="/verify/"]')), acknowledgement: Boolean(document.querySelector('.tape-history-evidence a[href*="sepolia.etherscan.io"]')) }; })()`);
  await evaluate(`[...document.querySelectorAll('button')].find((node) => node.textContent.includes('Load 4 older')).click()`);
  await delay(1500);
  const pagination = await evaluate(`({ count: document.querySelectorAll('.tape-history-card').length, summaryText: document.querySelector('.tape-history-footer')?.innerText ?? '' })`);
  await evaluate(`window.__c6RealNow = Date.now; Date.now = () => window.__c6RealNow() + 31000`);
  await delay(10500);
  const stale = await evaluate(`document.body.innerText.includes('Stale snapshot')`);

  await navigate(`${origin}/assets/${assetId}?__c6mock=empty`);
  const empty = await evaluate(`document.body.innerText.includes('No history entries yet')`);
  await navigate(`${origin}/assets/${assetId}?__c6mock=error`, 15000);
  const error = await evaluate(`({ notice: document.body.innerText.includes('Network read failed') || document.body.innerText.includes('Could not read tape history'), retry: [...document.querySelectorAll('button')].some((node) => node.textContent.includes('Try again')) })`);

  await navigate(`${origin}/tape`, 10000);
  const global = await evaluate(`(() => { const dates = [...document.querySelectorAll('.tape-history-rail time')].map((node) => Date.parse(node.dateTime)); return { heading: document.body.innerText.includes('Latest activity across the tape.'), entries: document.querySelectorAll('.tape-history-card').length > 0, ordered: dates.every((value, index) => index === 0 || value >= dates[index - 1]), assetLinks: Boolean(document.querySelector('.tape-history-context a[href^="/assets/"]')) }; })()`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate(`${origin}/assets/${assetId}?__c6mock=full`);
  const mobile = await evaluate(`({ noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, timelineVisible: Boolean(document.querySelector('.tape-history-timeline')) })`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const passed = bounded.count === 16 && Object.entries(bounded).filter(([key]) => key !== 'count').every(([, value]) => value) && pagination.count === 20 && /Showing\s+20\s+of\s+20/i.test(pagination.summaryText) && stale && empty && Object.values(error).every(Boolean) && Object.values(global).every(Boolean) && Object.values(mobile).every(Boolean) && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, bounded, pagination, stale, empty, error, global, mobile, hydrationMessages }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
