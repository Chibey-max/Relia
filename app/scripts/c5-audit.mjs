import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const origin = process.argv[2] ?? 'http://localhost:3000';
const assetId = process.argv[3];
if (!assetId) throw new Error('Pass the configured asset ID as the second argument.');
const owner = '0x3bF16591b7FAd920e34b2bF8B0b788AFF8Ae05e7';
const visitor = '0x4444444444444444444444444444444444444444';
const operator = '0x5555555555555555555555555555555555555555';
const recipient = '0x6666666666666666666666666666666666666666';
const port = 9455;
const profile = await mkdtemp(join(tmpdir(), 'relia-c5-'));
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
      const addressWord = (value) => value.slice(2).toLowerCase().padStart(64, '0');
      const walletAddress = () => new URLSearchParams(location.search).get('__c5wallet') === 'visitor' ? '${visitor}' : new URLSearchParams(location.search).get('__c5wallet') === 'operator' ? '${operator}' : '${owner}';
      const listeners = {};
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [walletAddress()];
          if (method === 'eth_chainId') return '0x18e8f';
          if (method === 'wallet_switchEthereumChain') return null;
          if (method === 'wallet_revokePermissions') return null;
          throw new Error('Audit wallet does not implement ' + method);
        },
        on: (event, listener) => { listeners[event] = listener; },
        removeListener: (event) => { delete listeners[event]; },
      };
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        const mode = new URLSearchParams(location.search).get('__c5mock');
        if (mode === 'cleared' && /creditcoin/i.test(url) && init?.body) {
          try {
            const payload = JSON.parse(init.body);
            const data = payload?.params?.[0]?.data ?? '';
            let result = null;
            if (data.startsWith('0x6352211e')) result = '0x' + addressWord('${owner}');
            if (data.startsWith('0x081812fc')) result = '0x' + addressWord('0x0000000000000000000000000000000000000000');
            if (data.startsWith('0x8f69f12e')) result = '0x' + word(12);
            if (data.startsWith('0x11fa195f')) result = '0x' + word(1);
            if (data.startsWith('0xe985e9c5')) result = '0x' + word(new URLSearchParams(location.search).get('__c5wallet') === 'operator' ? 1 : 0);
            if (payload.method === 'eth_call' && result) return Promise.resolve(new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }), { status: 200, headers: { 'content-type': 'application/json' } }));
          } catch {}
        }
        return originalFetch(input, init);
      };
    })();
  ` });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
  await navigate(`${origin}/title/${assetId}`);
  const soulbound = await evaluate(`({ notice: document.body.innerText.includes('Title remains soulbound'), noControls: !document.querySelector('.ownership-controls'), metadata: document.body.innerText.includes('A pass that explains itself.') && document.body.innerText.includes('In progress') })`);

  await navigate(`${origin}/title/${assetId}?__c5mock=cleared`);
  const ownerControls = await evaluate(`({ authority: document.body.innerText.includes('Owner'), transfer: document.body.innerText.includes('Choose the next owner.'), tokenApproval: document.body.innerText.includes('Delegate this title only.'), operatorApproval: document.body.innerText.includes('Delegate all of your titles.') })`);
  await evaluate(`(() => { const node = document.querySelector('.ownership-transfer input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, '0x0000000000000000000000000000000000000000'); node.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await delay(100);
  const zeroRejected = await evaluate(`document.querySelector('.ownership-transfer input').getAttribute('aria-invalid') === 'true' && [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Review transfer')).disabled`);
  await evaluate(`(() => { const node = document.querySelector('.ownership-transfer input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, '${recipient}'); node.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await delay(100);
  await evaluate(`[...document.querySelectorAll('button')].find((node) => node.textContent.includes('Review transfer')).click()`);
  const transferReview = await evaluate(`({ visible: Boolean(document.querySelector('.ownership-transfer-review')), asset: document.querySelector('.ownership-transfer-review')?.innerText.includes('${assetId}'), owner: document.querySelector('.ownership-transfer-review')?.innerText.toLowerCase().includes('${owner.toLowerCase()}'), recipient: document.querySelector('.ownership-transfer-review')?.innerText.toLowerCase().includes('${recipient.toLowerCase()}') })`);

  await navigate(`${origin}/title/${assetId}?__c5mock=cleared&__c5wallet=visitor`);
  const visitorControls = await evaluate(`({ readOnly: document.body.innerText.includes('Read-only wallet'), noTransfer: !document.body.innerText.includes('Choose the next owner.'), noTokenApproval: !document.body.innerText.includes('Delegate this title only.'), noOperatorApproval: !document.body.innerText.includes('Delegate all of your titles.') })`);
  await navigate(`${origin}/title/${assetId}?__c5mock=cleared&__c5wallet=operator`);
  const operatorControls = await evaluate(`({ authority: document.body.innerText.includes('Approved operator'), transfer: document.body.innerText.includes('Choose the next owner.'), tokenApproval: document.body.innerText.includes('Delegate this title only.'), noOwnerOperatorControl: !document.body.innerText.includes('Delegate all of your titles.') })`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate(`${origin}/title/${assetId}?__c5mock=cleared`);
  const mobile = await evaluate(`({ noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, heading: Boolean(document.querySelector('main h1')) })`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const passed = Object.values(soulbound).every(Boolean) && Object.values(ownerControls).every(Boolean) && zeroRejected && Object.values(transferReview).every(Boolean) && Object.values(visitorControls).every(Boolean) && Object.values(operatorControls).every(Boolean) && Object.values(mobile).every(Boolean) && hydrationMessages.length === 0;
  console.log(JSON.stringify({ passed, soulbound, ownerControls, zeroRejected, transferReview, visitorControls, operatorControls, mobile, hydrationMessages }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
