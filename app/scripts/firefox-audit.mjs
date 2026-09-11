import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/';
const port = 4445;
const driver = spawn(process.env.GECKODRIVER_PATH ?? 'geckodriver', ['--port', String(port)], { stdio: 'ignore' });
const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function request(path, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) throw new Error(payload.value?.message ?? `WebDriver ${method} ${path} failed`);
  return payload.value;
}

async function waitForDriver() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const status = await request('/status');
      if (status.ready) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError ?? new Error('Geckodriver did not become ready');
}

async function createSession(preferences = {}) {
  const value = await request('/session', 'POST', {
    capabilities: {
      alwaysMatch: {
        browserName: 'firefox',
        acceptInsecureCerts: true,
        'moz:firefoxOptions': {
          args: ['-headless'],
          prefs: {
            'browser.tabs.warnOnClose': false,
            ...preferences,
          },
        },
      },
    },
  });
  return value.sessionId;
}

async function execute(sessionId, script, args = []) {
  return request(`/session/${sessionId}/execute/sync`, 'POST', { script, args });
}

async function closeSession(sessionId) {
  if (sessionId) await request(`/session/${sessionId}`, 'DELETE').catch(() => {});
}

let sessionId;
let reducedSessionId;
let noJsSessionId;
try {
  await waitForDriver();
  sessionId = await createSession();
  const viewports = [];
  for (const width of [390, 1280]) {
    await request(`/session/${sessionId}/window/rect`, 'POST', { width, height: 900, x: 0, y: 0 });
    await request(`/session/${sessionId}/url`, 'POST', { url: targetUrl });
    await delay(700);
    viewports.push(await execute(sessionId, `return {
      requestedWidth: ${width},
      width: innerWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      headingVisible: Boolean(document.querySelector('main h1')),
      navigationPresent: Boolean(document.querySelector('.site-nav')),
      sampleDisclosure: document.body.textContent.includes('Interactive example | sample data | no wallet'),
    };`));
  }

  await execute(sessionId, `
    const stage = document.querySelector('.proof-stage-shell:nth-child(2) .proof-paper');
    stage.click();
    const process = document.querySelector('.process-example-toolbar button:nth-of-type(3)');
    process.click();
    const receipt = document.querySelector('.landing-receipt-inspector details:nth-child(2) summary');
    receipt.click();
    const faq = document.querySelector('.faq-layout details:first-of-type summary');
    faq.click();
    return true;
  `);
  await delay(120);
  const interactions = await execute(sessionId, `return {
    heroStage: document.querySelector('.proof-stage-shell:nth-child(2) .proof-paper').getAttribute('aria-pressed') === 'true',
    processPreview: document.querySelector('.process-example-toolbar button:nth-of-type(3)').getAttribute('aria-pressed') === 'true',
    receiptExpanded: document.querySelector('.landing-receipt-inspector details:nth-child(2)').open === true,
    faqExpanded: document.querySelector('.faq-layout details:first-of-type').open === true,
  };`);

  await closeSession(sessionId);
  sessionId = undefined;

  reducedSessionId = await createSession({ 'ui.prefersReducedMotion': 1 });
  await request(`/session/${reducedSessionId}/url`, 'POST', { url: targetUrl });
  await delay(500);
  const reducedMotion = await execute(reducedSessionId, `return {
    requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
    contentVisible: [...document.querySelectorAll('[data-reveal], [data-reveal-item]')].every((node) => Number(getComputedStyle(node).opacity) > 0),
    canvasDisabled: getComputedStyle(document.querySelector('.brand-motion-canvas')).display === 'none',
  };`);

  await closeSession(reducedSessionId);
  reducedSessionId = undefined;

  noJsSessionId = await createSession({ 'javascript.enabled': false });
  await request(`/session/${noJsSessionId}/url`, 'POST', { url: targetUrl });
  const source = await request(`/session/${noJsSessionId}/source`);
  const noJavaScript = {
    headingPresent: source.includes('Pay in slices.'),
    navigationPresent: source.includes('href="/verify"'),
    noticePresent: source.includes('JavaScript is off.'),
  };

  const passed = viewports.every((item) => Object.values(item).every(Boolean))
    && Object.values(interactions).every(Boolean)
    && Object.values(reducedMotion).every(Boolean)
    && Object.values(noJavaScript).every(Boolean);
  process.stdout.write(`${JSON.stringify({ passed, engine: 'Firefox', viewports, interactions, reducedMotion, noJavaScript }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  await closeSession(noJsSessionId);
  await closeSession(reducedSessionId);
  await closeSession(sessionId);
  driver.kill('SIGTERM');
}
