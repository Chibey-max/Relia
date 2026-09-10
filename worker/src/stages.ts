/**
 * Structured stage events.
 *
 * The attestation wait is the longest part of the pipeline and the least
 * legible — from outside it looks like a hung process. These events exist so
 * the frontend can render it as a rail of real hashes and block numbers
 * resolving one by one, which turns the wait into the most convincing part of
 * the demo instead of a spinner.
 *
 * Emitted as JSON lines on stdout. One line, one stage, always parseable.
 */

export type StageName =
  | 'sepolia_mined'
  | 'proof_queued'
  | 'block_finalized'
  | 'attested'
  | 'ack_located'
  | 'proof_generated'
  | 'proof_submitted'
  | 'verified'
  | 'title_ticked';

export interface StageEvent {
  stage: StageName;
  assetId: string;
  n: number;
  at: string;
  /** Whatever this stage actually resolved: a hash, a height, a count. */
  detail: Record<string, string | number | boolean | null>;
}

/** A failure is a first-class stage, not a stack trace. */
export interface StageError {
  stage: StageName | 'error';
  assetId: string;
  n: number;
  at: string;
  error: string;
  /** The named contract error where we could recover one. */
  rule?: string;
  detail?: Record<string, string | number | boolean | null>;
}

export type PublicStageEvent = StageEvent | StageError;

const listeners = new Set<(event: PublicStageEvent) => void>();

/** Allows read-only observers to mirror public progress without gaining access to the signer. */
export function subscribeToStageEvents(listener: (event: PublicStageEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emit(event: StageEvent | StageError): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
  for (const listener of listeners) listener(event);
}

export function stage(
  name: StageName,
  assetId: string,
  n: number,
  detail: StageEvent['detail'],
): void {
  emit({ stage: name, assetId, n, at: new Date().toISOString(), detail });
}

export function failure(
  name: StageName | 'error',
  assetId: string,
  n: number,
  error: unknown,
  rule?: string,
): void {
  emit({
    stage: name,
    assetId,
    n,
    at: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    rule,
  });
}

/** Human-readable log that never pollutes the JSON-lines stream on stdout. */
export function log(...args: unknown[]): void {
  process.stderr.write(`${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`);
}
