import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] ?? 'http://localhost:3000/';
const throttled = process.argv.includes('--throttled');
const saveData = process.argv.includes('--save-data');
const port = 9333;
const profile = await mkdtemp(join(tmpdir(), 'relia-perf-'));
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
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
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message));
      else handler?.resolve(message.result);
      return;
    }
    const handlers = eventWaiters.get(message.method);
    if (!handlers?.length) return;
    handlers.splice(0).forEach((resolve) => resolve(message.params));
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

  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Performance.enable')]);
  if (throttled) {
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
      connectionType: 'cellular3g',
    });
  }

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      ${saveData ? `try {
        Object.defineProperty(navigator, 'connection', {
          configurable: true,
          value: { saveData: true },
        });
      } catch {}` : ''}
      window.__reliaPerformance = { cls: 0, longTasks: [], events: [] };
      try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__reliaPerformance.cls += entry.value;
      })).observe({ type: 'layout-shift', buffered: true }); } catch {}
      try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        window.__reliaPerformance.longTasks.push(entry.duration);
      })).observe({ type: 'longtask', buffered: true }); } catch {}
      try { new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        window.__reliaPerformance.events.push(entry.duration);
      })).observe({ type: 'event', buffered: true, durationThreshold: 16 }); } catch {}
    `,
  });

  const loaded = waitForEvent('Page.loadEventFired');
  await send('Page.navigate', { url: targetUrl });
  await loaded;
  await delay(throttled ? 5000 : 2200);

  const rectResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const node = document.querySelector('.hero-proof-replay');
      if (!node) return null;
      node.scrollIntoView({ block: 'center' });
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    returnByValue: true,
  });
  const point = rectResult.result.value;
  if (point && point.y >= 0 && point.y <= (throttled ? 844 : 900)) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(800);
  }

  const [pageMetrics, performanceMetrics] = await Promise.all([
    send('Runtime.evaluate', {
      expression: `(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const scripts = performance.getEntriesByType('resource').filter((entry) => entry.initiatorType === 'script');
        const measurements = window.__reliaPerformance;
        return {
          url: location.href,
          mode: ${JSON.stringify(saveData ? 'save-data-fallback' : throttled ? 'mobile-4x-cpu-fast-3g' : 'desktop')},
          domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
          loadMs: Math.round(navigation.loadEventEnd),
          transferredScriptKb: Math.round(scripts.reduce((sum, entry) => sum + entry.transferSize, 0) / 1024),
          decodedScriptKb: Math.round(scripts.reduce((sum, entry) => sum + entry.decodedBodySize, 0) / 1024),
          cls: Number(measurements.cls.toFixed(4)),
          longTaskCount: measurements.longTasks.length,
          longTaskTotalMs: Math.round(measurements.longTasks.reduce((sum, value) => sum + value, 0)),
          maxInteractionDurationMs: Math.round(Math.max(0, ...measurements.events)),
          domNodes: document.getElementsByTagName('*').length,
          saveDataEnabled: navigator.connection?.saveData === true,
          brandCanvasDisplayNone: getComputedStyle(document.querySelector('.brand-motion-canvas')).display === 'none',
          primaryNavigationPresent: Boolean(document.querySelector('nav a[href="/send"]')),
          mainContentPresent: Boolean(document.querySelector('main h1')),
        };
      })()`,
      returnByValue: true,
    }),
    send('Performance.getMetrics'),
  ]);
  const browserMetrics = Object.fromEntries(performanceMetrics.metrics.map(({ name, value }) => [name, value]));
  const output = {
    ...pageMetrics.result.value,
    taskTimeMs: Math.round((browserMetrics.TaskDuration ?? 0) * 1000),
    scriptTimeMs: Math.round((browserMetrics.ScriptDuration ?? 0) * 1000),
    layoutTimeMs: Math.round((browserMetrics.LayoutDuration ?? 0) * 1000),
    styleTimeMs: Math.round((browserMetrics.RecalcStyleDuration ?? 0) * 1000),
    jsHeapMb: Number(((browserMetrics.JSHeapUsedSize ?? 0) / 1024 / 1024).toFixed(1)),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
