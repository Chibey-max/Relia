import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { subscribeToStageEvents, type PublicStageEvent } from './stages.js';

const MAX_EVENTS = 500;

export interface StoredSeen {
  txHash: string;
  blockNumber: number;
}

export interface StoredPair {
  assetId: string;
  n: number;
  pay?: StoredSeen;
  ack?: StoredSeen;
  proofTxHash?: string;
  proofRetryAfter?: number;
  done?: boolean;
}

export interface WorkerStateSnapshot {
  cursor: number;
  pairs: StoredPair[];
  events: PublicStageEvent[];
}

export async function loadWorkerState(path: string): Promise<WorkerStateSnapshot | null> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<WorkerStateSnapshot>;
    return {
      cursor: Number.isInteger(parsed.cursor) ? Number(parsed.cursor) : 0,
      pairs: Array.isArray(parsed.pairs) ? parsed.pairs.filter(isStoredPair) : [],
      events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS) as PublicStageEvent[] : [],
    };
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'ENOENT') return null;
    throw error;
  }
}

export function createWorkerStateStore(
  path: string,
  initialEvents: PublicStageEvent[],
  snapshot: () => Omit<WorkerStateSnapshot, 'events'>,
) {
  const events = initialEvents.slice(-MAX_EVENTS);
  let saveTimer: NodeJS.Timeout | null = null;
  let saving = false;
  let pending = false;

  const saveSoon = () => {
    pending = true;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void flush();
    }, 100);
  };

  const unsubscribe = subscribeToStageEvents((event) => {
    events.push(event);
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    saveSoon();
  });

  async function flush(): Promise<void> {
    if (saving) return;
    if (!pending) return;
    pending = false;
    saving = true;
    try {
      const payload: WorkerStateSnapshot = { ...snapshot(), events };
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      await writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`);
      await rename(tmp, path);
    } finally {
      saving = false;
      if (pending) void flush();
    }
  }

  return {
    events,
    markDirty: saveSoon,
    flush,
    close: () => {
      if (saveTimer) clearTimeout(saveTimer);
      unsubscribe();
      return flush();
    },
  };
}

function isStoredPair(value: unknown): value is StoredPair {
  if (!value || typeof value !== 'object') return false;
  const pair = value as Partial<StoredPair>;
  return typeof pair.assetId === 'string' && Number.isInteger(pair.n);
}
