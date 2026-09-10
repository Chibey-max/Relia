import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const assetId = process.argv[3];
if (!assetId) throw new Error('Pass a configured asset ID as the second argument.');
const payTx = `0x${'a'.repeat(64)}`;
const shop = '0x1111111111111111111111111111111111111111';
const buyer = '0x2222222222222222222222222222222222222222';
const account = '0x3333333333333333333333333333333333333333';
const port = 9458;
const profile = await mkdtemp(join(tmpdir(), 'relia-c8-'));
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
  const navigate = async (url, wait = 5500) => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await delay(wait); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      window.ethereum = {
        request: async ({ method }) => method === 'eth_accounts' || method === 'eth_requestAccounts' ? ['${account}'] : method === 'eth_chainId' ? '0xaa36a7' : null,
        on: () => {}, removeListener: () => {},
      };
      if (location.pathname === '/send') localStorage.setItem('relia:pending-payment:v1', JSON.stringify({ assetId: '${assetId}', n: 1, shop: '${shop}', buyer: '${buyer}', submittedPayTx: '${payTx}', payTx: '${payTx}', submittedAckTx: '', ackTx: '' }));
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes(':8787/status')) return Promise.resolve(new Response(JSON.stringify({ online: true, events: [{ stage: 'sepolia_mined', assetId: '${assetId}', n: 1, at: '2026-09-07T12:00:00.000Z', detail: { payTx: '${payTx}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
        return originalFetch(input, init);
      };
    })();
  ` });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(`${origin}/send?assetId=${assetId}&slice=1`);
  const sendState = await evaluate(`(() => { const actions = [...document.querySelectorAll('.transaction-action')]; const shopAction = document.querySelector('.transaction-action-shop'); const ackControl = [...shopAction.querySelectorAll('button')].find((button) => button.innerText.toLowerCase().includes('acknowledge')); return { roleCards: actions.length === 2 && document.body.innerText.includes('BUYER OR PAYER ACTION') && document.body.innerText.includes('REGISTERED SHOP ACTION'), signerContexts: actions.every((node) => Boolean(node.querySelector('.signer-context'))), durable: document.body.innerText.includes('stored in this browser'), restoredHash: document.body.innerText.includes('${payTx.slice(0, 12)}'), mismatch: shopAction.innerText.includes('not the registered shop') && shopAction.querySelector('.signer-context').dataset.match === 'no', ackDisabled: Boolean(ackControl?.disabled), canonical: Boolean(document.querySelector('a[href="/assets/${assetId}"]')) }; })()`);

  await navigate(`${origin}/title?assetId=${assetId}`);
  const titleState = await evaluate(`({ picker: Boolean(document.querySelector('.lookup-panel select')), pasteFallback: Boolean(document.querySelector('.lookup-panel input')), canonical: Boolean(document.querySelector('a[href="/assets/${assetId}"]')) })`);

  await navigate(`${origin}/tape`, 7500);
  const tapeState = await evaluate(`(() => { const panel = document.querySelector('.tape-filter-panel'); return { panel: Boolean(panel), asset: Boolean(panel.querySelector('select')), buyer: [...panel.querySelectorAll('input')].some((node) => node.placeholder === '0x…'), shop: [...panel.querySelectorAll('input')].filter((node) => node.placeholder === '0x…').length === 2, status: panel.querySelectorAll('select').length === 2, actionable: Boolean(panel.querySelector('input[type="checkbox"]')), signer: Boolean(document.querySelector('.tape-write-context .signer-context')) }; })()`);

  const tapeSource = await readFile(new URL('../app/tape/page.tsx', import.meta.url), 'utf8');
  const standardsFiles = ['../app/send/page.tsx', '../app/tape/page.tsx', '../app/assets/[assetId]/page.tsx', '../app/assets/new/page.tsx', '../app/title/[assetId]/page.tsx', '../components/ShopRegistrationPanel.tsx', '../components/ReclaimAction.tsx'];
  const standards = (await Promise.all(standardsFiles.map((file) => readFile(new URL(file, import.meta.url), 'utf8')))).every((source) => (source.includes('LoadingButton') || source.includes('ConfirmWriteAction')) && source.includes('ProgressStatus') && source.includes('walletClientFor') && source.includes('ErrorNotice'));
  const sourceChecks = { targetedRefresh: !tapeSource.includes('location.reload') && tapeSource.includes("functionName: 'sliceOf'") && tapeSource.includes('setRows'), canonicalTapeLinks: tapeSource.includes('href={`/assets/${r.assetId}`}'), sharedWriteStandards: standards };

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate(`${origin}/send?assetId=${assetId}&slice=1`);
  const mobile = await evaluate(`({ noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, rolesVisible: Boolean(document.querySelector('.transaction-action-shop')), signerFits: document.querySelector('.signer-context').getBoundingClientRect().right <= innerWidth + 1 })`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const passed = Object.values(sendState).every(Boolean) && Object.values(titleState).every(Boolean) && Object.values(tapeState).every(Boolean) && Object.values(sourceChecks).every(Boolean) && Object.values(mobile).every(Boolean) && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, sendState, titleState, tapeState, sourceChecks, mobile, hydrationMessages }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}
