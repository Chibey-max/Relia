'use client';

/**
 * The pipeline rail.
 *
 * The attestation wait is minutes long, and a spinner makes it look like a
 * hang. This renders each stage with the real hash or block number it resolved,
 * so the wait becomes the most legible part of the demo rather than dead air.
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
  const done = STAGES.filter((s) => byStage.get(s.name) && !byStage.get(s.name)?.error).length;

  return (
    <div>
      <div className="mono muted-text pipeline-count">{done} of {STAGES.length} stages</div>
      <ol className="pipeline">
        {STAGES.map((s, index) => {
          const hit = byStage.get(s.name);
          const state = hit ? (hit.error ? 'failed' : 'done') : (!failed && index === done ? 'active' : 'pending');
          return (
            <li key={s.name} className={`pipeline-item ${state}`} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="pipeline-marker">{state === 'done' ? '✓' : state === 'failed' ? '✕' : String(index + 1).padStart(2, '0')}</span>
              <div>
                <div className="pipeline-label">
                  {s.label}
                  {s.attestcoin && <span className="attestcoin-tag">ATTESTCOIN</span>}
                </div>
                {hit && <div className="pipeline-detail">{hit.error ?? detailLine(hit)}</div>}
              </div>
            </li>
          );
        })}
      </ol>

      {failed?.rule && (
        <div className="pipeline-refusal">
          <RefusalNotice rule={failed.rule} sentence={failed.error ?? ''} />
        </div>
      )}
    </div>
  );
}

/**
 * A refusal is a designed state that names the rule that fired. Never a raw
 * revert string, never a toast: the whole product claim is that Relia refuses
 * for stated reasons, so the reason is the interface.
 */
export function RefusalNotice({ rule, sentence }: { rule: string; sentence: string }) {
  return (
    <div className="notice error">
      <span className="status-badge status-shortfall">✕ {rule}</span>
      <p className="notice-message">{sentence}</p>
      <p className="aside-note notice-recovery">
        This is a rule the contract enforces on-chain, not a client-side check.
      </p>
    </div>
  );
}
