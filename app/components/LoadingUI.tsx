import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { MaterialIcon } from '@/components/MaterialIcon';
import { Button } from '@/components/ui/Surface';
import { Container, Stack } from '@/components/ui/Layout';

export function ProofPath({ active = 0 }: { active?: number }) {
  const steps = ['Payment', 'Acknowledgement', 'Proof', 'Title'];
  return (
    <div className="loading-proof-path" aria-hidden="true" data-motion-loop data-motion-active="false">
      {steps.map((step, index) => (
        <div className={index === active ? 'is-active' : index < active ? 'is-done' : ''} key={step}>
          <i>{index < active ? <MaterialIcon name="check" /> : String(index + 1).padStart(2, '0')}</i>
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

export function LoadingMessage({
  children,
  slow,
  network,
}: {
  children: ReactNode;
  slow?: boolean;
  network?: string;
}) {
  return (
    <div className="loading-message" role="status" aria-live="polite">
      <span>{children}</span>
      {slow && <small>{network ? `${network} is taking longer than usual. The public testnet may be busy.` : 'This is taking longer than usual.'}</small>}
    </div>
  );
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <span className="skeleton-line" style={{ width }} data-motion-loop data-motion-active="false" />;
}

export function PanelSkeleton({ rows = 4 }: { rows?: number; label?: string }) {
  return (
    <div className="panel-skeleton" aria-hidden="true">
      <SkeletonLine width="32%" />
      <SkeletonLine width="72%" />
      {Array.from({ length: rows }, (_, index) => <SkeletonLine width={index % 2 ? '88%' : '100%'} key={index} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6, labels = [] }: { rows?: number; columns?: number; labels?: string[] }) {
  return (
    <div className="table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => (
        <div className="table-skeleton-row" style={{ '--skeleton-columns': columns } as CSSProperties} key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <div className="table-skeleton-cell" key={column}>
              {labels[column] && <small>{labels[column]}</small>}
              <SkeletonLine width={column === 0 ? '82%' : column % 2 ? '66%' : '54%'} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingButton({
  loading,
  loadingLabel,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading: boolean; loadingLabel: string }) {
  const variant = className.includes('danger') ? 'danger' : className.includes('secondary') ? 'secondary' : loading ? 'loading' : 'primary';
  return (
    <Button {...props} className={`loading-button ${className}`.trim()} variant={variant} busy={loading} busyLabel={loadingLabel}>{children}</Button>
  );
}

export function ProgressStatus({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="transaction-progress" role="status" aria-live="polite" aria-atomic="true">
      <span className="transaction-progress-mark" aria-hidden="true" data-motion-loop data-motion-active="false" />
      <div><strong>{label}</strong>{detail && <small>{detail}</small>}</div>
    </div>
  );
}

export function ReceiptSkeleton({ paymentHash }: { paymentHash?: string }) {
  return (
    <div className="receipt-skeleton" aria-hidden="true">
      <div className="receipt-skeleton-verdict"><span className="skeleton-orb" data-motion-loop data-motion-active="false" /><div><SkeletonLine width="132px" /><SkeletonLine width="260px" /></div></div>
      {paymentHash && <code>{paymentHash}</code>}
      <div className="receipt-skeleton-summary"><PanelSkeleton rows={1} /><PanelSkeleton rows={1} /><PanelSkeleton rows={1} /></div>
      <div className="receipt-skeleton-facts"><PanelSkeleton rows={2} /><PanelSkeleton rows={2} /></div>
      <PanelSkeleton rows={4} />
    </div>
  );
}

export function TitleSkeleton() {
  return (
    <div className="title-skeleton" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div className="slice-skeleton" data-motion-loop data-motion-active="false" key={index}><span>{String(index + 1).padStart(2, '0')}</span><SkeletonLine width="58%" /><SkeletonLine width="36%" /></div>
      ))}
    </div>
  );
}

export function RouteLoading() {
  return (
    <main className="route-loading" aria-busy="true">
      <Container size="reading" className="route-loading-card">
        <Stack gap={4}>
          <div className="eyebrow"><span className="dot" />Building the next view</div>
          <h1>Following the proof.</h1>
          <LoadingMessage>Loading this Relia page...</LoadingMessage>
          <ProofPath active={2} />
        </Stack>
      </Container>
    </main>
  );
}
