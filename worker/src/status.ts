import { createServer, type Server } from 'node:http';
import { subscribeToStageEvents, type PublicStageEvent } from './stages.js';

const MAX_EVENTS = 500;

function pairKey(event: PublicStageEvent): string {
  return `${event.assetId.toLowerCase()}:${event.n}`;
}

function matches(event: PublicStageEvent, assetId: string, n: number | null): boolean {
  if (assetId && event.assetId.toLowerCase() !== assetId) return false;
  if (n !== null && event.n !== n) return false;
  return true;
}

function safeForPublic(event: PublicStageEvent): PublicStageEvent {
  if (!('error' in event) || !event.error || event.rule) return event;
  return {
    ...event,
    error: /not ready yet|retrying/i.test(event.error)
      ? 'Attestation is not ready yet; the worker will retry.'
      : 'The worker could not advance this proof and will retry when possible.',
  };
}

/**
 * A deliberately read-only view of the worker's public progress.
 * It exposes no signer address, key material, proof payload, or submission route.
 */
export function startProofStatusServer(
  port: number,
  allowedOrigin: string,
  initialEvents: PublicStageEvent[] = [],
): Server {
  const events: PublicStageEvent[] = initialEvents.slice(-MAX_EVENTS);
  subscribeToStageEvents((event) => {
    events.push(event);
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  });

  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (request.method !== 'GET') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET');
      response.end(JSON.stringify({ error: 'Read-only endpoint. Use GET.' }));
      return;
    }

    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (url.pathname === '/health') {
      response.end(JSON.stringify({ online: true, observedEvents: events.length }));
      return;
    }
    if (url.pathname !== '/status') {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const assetId = (url.searchParams.get('assetId') ?? '').toLowerCase();
    const payTx = (url.searchParams.get('payTx') ?? '').toLowerCase();
    const rawSlice = url.searchParams.get('n');
    const parsedSlice = rawSlice === null ? null : Number(rawSlice);
    const n = parsedSlice !== null && Number.isInteger(parsedSlice) ? parsedSlice : null;
    const paymentPairs = payTx
      ? new Set(events.filter((event) => typeof event.detail?.payTx === 'string' && event.detail.payTx.toLowerCase() === payTx).map(pairKey))
      : null;
    const filtered = events.filter((event) => matches(event, assetId, n) && (!paymentPairs || paymentPairs.has(pairKey(event)))).slice(-50).map(safeForPublic);

    response.end(JSON.stringify({ online: true, updatedAt: new Date().toISOString(), events: filtered }));
  });

  server.listen(port, '0.0.0.0');
  return server;
}
