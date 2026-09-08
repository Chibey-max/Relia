import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/';
const port = 9444;
const profile = await mkdtemp(join(tmpdir(), 'relia-interaction-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });

const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function readJson(url, options) {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError ?? new Error(`Unable to reach ${url}`);
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
  const eventWaiters = new Map();
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
    const handlers = eventWaiters.get(message.method);
    if (handlers?.length) handlers.splice(0).forEach((resolve) => resolve(message.params));
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const waitForEvent = (method) => new Promise((resolve) => {
    const handlers = eventWaiters.get(method) ?? [];
    handlers.push(resolve);
    eventWaiters.set(method, handlers);
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async (url = targetUrl) => {
    const loaded = waitForEvent('Page.loadEventFired');
    await send('Page.navigate', { url });
    await loaded;
    await delay(450);
  };
  const pointFor = async (selector) => evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    node.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  const click = async (selector, touch = false) => {
    const point = await pointFor(selector);
    if (!point) throw new Error(`Missing interaction target: ${selector}`);
    if (touch) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 3, radiusY: 3, force: 1 }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    }
    await delay(90);
  };

  await Promise.all([
    send('Page.enable'),
    send('Runtime.enable'),
    send('Network.enable'),
    send('Accessibility.enable'),
    send('DOM.enable'),
  ]);

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__reliaQa = { errors: [], rejections: [], cls: 0 };
      addEventListener('error', (event) => window.__reliaQa.errors.push(event.message));
      addEventListener('unhandledrejection', (event) => window.__reliaQa.rejections.push(String(event.reason)));
      try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__reliaQa.cls += entry.value;
      })).observe({ type: 'layout-shift', buffered: true }); } catch {}
    `,
  });

  const viewportResults = [];
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: width <= 390 ? 844 : 900,
      deviceScaleFactor: width <= 390 ? 2 : 1,
      mobile: width <= 390,
    });
    await navigate();
    viewportResults.push(await evaluate(`(() => ({
      width: innerWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      headingVisible: Boolean(document.querySelector('main h1')) && getComputedStyle(document.querySelector('main h1')).visibility !== 'hidden',
      navigationPresent: Boolean(document.querySelector('.site-nav')),
      minimumPrimaryTarget: [...document.querySelectorAll('.hero-actions a')].every((node) => node.getBoundingClientRect().height >= 44),
      stuckHiddenElements: [...document.querySelectorAll('[data-reveal], [data-reveal-item], [data-scroll-item]')].filter((node) => {
        const style = getComputedStyle(node); return style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0;
      }).length,
      cls: Number(window.__reliaQa.cls.toFixed(4)),
    }))()`));
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await navigate();

  await click('.proof-stage-shell:nth-child(1) .proof-paper');
  const mouseStageOne = await evaluate(`document.querySelector('.proof-stage-shell:nth-child(1) .proof-paper').getAttribute('aria-pressed') === 'true'`);
  await click('.proof-stage-shell:nth-child(4) .proof-paper');
  const mouseStageFour = await evaluate(`document.querySelector('.proof-stage-shell:nth-child(4) .proof-paper').getAttribute('aria-pressed') === 'true'`);

  await evaluate(`document.querySelector('.proof-stage-shell:nth-child(1) .proof-paper').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  const keyboardStageTwo = await evaluate(`document.querySelector('.proof-stage-shell:nth-child(2) .proof-paper').getAttribute('aria-pressed') === 'true' && document.activeElement === document.querySelector('.proof-stage-shell:nth-child(2) .proof-paper')`);

  for (let index = 0; index < 5; index += 1) await click('.hero-proof-replay');
  await delay(2350);
  const rapidReplaySettled = await evaluate(`document.querySelector('.hero-proof').dataset.activeStage === '4' && !document.querySelector('.hero-proof-replay').hasAttribute('data-playing')`);

  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await click('.process-example-toolbar button:nth-of-type(3)', true);
  const touchPreview = await evaluate(`document.querySelector('.process-example-toolbar button:nth-of-type(3)').getAttribute('aria-pressed') === 'true'`);
  await click('.process-example-toolbar button:nth-of-type(1)', true);
  const reversePreview = await evaluate(`document.querySelector('.process-example-toolbar button:nth-of-type(1)').getAttribute('aria-pressed') === 'true'`);
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });

  await click('.landing-receipt-inspector details:nth-child(2) summary');
  const receiptExpanded = await evaluate(`document.querySelector('.landing-receipt-inspector details:nth-child(2)').open === true`);
  await click('.faq-layout details:first-of-type summary');
  const faqExpanded = await evaluate(`document.querySelector('.faq-layout details:first-of-type').open === true`);

  await evaluate(`location.hash = 'interaction-history'; history.pushState({ relia: true }, '', '/verify');`);
  const forwardPath = await evaluate(`location.pathname`);
  await evaluate(`history.back()`);
  await delay(150);
  const backPath = await evaluate(`location.pathname`);
  await evaluate(`history.forward()`);
  await delay(150);
  const restoredPath = await evaluate(`location.pathname`);
  await evaluate(`history.back()`);
  await delay(150);

  const stageBeforeTabSwitch = await evaluate(`document.querySelector('.hero-proof').dataset.activeStage`);
  const backgroundTarget = await readJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  await send('Target.activateTarget', { targetId: backgroundTarget.id });
  await delay(120);
  await send('Target.activateTarget', { targetId: target.id });
  await delay(180);
  const tabRestoration = await evaluate(`({
    pageVisible: !document.hidden,
    stagePreserved: document.querySelector('.hero-proof').dataset.activeStage === ${JSON.stringify(stageBeforeTabSwitch)},
    noStuckHiddenElements: [...document.querySelectorAll('[data-reveal], [data-reveal-item], [data-scroll-item]')].every((node) => {
      const style = getComputedStyle(node); return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    }),
  })`);
  await send('Target.closeTarget', { targetId: backgroundTarget.id });

  const axTree = await send('Accessibility.getFullAXTree');
  const focusableAxNodes = axTree.nodes.filter((node) => node.properties?.some((property) => property.name === 'focusable' && property.value?.value));
  const unnamedFocusable = focusableAxNodes.filter((node) => !node.name?.value && !['RootWebArea', 'generic'].includes(node.role?.value));
  const accessibility = {
    hasMain: axTree.nodes.some((node) => node.role?.value === 'main'),
    hasNavigation: axTree.nodes.some((node) => node.role?.value === 'navigation'),
    namedButtons: axTree.nodes.filter((node) => node.role?.value === 'button' && node.name?.value).length,
    unnamedFocusable: unnamedFocusable.length,
  };

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate();
  const reducedMotion = await evaluate(`(() => ({
    requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
    canvasDisabled: getComputedStyle(document.querySelector('.brand-motion-canvas')).display === 'none',
    contentVisible: [...document.querySelectorAll('[data-reveal], [data-reveal-item]')].every((node) => Number(getComputedStyle(node).opacity) > 0),
    marqueeStopped: getComputedStyle(document.querySelector('.brand-motion-ticker-track')).animationName === 'none',
  }))()`);
  await send('Emulation.setEmulatedMedia', { features: [] });

  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 900, deviceScaleFactor: 2, mobile: false });
  await navigate();
  const zoom200 = await evaluate(`(() => ({
    effectiveCssWidth: innerWidth,
    noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    navigationPresent: Boolean(document.querySelector('.site-nav')),
    mainVisible: Boolean(document.querySelector('main h1')),
  }))()`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await navigate();
  await evaluate(`document.documentElement.style.fontSize = '125%'`);
  const enlargedText = await evaluate(`({
    noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    mainVisible: Boolean(document.querySelector('main h1')),
    receiptFits: document.querySelector('.landing-receipt').getBoundingClientRect().right <= innerWidth + 1,
  })`);

  await send('Emulation.setScriptExecutionDisabled', { value: true });
  const noJsLoaded = waitForEvent('Page.loadEventFired');
  await send('Page.navigate', { url: targetUrl });
  await noJsLoaded;
  const documentNode = await send('DOM.getDocument', { depth: -1, pierce: true });
  const noJsMain = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: 'main h1' });
  const noJsNavigation = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.site-nav a[href="/verify"]' });
  const noJsNotice = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.no-script-notice' });
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  const runtimeProblems = await evaluate(`window.__reliaQa ?? { errors: [], rejections: [], cls: 0 }`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const result = {
    viewportResults,
    interactions: { mouseStageOne, mouseStageFour, keyboardStageTwo, rapidReplaySettled, touchPreview, reversePreview, receiptExpanded, faqExpanded },
    history: { forwardPath, backPath, restoredPath },
    tabRestoration,
    accessibility,
    reducedMotion,
    zoom200,
    enlargedText,
    noJavaScript: { headingPresent: Boolean(noJsMain.nodeId), navigationPresent: Boolean(noJsNavigation.nodeId), noticePresent: Boolean(noJsNotice.nodeId) },
    diagnostics: { consoleMessages, exceptions, runtimeProblems, hydrationMessages },
  };

  const passed = viewportResults.every((item) => item.noHorizontalOverflow && item.headingVisible && item.navigationPresent && item.minimumPrimaryTarget && item.stuckHiddenElements === 0 && item.cls < 0.1)
    && Object.values(result.interactions).every(Boolean)
    && backPath === '/' && forwardPath === '/verify' && restoredPath === '/verify'
    && Object.values(tabRestoration).every(Boolean)
    && accessibility.hasMain && accessibility.hasNavigation && accessibility.namedButtons > 0 && accessibility.unnamedFocusable === 0
    && Object.values(reducedMotion).every(Boolean)
    && zoom200.noHorizontalOverflow && zoom200.navigationPresent && zoom200.mainVisible
    && Object.values(enlargedText).every(Boolean)
    && Object.values(result.noJavaScript).every(Boolean)
    && exceptions.length === 0 && runtimeProblems.errors.length === 0 && runtimeProblems.rejections.length === 0 && hydrationMessages.length === 0;

  process.stdout.write(`${JSON.stringify({ passed, ...result }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
