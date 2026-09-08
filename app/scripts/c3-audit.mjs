import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const assetUrl = process.argv[2];
if (!assetUrl) throw new Error('Pass the URL of a real asset detail page.');
const port = 9453;
const profile = await mkdtemp(join(tmpdir(), 'relia-c3-'));
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
  const navigate = async (url) => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await delay(6000); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        const mode = new URLSearchParams(location.search).get('__c3mock');
        if (mode && /sepolia/i.test(url) && init?.body) {
          try {
            const payload = JSON.parse(init.body);
            if (payload.method === 'eth_call') {
              const address = mode === 'conflict' ? '${'4'.repeat(40)}' : '${'0'.repeat(40)}';
              return Promise.resolve(new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: '0x${'0'.repeat(24)}' + address }), { status: 200, headers: { 'content-type': 'application/json' } }));
            }
          } catch {}
        }
        return originalFetch(input, init);
      };
    })();
  ` });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(assetUrl);
  const matched = await evaluate(`({ registered: document.body.innerText.includes('The expected shop is already registered.'), actionAbsent: ![...document.querySelectorAll('button')].some((node) => node.textContent.includes('Register matching shop')) })`);

  await navigate(`${assetUrl}?__c3mock=empty`);
  const empty = await evaluate(`({ unregistered: document.body.innerText.includes('Not registered on Sepolia'), actionPresent: [...document.querySelectorAll('button')].some((node) => node.textContent.includes('Register matching shop')), loaded: !document.body.innerText.includes('Checking the current shop binding') })`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate(`${assetUrl}?__c3mock=conflict`);
  const conflict = await evaluate(`({ conflict: document.body.innerText.includes('Registration conflict'), actionAbsent: ![...document.querySelectorAll('button')].some((node) => node.textContent.includes('Register matching shop')), noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 })`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const passed = Object.values(matched).every(Boolean) && Object.values(empty).every(Boolean) && Object.values(conflict).every(Boolean) && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, matched, empty, conflict, hydrationMessages }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
