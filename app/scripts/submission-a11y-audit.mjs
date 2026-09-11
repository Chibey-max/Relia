import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/';
const port = 9497;
const profile = await mkdtemp(join(tmpdir(), 'relia-submission-a11y-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', [
  '--headless',
  '--disable-extensions',
  '--disable-gpu',
  '--no-sandbox',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });

const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function readJson(url, options) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
    } catch {}
    await delay(100);
  }
  throw new Error(`Unable to reach ${url}`);
}

let socket;
try {
  await readJson(`http://127.0.0.1:${port}/json/version`);
  const target = await readJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  const waiters = new Map();
  const consoleMessages = [];
  const exceptions = [];

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message));
      else handler?.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    }
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.text);
    }
    const handlers = waiters.get(message.method);
    if (handlers?.length) handlers.splice(0).forEach((resolveEvent) => resolveEvent(message.params));
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const waitFor = (method) => new Promise((resolve) => {
    const handlers = waiters.get(method) ?? [];
    handlers.push(resolve);
    waiters.set(method, handlers);
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async (url = targetUrl) => {
    const loaded = waitFor('Page.loadEventFired');
    await send('Page.navigate', { url });
    await Promise.race([loaded, delay(8000)]);
    await evaluate('document.fonts?.ready');
    await evaluate('window.__reliaA11y.cls = 0');
    await delay(350);
  };

  await Promise.all([
    send('Page.enable'),
    send('Runtime.enable'),
    send('Accessibility.enable'),
    send('DOM.enable'),
  ]);

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__reliaA11y = { errors: [], rejections: [], cls: 0 };
      addEventListener('error', (event) => window.__reliaA11y.errors.push(event.message));
      addEventListener('unhandledrejection', (event) => window.__reliaA11y.rejections.push(String(event.reason)));
      try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__reliaA11y.cls += entry.value;
      })).observe({ type: 'layout-shift', buffered: true }); } catch {}
    `,
  });

  const pages = ['/', '/judge', '/send', '/verify', '/tape', '/title'];
  const pageResults = [];
  for (const path of pages) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await navigate(new URL(path, targetUrl).toString());
    const axTree = await send('Accessibility.getFullAXTree');
    const focusableAxNodes = axTree.nodes.filter((node) => node.properties?.some((property) => property.name === 'focusable' && property.value?.value));
    const unnamedFocusable = focusableAxNodes.filter((node) => !node.name?.value && !['RootWebArea', 'generic'].includes(node.role?.value));
    const structural = await evaluate(`(() => {
      const visible = (node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const controls = [...document.querySelectorAll('a, button, summary, input, [role="button"], [tabindex]:not([tabindex="-1"])')].filter(visible);
      return {
        hasSkipLink: Boolean(document.querySelector('.skip-link[href="#main"]')),
        hasMainTarget: Boolean(document.querySelector('#main[tabindex="-1"]')),
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        allImportantTargets44: controls.every((node) => {
          const rect = node.getBoundingClientRect();
          if (node.classList.contains('skip-link')) return true;
          if (node.matches('input[type="checkbox"], input[type="radio"]') && node.closest('label')) return true;
          return rect.height >= 44 || rect.width >= 44;
        }),
        namedFormFields: [...document.querySelectorAll('input, textarea, select')].every((node) => Boolean(node.closest('label') || node.getAttribute('aria-label') || node.getAttribute('aria-labelledby'))),
        liveRegionCount: document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length,
        focusOrderCount: controls.length,
        cls: Number(window.__reliaA11y.cls.toFixed(4)),
      };
    })()`);
    pageResults.push({
      path,
      hasMain: axTree.nodes.some((node) => node.role?.value === 'main'),
      hasNavigation: axTree.nodes.some((node) => node.role?.value === 'navigation'),
      headingCount: axTree.nodes.filter((node) => node.role?.value === 'heading' && node.name?.value).length,
      namedButtons: axTree.nodes.filter((node) => node.role?.value === 'button' && node.name?.value).length,
      namedLinks: axTree.nodes.filter((node) => node.role?.value === 'link' && node.name?.value).length,
      unnamedFocusable: unnamedFocusable.length,
      ...structural,
    });
  }

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate(targetUrl);
  const reducedMotion = await evaluate(`(() => ({
    requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
    revealedContentVisible: [...document.querySelectorAll('[data-reveal], [data-reveal-item]')].every((node) => Number(getComputedStyle(node).opacity) > 0),
    motionLoopsStopped: document.getAnimations({ subtree: true }).filter((animation) => {
      const target = animation.effect?.target;
      return target instanceof Element && target.closest('[data-motion-loop]');
    }).every((animation) => animation.playState !== 'running'),
  }))()`);
  await send('Emulation.setEmulatedMedia', { features: [] });

  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(targetUrl);
  const zoom200Proxy = await evaluate(`(() => ({
    noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    mainVisible: Boolean(document.querySelector('main h1')),
    navVisible: Boolean(document.querySelector('.site-nav')),
  }))()`);

  await send('Emulation.setScriptExecutionDisabled', { value: true });
  const loaded = waitFor('Page.loadEventFired');
  await send('Page.navigate', { url: targetUrl });
  await Promise.race([loaded, delay(8000)]);
  const documentNode = await send('DOM.getDocument', { depth: -1, pierce: true });
  const noJavaScript = {
    headingPresent: Boolean((await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: 'main h1' })).nodeId),
    navigationPresent: Boolean((await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.site-nav a[href="/verify"]' })).nodeId),
    noticePresent: Boolean((await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.no-script-notice' })).nodeId),
  };
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  const diagnostics = await evaluate('window.__reliaA11y ?? { errors: [], rejections: [], cls: 0 }');
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const failedPages = pageResults.filter((page) => !(page.hasMain && page.hasNavigation && page.headingCount > 0
    && page.namedButtons > 0 && page.namedLinks > 0 && page.unnamedFocusable === 0
    && page.hasSkipLink && page.hasMainTarget && page.noHorizontalOverflow
    && page.allImportantTargets44 && page.namedFormFields && page.liveRegionCount > 0
    && page.cls < 0.05));
  const passed = failedPages.length === 0
    && Object.values(reducedMotion).every(Boolean)
    && Object.values(zoom200Proxy).every(Boolean)
    && Object.values(noJavaScript).every(Boolean)
    && exceptions.length === 0
    && diagnostics.errors.length === 0
    && diagnostics.rejections.length === 0
    && hydrationMessages.length === 0;

  process.stdout.write(`${JSON.stringify({
    passed,
    failedPages,
    pageResults,
    reducedMotion,
    zoom200Proxy,
    noJavaScript,
    diagnostics: { consoleMessages, exceptions, runtime: diagnostics, hydrationMessages },
  }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await delay(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
