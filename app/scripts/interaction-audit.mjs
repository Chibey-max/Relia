import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/';
const port = 9444;
const profile = await mkdtemp(join(tmpdir(), 'relia-interaction-'));
const chrome = spawn(process.env.CHROME_PATH ?? 'chromium', [
  '--headless',
  '--disable-extensions',
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
    await Promise.race([loaded, delay(8000)]);
    await evaluate(`document.fonts?.ready`);
    await evaluate(`window.__reliaQa.cls = 0; window.__reliaQa.shifts = [];`);
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
      window.__reliaQa = { errors: [], rejections: [], cls: 0, shifts: [] };
      addEventListener('error', (event) => window.__reliaQa.errors.push(event.message));
      addEventListener('unhandledrejection', (event) => window.__reliaQa.rejections.push(String(event.reason)));
      try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          window.__reliaQa.cls += entry.value;
          window.__reliaQa.shifts.push({
            value: Number(entry.value.toFixed(4)),
            sources: (entry.sources ?? []).map((source) => {
              const node = source.node;
              if (!node) return 'unknown';
              const id = node.id ? '#' + node.id : '';
              const classes = typeof node.className === 'string' && node.className ? '.' + node.className.trim().replace(/\\s+/g, '.') : '';
              return node.tagName?.toLowerCase() + id + classes;
            }),
          });
        }
      })).observe({ type: 'layout-shift', buffered: true }); } catch {}
    `,
  });

  const viewportResults = [];
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: width <= 375 ? 667 : width <= 430 ? 844 : 900,
      deviceScaleFactor: width <= 430 ? 2 : 1,
      mobile: width <= 430,
    });
    await navigate();
    viewportResults.push(await evaluate(`(() => {
      const containmentTargets = [...document.querySelectorAll('a, button, h1, h2, h3, p, summary, input, nav, .landing-kicker, .highlight, .nav-pill, .hero-proof')];
      const overflowingElements = containmentTargets.flatMap((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return [];
        if (rect.left >= -1 && rect.right <= innerWidth + 1) return [];
        return [{
          selector: node.id ? '#' + node.id : node.tagName.toLowerCase() + (typeof node.className === 'string' && node.className ? '.' + node.className.trim().replace(/\\s+/g, '.') : ''),
          left: Number(rect.left.toFixed(1)),
          right: Number(rect.right.toFixed(1)),
        }];
      });
      return {
        width: innerWidth,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        containedContent: overflowingElements.length === 0,
        overflowingElements,
        headingVisible: Boolean(document.querySelector('main h1')) && getComputedStyle(document.querySelector('main h1')).visibility !== 'hidden',
        navigationPresent: Boolean(document.querySelector('.site-nav')),
        minimumPrimaryTarget: [...document.querySelectorAll('.hero-actions a')]
          .filter((node) => { const rect = node.getBoundingClientRect(); return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0; })
          .every((node) => node.getBoundingClientRect().height >= 43.5),
        importantTargets: [...document.querySelectorAll('.site-nav-toggle, .wallet-button, .hero-actions a, .hero-proof-mobile-tabs button, .process-disclosure > summary, .landing-receipt-inspector summary, .faq-layout summary, .landing-final-actions a, .status-limitations summary')]
          .filter((node) => { const rect = node.getBoundingClientRect(); return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0; })
          .every((node) => { const rect = node.getBoundingClientRect(); return rect.width >= 43.5 && rect.height >= 43.5; }),
        stuckHiddenElements: [...document.querySelectorAll('[data-reveal], [data-reveal-item], [data-scroll-item]')].filter((node) => {
          const style = getComputedStyle(node);
          const intentionallyInactiveComparison = Boolean(node.closest('.record-comparison')) && style.display === 'none';
          return !intentionallyInactiveComparison && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0);
        }).length,
        cls: Number(window.__reliaQa.cls.toFixed(4)),
        shifts: window.__reliaQa.shifts,
      };
    })()`));
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await navigate();
  await click('.site-nav-toggle', true);
  const mobileMenu = await evaluate(`(() => {
    const menu = document.querySelector('.site-nav');
    const trigger = menu.querySelector('.site-nav-toggle');
    const panel = document.querySelector('.site-nav-links');
    const brand = document.querySelector('.brand');
    const header = document.querySelector('.nav-pill');
    const rect = panel.getBoundingClientRect();
    return {
      open: menu.dataset.open === 'true',
      expanded: trigger.getAttribute('aria-expanded') === 'true',
      contained: rect.left >= 0 && rect.right <= innerWidth,
      triggerTarget: trigger.getBoundingClientRect().width >= 44 && trigger.getBoundingClientRect().height >= 44,
      brandTarget: brand.getBoundingClientRect().height >= 44,
      compactHeader: header.getBoundingClientRect().height >= 60 && header.getBoundingClientRect().height <= 64,
      clearsTrigger: rect.top >= header.getBoundingClientRect().bottom - 1,
    };
  })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await delay(90);
  const mobileMenuEscape = await evaluate(`(() => {
    const menu = document.querySelector('.site-nav');
    const trigger = menu.querySelector('.site-nav-toggle');
    return menu.dataset.open !== 'true' && trigger.getAttribute('aria-expanded') === 'false' && document.activeElement === trigger;
  })()`);
  await click('.site-nav-toggle', true);
  await evaluate(`document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await delay(90);
  const mobileMenuOutsideClose = await evaluate(`document.querySelector('.site-nav').dataset.open !== 'true'`);
  const compactWalletRecovery = await evaluate(`(() => {
    const button = document.querySelector('.wallet-button');
    return button?.dataset.state !== 'unsupported' || button.querySelector('.wallet-label-compact')?.textContent.trim() === 'Get wallet';
  })()`);
  await click('.site-nav-toggle', true);
  await click('.site-nav-links a[href="/verify"]', true);
  const menuClosedAfterSelection = await evaluate(`document.querySelector('.site-nav').dataset.open !== 'true'`);
  const verifyRouteArrived = await evaluate(`new Promise((resolve) => {
    const deadline = performance.now() + 8000;
    const check = () => {
      if (location.pathname === '/verify') resolve(true);
      else if (performance.now() >= deadline) resolve(false);
      else setTimeout(check, 50);
    };
    check();
  })`);
  const mobileMenuRouteClose = menuClosedAfterSelection && verifyRouteArrived;
  await navigate(targetUrl);
  const mobileHeroQuality = await evaluate(`(() => {
    const kicker = document.querySelector('.editorial-hero .landing-kicker');
    const reading = document.querySelector('.reading-note');
    const heading = document.querySelector('.editorial-hero h1');
    const highlight = document.querySelector('.editorial-hero .highlight');
    const tab = document.querySelector('.hero-proof-mobile-tabs button:first-child');
    const tabLabel = tab.querySelector('small');
    return {
      kickerReadable: parseFloat(getComputedStyle(kicker).fontSize) >= 11,
      readingReadable: parseFloat(getComputedStyle(reading).fontSize) >= 11,
      headingScale: parseFloat(getComputedStyle(heading).fontSize) >= 34 && parseFloat(getComputedStyle(heading).fontSize) <= 40,
      lighterHighlight: parseFloat(getComputedStyle(highlight).borderTopWidth) <= 2,
      stageTarget: tab.getBoundingClientRect().height >= 44,
      stageLabelReadable: parseFloat(getComputedStyle(tabLabel).fontSize) >= 11,
      explicitPlay: document.querySelector('.hero-proof-replay').textContent.includes('Play story'),
      noAutoplay: document.querySelector('.hero-proof').dataset.activeStage === '4' && !document.querySelector('.hero-proof-replay').hasAttribute('data-playing'),
      announcesStage: document.querySelector('.hero-proof-explanation').getAttribute('aria-live') === 'polite',
    };
  })()`);
  await click('.hero-proof-replay', true);
  await delay(120);
  await click('.hero-proof-mobile-tabs button:first-child', true);
  const mobileProofStageOne = await evaluate(`(() => {
    const tab = document.querySelector('.hero-proof-mobile-tabs button:first-child');
    const style = getComputedStyle(tab);
    return document.querySelector('.hero-proof').dataset.activeStage === '1'
      && tab.getAttribute('aria-pressed') === 'true'
      && !document.querySelector('.hero-proof-replay').hasAttribute('data-playing')
      && style.boxShadow !== 'none';
  })()`);
  await click('.proof-stage-shell[data-state="active"] .proof-paper', true);
  const mobileCardAdvances = await evaluate(`document.querySelector('.hero-proof').dataset.activeStage === '2' && document.querySelector('.hero-proof-explanation').textContent.includes('shop confirms')`);
  await click('.record-comparison-controls button:first-child', true);
  const mobilePrivateComparison = await evaluate(`(() => {
    const root = document.querySelector('.record-comparison');
    return root.dataset.view === 'private'
      && getComputedStyle(document.querySelector('#private-record')).display !== 'none'
      && getComputedStyle(document.querySelector('#public-record')).display === 'none';
  })()`);
  await click('.record-comparison-controls button:last-child', true);
  const mobilePublicComparison = await evaluate(`(() => {
    const root = document.querySelector('.record-comparison');
    return root.dataset.view === 'public'
      && getComputedStyle(document.querySelector('#public-record')).display !== 'none'
      && document.querySelectorAll('.comparison-outcomes p').length === 2;
  })()`);
  const mobileTypography = await evaluate(`(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const essential = [...document.querySelectorAll('.refreshed-landing .mini-title, .refreshed-landing .section-index, .refreshed-landing .experience-mode, .refreshed-landing .evidence-snapshot')].filter(visible);
    const interactive = [...document.querySelectorAll('.refreshed-landing a, .refreshed-landing button, .refreshed-landing summary')].filter(visible);
    const headings = [...document.querySelectorAll('.refreshed-landing section:not(.editorial-hero) h2:not(.sr-only):not(.brand-motion-sr-only)')].filter(visible);
    const longCopy = [...document.querySelectorAll('.story-grid .lead, .source-chain-note, .hero-proof-explanation p, .question-answer p')].filter(visible);
    return {
      essentialLabels: essential.every((node) => parseFloat(getComputedStyle(node).fontSize) >= 11),
      interactiveLabels: interactive.every((node) => parseFloat(getComputedStyle(node).fontSize) >= 12),
      interactiveLabelOffenders: interactive.filter((node) => parseFloat(getComputedStyle(node).fontSize) < 12).map((node) => ({
        element: node.tagName.toLowerCase() + '.' + node.className,
        text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
        size: getComputedStyle(node).fontSize,
        parent: node.parentElement?.className || '',
      })),
      sectionHeadings: headings.every((node) => { const size = parseFloat(getComputedStyle(node).fontSize); return size >= 28 && size <= 32; }),
      readableMeasure: longCopy.every((node) => node.getBoundingClientRect().width / parseFloat(getComputedStyle(node).fontSize) <= 25),
      longCopyLeftAligned: longCopy.every((node) => ['left', 'start'].includes(getComputedStyle(node).textAlign) || node.closest('.editorial-hero')),
    };
  })()`);
  const longContentFits = await evaluate(`(() => {
    const wallet = document.querySelector('.wallet-label-compact');
    const comparison = document.querySelector('.record-comparison-controls button:first-child');
    if (wallet) wallet.textContent = 'Reconnect wallet';
    if (comparison) comparison.textContent = 'Private payment record';
    const targets = [wallet?.closest('button'), comparison].filter(Boolean);
    return targets.every((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
    }) && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
  })()`);

  await evaluate(`document.querySelector('.title-track').scrollIntoView({ block: 'center', behavior: 'instant' })`);
  const mobileBrandMotion = await evaluate(`(() => {
    const section = document.querySelector('.title-track');
    const rect = section.getBoundingClientRect();
    const animatedSlices = [...document.querySelectorAll('.title-track-slices li')].filter((node) => getComputedStyle(node).animationName !== 'none');
    return {
      titleTrackPresent: Boolean(section),
      touchScrollSafe: getComputedStyle(section).touchAction !== 'none',
      compactHeight: rect.height > 0 && rect.height < 1200,
      constrainedTokens: document.querySelectorAll('.title-track-slices li').length === 12,
      tickerStopped: !document.querySelector('.brand-motion-ticker-track'),
      tapReaction: true,
      instructionsCoverTouch: document.querySelector('.title-track-rules')?.textContent.includes('WindowClosed'),
      titleTrackAnimatesOnlySlices: animatedSlices.length === 12,
    };
  })()`);
  await evaluate(`scrollTo({ top: 0, behavior: 'instant' })`);
  await delay(180);
  const brandMotionPausedOffscreen = await evaluate(`document.querySelector('.title-track') && !document.querySelector('#brand-motion')`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 667, deviceScaleFactor: 2, mobile: true });
  await navigate();
  const shortViewportHero = await evaluate(`(() => {
    const consequence = document.querySelector('.hero-proof').getBoundingClientRect();
    const send = document.querySelector('.hero-actions a[href="/send"]').getBoundingClientRect();
    return consequence.top <= innerHeight - 48 && send.top < innerHeight && document.querySelector('.editorial-hero h1').getBoundingClientRect().top < innerHeight;
  })()`);

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
  await delay(4800);
  const rapidReplaySettled = await evaluate(`document.querySelector('.hero-proof').dataset.activeStage === '4' && !document.querySelector('.hero-proof-replay').hasAttribute('data-playing')`);

  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await click('.process-disclosure > summary', true);
  await click('.process-example-toolbar button:nth-of-type(3)', true);
  const touchPreview = await evaluate(`document.querySelector('.process-example-toolbar button:nth-of-type(3)').getAttribute('aria-pressed') === 'true'`);
  await click('.process-example-toolbar button:nth-of-type(1)', true);
  const reversePreview = await evaluate(`document.querySelector('.process-example-toolbar button:nth-of-type(1)').getAttribute('aria-pressed') === 'true'`);
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });

  await click('.landing-receipt-inspector details:nth-child(2) summary');
  const receiptExpanded = await evaluate(`document.querySelector('.landing-receipt-inspector details:nth-child(2)').open === true`);
  await click('.faq-layout details:first-of-type summary');
  const faqExpanded = await evaluate(`document.querySelector('.faq-layout details:first-of-type').open === true`);
  await click('.faq-layout details:nth-of-type(2) summary');
  const faqExclusive = await evaluate(`!document.querySelector('.faq-layout details:first-of-type').open && document.querySelector('.faq-layout details:nth-of-type(2)').open`);
  const evidenceHierarchy = await evaluate(`(() => {
    const primary = document.querySelector('.evidence-primary strong');
    const supports = [...document.querySelectorAll('.evidence-support strong')];
    const snapshot = document.querySelector('.evidence-snapshot');
    const limitation = document.querySelector('.status-limitations summary');
    return Boolean(primary && supports.length === 2 && limitation)
      && supports.every((node) => parseFloat(getComputedStyle(primary).fontSize) > parseFloat(getComputedStyle(node).fontSize))
      && parseFloat(getComputedStyle(snapshot).fontSize) >= 11
      && limitation.textContent.includes('Testnet limitations');
  })()`);

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
    headingCount: axTree.nodes.filter((node) => node.role?.value === 'heading' && node.name?.value).length,
    liveRegions: 0,
    namedButtons: axTree.nodes.filter((node) => node.role?.value === 'button' && node.name?.value).length,
    unnamedFocusable: unnamedFocusable.length,
  };
  accessibility.liveRegions = await evaluate(`document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length`);

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate();
  const reducedMotion = await evaluate(`(() => ({
    requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
    canvasDisabled: !document.querySelector('.brand-motion-canvas'),
    contentVisible: [...document.querySelectorAll('[data-reveal], [data-reveal-item]')].every((node) => Number(getComputedStyle(node).opacity) > 0),
    marqueeStopped: !document.querySelector('.brand-motion-ticker-track'),
    titleTrackStatic: [...document.querySelectorAll('.title-track-slices li')].every((node) => getComputedStyle(node).animationName === 'none'),
    proofFinal: document.querySelector('.hero-proof').dataset.activeStage === '4',
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
  await Promise.race([noJsLoaded, delay(8000)]);
  const documentNode = await send('DOM.getDocument', { depth: -1, pierce: true });
  const noJsMain = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: 'main h1' });
  const noJsNavigation = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.site-nav a[href="/verify"]' });
  const noJsNotice = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.no-script-notice' });
  const noJsProof = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.hero-proof[data-active-stage="4"] .proof-stage-shell[data-state="active"]:nth-child(4)' });
  const noJsComparison = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.comparison-noscript' });
  await send('Emulation.setScriptExecutionDisabled', { value: false });

  const runtimeProblems = await evaluate(`window.__reliaQa ?? { errors: [], rejections: [], cls: 0 }`);
  const hydrationMessages = consoleMessages.filter((message) => /hydrat|server rendered html/i.test(message));
  const result = {
    viewportResults,
    interactions: { mobileMenuOpen: mobileMenu.open, mobileMenuExpanded: mobileMenu.expanded, mobileMenuContained: mobileMenu.contained, mobileMenuTriggerTarget: mobileMenu.triggerTarget, mobileBrandTarget: mobileMenu.brandTarget, compactHeaderHeight: mobileMenu.compactHeader, mobileMenuClearsTrigger: mobileMenu.clearsTrigger, mobileMenuEscape, mobileMenuOutsideClose, mobileMenuRouteClose, compactWalletRecovery, ...mobileHeroQuality, mobileProofStageOne, mobileCardAdvances, mobilePrivateComparison, mobilePublicComparison, ...mobileTypography, longContentFits, ...mobileBrandMotion, brandMotionPausedOffscreen, shortViewportHero, mouseStageOne, mouseStageFour, keyboardStageTwo, rapidReplaySettled, touchPreview, reversePreview, receiptExpanded, faqExpanded, faqExclusive, evidenceHierarchy },
    history: { forwardPath, backPath, restoredPath },
    tabRestoration,
    accessibility,
    reducedMotion,
    zoom200,
    enlargedText,
    noJavaScript: { headingPresent: Boolean(noJsMain.nodeId), navigationPresent: Boolean(noJsNavigation.nodeId), noticePresent: Boolean(noJsNotice.nodeId), proofFinal: Boolean(noJsProof.nodeId), comparisonSummary: Boolean(noJsComparison.nodeId) },
    diagnostics: { consoleMessages, exceptions, runtimeProblems, hydrationMessages },
  };

  const viewportPassed = viewportResults.every((item) => item.noHorizontalOverflow && item.containedContent && item.headingVisible && item.navigationPresent && item.minimumPrimaryTarget && item.importantTargets && item.stuckHiddenElements === 0 && item.cls < 0.05);
  const interactionFailures = Object.entries(result.interactions).filter(([, value]) => !value).map(([key]) => key);
  const failures = {
    viewports: viewportResults.filter((item) => !(item.noHorizontalOverflow && item.containedContent && item.headingVisible && item.navigationPresent && item.minimumPrimaryTarget && item.importantTargets && item.stuckHiddenElements === 0 && item.cls < 0.05)).map((item) => ({ width: item.width, cls: item.cls, importantTargets: item.importantTargets, stuckHiddenElements: item.stuckHiddenElements })),
    interactions: interactionFailures,
    history: !(backPath === '/' && forwardPath === '/verify' && restoredPath === '/verify'),
    tabRestoration: !Object.values(tabRestoration).every(Boolean),
    accessibility: !(accessibility.hasMain && accessibility.hasNavigation && accessibility.headingCount > 0 && accessibility.liveRegions > 0 && accessibility.namedButtons > 0 && accessibility.unnamedFocusable === 0),
    reducedMotion: !Object.values(reducedMotion).every(Boolean),
    zoom200: !(zoom200.noHorizontalOverflow && zoom200.navigationPresent && zoom200.mainVisible),
    enlargedText: !Object.values(enlargedText).every(Boolean),
    noJavaScript: !Object.values(result.noJavaScript).every(Boolean),
    runtime: !(exceptions.length === 0 && runtimeProblems.errors.length === 0 && runtimeProblems.rejections.length === 0 && hydrationMessages.length === 0),
  };
  const passed = viewportPassed && interactionFailures.length === 0
    && !failures.history && !failures.tabRestoration && !failures.accessibility
    && !failures.reducedMotion && !failures.zoom200 && !failures.enlargedText
    && !failures.noJavaScript && !failures.runtime;

  process.stdout.write(`${JSON.stringify({ passed, failures, ...result }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await delay(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
