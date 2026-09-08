import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const assetId = process.argv[3];
if (!assetId) throw new Error('Pass a 32-byte asset ID as the second argument.');
const port = 9457;
const profile = await mkdtemp(join(tmpdir(), 'relia-c7-'));
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
  const navigate = async (url, wait = 5000) => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await delay(wait); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      const originalFetch = window.fetch.bind(window);
      window.__c7Requests = 0;
      const payTx = '0x${'a'.repeat(64)}';
      const ackTx = '0x${'b'.repeat(64)}';
      const creditcoinTx = '0x${'c'.repeat(64)}';
      const event = (stage, detail = {}, extra = {}) => ({ stage, assetId: '${assetId}', n: 1, at: '2026-09-07T12:00:00.000Z', detail, ...extra });
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes(':8787/status')) {
          window.__c7Requests += 1;
          const mode = new URLSearchParams(location.search).get('__c7mock');
          if (mode === 'offline') return Promise.reject(new TypeError('worker unavailable'));
          let events = [event('sepolia_mined', { payTx, block: 100 })];
          if (mode === 'refused') events = [...events, event('ack_located', { ackTx, block: 101 }), event('attested', { height: 101 }), event('verified', {}, { error: 'The installment amount is below the required amount.', rule: 'UnderPaid' })];
          if (mode === 'complete') events = [...events, event('ack_located', { ackTx, block: 101 }), event('attested', { height: 101 }), event('proof_generated', { continuityRoots: 2 }), event('verified', { creditcoinTx, block: 200 }), event('title_ticked', { payTx, ackTx, creditcoinTx })];
          return Promise.resolve(new Response(JSON.stringify({ online: true, updatedAt: new Date().toISOString(), events }), { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        return originalFetch(input, init);
      };
    })();
  ` });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
  const base = `${origin}/send?assetId=${assetId}&slice=1`;
  await navigate(`${base}&__c7mock=pending`);
  const pendingState = await evaluate(`(() => { const panel = document.querySelector('.proof-status-panel'); const steps = [...panel.querySelectorAll('.proof-status-steps li')]; return { panel: Boolean(panel), fiveSteps: steps.length === 5, paymentDone: steps[0].dataset.state === 'done', ackActive: steps[1].dataset.state === 'active', pendingCopy: panel.innerText.includes('Acknowledgement pending'), boundary: panel.innerText.includes('ProofConsumer.consume(...)') && panel.innerText.includes('proveShortfallDispute(...)'), oneControl: panel.querySelectorAll('.proof-status-tools button').length === 1, paymentLink: Boolean(panel.querySelector('a[href*="sepolia.etherscan.io"]')) }; })()`);
  const beforeRefresh = await evaluate(`window.__c7Requests`);
  await evaluate(`document.querySelector('.proof-status-tools button').click()`);
  await delay(700);
  const manualRefresh = await evaluate(`window.__c7Requests > ${beforeRefresh}`);

  await navigate(`${base}&__c7mock=refused`);
  const refused = await evaluate(`(() => { const panel = document.querySelector('.proof-status-panel'); return { rule: panel.innerText.includes('Proof refused · UnderPaid'), reason: panel.innerText.includes('below the required amount'), distinction: panel.innerText.includes('not a pending acknowledgement'), failedStage: panel.querySelectorAll('.proof-status-steps li')[3].dataset.state === 'failed' }; })()`);

  await navigate(`${base}&__c7mock=complete`);
  const complete = await evaluate(`(() => { const panel = document.querySelector('.proof-status-panel'); const steps = [...panel.querySelectorAll('.proof-status-steps li')]; return { allDone: steps.every((step) => step.dataset.state === 'done'), evidence: panel.querySelectorAll('.proof-status-evidence .identifier-field').length === 3, paymentLink: Boolean(panel.querySelector('a[href*="sepolia.etherscan.io/tx/"]')), proofLink: Boolean(panel.querySelector('a[href*="creditcoin-testnet.blockscout.com/tx/"]')), noSubmit: ![...panel.querySelectorAll('button')].some((button) => /submit|generate|prove/i.test(button.innerText)) }; })()`);

  await navigate(`${base}&__c7mock=offline`);
  const offline = await evaluate(`document.querySelector('.proof-status-panel').innerText.includes('observer feed is unavailable')`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate(`${base}&__c7mock=complete`);
  const mobile = await evaluate(`({ noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, panelVisible: Boolean(document.querySelector('.proof-status-panel')), stacked: getComputedStyle(document.querySelector('.proof-status-steps')).gridTemplateColumns.split(' ').length === 1 })`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const passed = Object.values(pendingState).every(Boolean) && manualRefresh && Object.values(refused).every(Boolean) && Object.values(complete).every(Boolean) && offline && Object.values(mobile).every(Boolean) && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, pendingState, manualRefresh, refused, complete, offline, mobile, hydrationMessages }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
