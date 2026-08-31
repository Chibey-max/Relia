'use client';

/**
 * The pipeline rail.
 *
 * The attestation wait is minutes long, and a spinner makes it look like a
 * hang. This renders each stage with the real hash or block number it resolved,
 * so the wait becomes the most legible part of the demo rather than dead air.
 *
 * Fed by the worker's JSON-line stage events. The Attestcoin stages are marked
 * so they read as protocol steps, not app steps.
 */

export type StageName =
  | 'sepolia_mined'
  | 'block_finalized'
  | 'attested'
  | 'ack_located'
  | 'proof_generated'
  | 'verified'
  | 'title_ticked';

export interface StageEvent {
  stage: StageName | 'error';
  assetId: string;
  n: number;
  at: string;
  detail?: Record<string, string | number | boolean | null>;
  error?: string;
  rule?: string;
}

interface StageSpec {
  name: StageName;
  label: string;
  attestcoin: boolean;
}

/**
 * The `attested` row is the one Gate 1 could have removed. It is a separate
 * entry rather than text baked into another row precisely so it can be dropped
 * without disturbing the rest of the rail.
 */
export const STAGES: StageSpec[] = [
  { name: 'sepolia_mined', label: 'Payment mined on Sepolia', attestcoin: false },
  { name: 'ack_located', label: 'Shop acknowledgement located', attestcoin: false },
  { name: 'block_finalized', label: 'Block finalized', attestcoin: false },
  { name: 'attested', label: 'Height attested', attestcoin: true },
  { name: 'proof_generated', label: 'Batch proof generated (2 queries, 1 continuity proof)', attestcoin: true },
  { name: 'verified', label: 'Verified by Block Prover on Creditcoin', attestcoin: true },
  { name: 'title_ticked', label: 'Title slice ticked', attestcoin: false },
];

function detailLine(e: StageEvent): string {
  if (!e.detail) return '';
  return Object.entries(e.detail)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('  ·  ');
}

export function PipelineRail({ events }: { events: StageEvent[] }) {
  const byStage = new Map<string, StageEvent>();
  for (const e of events) byStage.set(e.stage, e);

  const failed = events.find((e) => e.error);

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, fontFamily: 'monospace' }}>
      {STAGES.map((s) => {
        const hit = byStage.get(s.name);
        const state = hit ? (hit.error ? 'failed' : 'done') : 'pending';

        return (
          <li
            key={s.name}
            style={{
              padding: '8px 0',
              borderLeft: '3px solid',
              borderLeftColor:
                state === 'done' ? '#137333' : state === 'failed' ? '#b00020' : '#ccc',
              paddingLeft: 10,
              marginBottom: 4,
              opacity: state === 'pending' ? 0.55 : 1,
            }}
          >
            <div>
              {state === 'done' ? '✓' : state === 'failed' ? '✕' : '·'} {s.label}
              {s.attestcoin && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>[Attestcoin]</span>
              )}
            </div>
            {hit && (
              <div style={{ fontSize: 12, color: '#444', marginTop: 2, wordBreak: 'break-all' }}>
                {hit.error ?? detailLine(hit)}
              </div>
            )}
          </li>
        );
      })}

      {failed?.rule && (
        <li style={{ marginTop: 12 }}>
          <RefusalNotice rule={failed.rule} sentence={failed.error ?? ''} />
        </li>
      )}
    </ol>
  );
}

/**
 * A refusal is a designed state that names the rule that fired. Never a raw
 * revert string, never a toast: the whole product claim is that Relia refuses
 * for stated reasons, so the reason is the interface.
 */
export function RefusalNotice({ rule, sentence }: { rule: string; sentence: string }) {
  return (
    <div
      style={{
        border: '2px solid #b00020',
        background: '#fff5f5',
        padding: 12,
        maxWidth: 620,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Refused — {rule}</div>
      <div style={{ fontSize: 14 }}>{sentence}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
        This is a rule the contract enforces on-chain, not a client-side check.
      </div>
    </div>
  );
}
