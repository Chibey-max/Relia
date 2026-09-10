import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const assetId = process.argv[3];
if (!assetId) throw new Error('Pass the configured asset ID as the second argument.');
const payTx = `0x${'a'.repeat(64)}`;
const draftShop = '0x1111111111111111111111111111111111111111';
const buyer = '0x2222222222222222222222222222222222222222';
const port = 9459;
const profile = await mkdtemp(join(tmpdir(), 'relia-c9-'));
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
  const navigate = async (url, wait = 900) => { const loaded = waitFor('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await delay(wait); };

  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      const mode = new URLSearchParams(location.search).get('__wallet');
      if (location.pathname === '/send') {
        if (new URLSearchParams(location.search).has('__nodraft')) localStorage.removeItem('relia:pending-payment:v1');
        else localStorage.setItem('relia:pending-payment:v1', JSON.stringify({ assetId: '${assetId}', n: 1, shop: '${draftShop}', buyer: '${buyer}', submittedPayTx: '${payTx}', payTx: '${payTx}', submittedAckTx: '', ackTx: '' }));
      }
      if (mode !== 'missing') window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_accounts') return mode === 'rejected' ? [] : ['${draftShop}'];
          if (method === 'eth_requestAccounts') { if (mode === 'rejected') throw Object.assign(new Error('User rejected the request'), { code: 4001 }); return ['${draftShop}']; }
          if (method === 'eth_chainId') return mode === 'wrong' ? '0x1' : '0xaa36a7';
          if (method === 'wallet_switchEthereumChain') return null;
          return null;
        },
        on: () => {}, removeListener: () => {},
      };
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes(':8787/status')) return Promise.resolve(new Response(JSON.stringify({ online: true, events: [{ stage: 'sepolia_mined', assetId: '${assetId}', n: 1, at: '2026-09-07T12:00:00.000Z', detail: { payTx: '${payTx}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
        return originalFetch(input, init);
      };
    })();
  ` });

  const routes = ['/', '/send', '/tape', '/title', '/verify', '/assets/new', `/assets/${assetId}`, `/title/${assetId}`, `/verify/${payTx}`];
  const viewports = [320, 768, 1024, 1440];
  const responsive = {};
  for (const width of viewports) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
    responsive[width] = [];
    for (const route of routes) {
      await navigate(`${origin}${route}${route.includes('?') ? '&' : '?'}__wallet=connected`, width === 320 && route === '/' ? 5000 : 500);
      responsive[width].push({ route, fits: await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`) });
    }
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 900, deviceScaleFactor: 2, mobile: false });
  await navigate(`${origin}/send?assetId=${assetId}&slice=1&__wallet=connected&__nodraft=1`, 1800);
  const zoom200 = await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);

  await navigate(`${origin}/?__wallet=connected`, 800);
  await evaluate(`document.querySelector('.proof-stage-shell:nth-child(1) .proof-paper').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  await delay(300);
  const keyboardOpen = await evaluate(`document.querySelector('.proof-stage-shell:nth-child(2) .proof-paper').getAttribute('aria-pressed') === 'true' && document.activeElement === document.querySelector('.proof-stage-shell:nth-child(2) .proof-paper')`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft' });
  await delay(200);
  const keyboardClose = await evaluate(`document.querySelector('.proof-stage-shell:nth-child(1) .proof-paper').getAttribute('aria-pressed') === 'true' && document.activeElement === document.querySelector('.proof-stage-shell:nth-child(1) .proof-paper')`);

  async function exerciseWalletError(mode, expected) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate(`${origin}/send?assetId=${assetId}&slice=1&__wallet=${mode}`, 1000);
    const before = await evaluate(`document.querySelector('.transaction-action-shop')?.innerText ?? ''`);
    await evaluate(`(() => { const button = [...document.querySelectorAll('.transaction-action-shop button')].find((node) => node.innerText.toLowerCase().includes('review acknowledge')); button?.click(); })()`);
    await delay(150);
    await evaluate(`document.querySelector('.confirm-write-dialog .loading-button')?.click()`);
    await delay(800);
    return evaluate(`({ error: document.body.innerText.includes(${JSON.stringify(expected)}), durable: document.body.innerText.includes('stored in this browser'), formPreserved: (document.querySelector('.transaction-action-shop')?.innerText ?? '').includes('Acknowledgement signer'), focused: document.activeElement?.classList.contains('error-focus-target') || Boolean(document.activeElement?.closest('.error-focus-target')), beforeHadAction: ${JSON.stringify(Boolean(before))} })`);
  }
  const missingWallet = await exerciseWalletError('missing', 'Wallet not found');
  const rejectedSignature = await exerciseWalletError('rejected', 'Wallet request cancelled');
  await navigate(`${origin}/send?assetId=${assetId}&slice=1&__wallet=wrong`, 1000);
  const wrongNetwork = await evaluate(`document.body.innerText.includes('Wrong network')`);

  const sourceFiles = [
    '../app/send/page.tsx', '../app/tape/page.tsx', '../app/assets/[assetId]/page.tsx', '../app/assets/new/page.tsx', '../app/title/[assetId]/page.tsx',
    '../components/ShopRegistrationPanel.tsx', '../components/ReclaimAction.tsx', '../components/ConfirmWriteAction.tsx', '../components/LoadingUI.tsx', '../components/ErrorNotice.tsx', '../lib/errors.ts', '../app/globals.css',
  ];
  const sources = await Promise.all(sourceFiles.map((file) => readFile(new URL(file, import.meta.url), 'utf8')));
  const allSource = sources.join('\n');
  const forbidden = ['wire', 'setConsumer', 'setRegistrar', 'markLive', 'markPaymentProven', 'tick'];
  const infrastructureHidden = forbidden.every((method) => !new RegExp(`functionName:\\s*['\"]${method}['\"]`).test(allSource)) && !/titlePassAbi[\s\S]{0,120}functionName:\s*['"]mint['"]/.test(allSource);
  const stateCoverage = ['no injected wallet', 'wrong network', 'user rejected', 'rpc', 'revert'].every((token) => sources[10].toLowerCase().includes(token));
  const safety = {
    infrastructureHidden,
    reviewDialogs: allSource.includes('ConfirmWriteAction') && allSource.includes('FINAL WALLET REVIEW'),
    duplicateLocks: sources[7].includes('submittingRef') && sources[3].includes('writeLock') && sources[4].includes('writeLock'),
    durableResults: allSource.includes('durable-result') && sources[0].includes('localStorage'),
    liveRegions: sources[8].includes('aria-live="polite"') && sources[9].includes('noticeRef.current?.focus()') && sources[7].includes("querySelector<HTMLButtonElement>('.loading-button')?.focus()") && sources[7].includes("event.key === 'Escape'"),
    reducedMotion: sources[11].includes('@media (prefers-reduced-motion: reduce)'),
    stateCoverage,
    noReload: !allSource.includes('location.reload'),
  };

  const allResponsive = Object.values(responsive).flat().every((entry) => entry.fits);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const passed = allResponsive && zoom200 && keyboardOpen && keyboardClose && Object.values(missingWallet).every(Boolean) && Object.values(rejectedSignature).every(Boolean) && wrongNetwork && Object.values(safety).every(Boolean) && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, responsive, allResponsive, zoom200, keyboard: { open: keyboardOpen, close: keyboardClose }, missingWallet, rejectedSignature, wrongNetwork, safety, hydrationMessages }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}
