'use client';

import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { ExperienceMode } from '@/components/ExperienceMode';
import { MaterialIcon } from '@/components/MaterialIcon';
import { Card, Stamp } from '@/components/ui';
import { DEMO_DISCLOSURE, DEMO_RECEIPT } from '@/lib/demoData';

function SampleIdentifier({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  const display = value.length > 24 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
  return (
    <div className="landing-receipt-identifier">
      <span>{label}</span>
      <code title={value}>{display}</code>
      <CopyButton value={value} label={copyLabel} />
    </div>
  );
}

export function LandingReceipt() {
  return (
    <Card
      as="article"
      variant="proof"
      className="public-receipt landing-receipt"
      data-scroll-story="receipt"
      aria-label="Illustrative installment receipt"
    >
      <header className="receipt-verdict" data-scroll-item>
        <div>
          <span className="mini-title">ILLUSTRATIVE RECEIPT | SAMPLE DATA</span>
          <ExperienceMode>{DEMO_DISCLOSURE}</ExperienceMode>
          <strong>Slice {String(DEMO_RECEIPT.slice).padStart(2, '0')} of {DEMO_RECEIPT.totalSlices} is live</strong>
          <p>This specimen shows how a verified receipt is organized. It is not a live chain record.</p>
        </div>
        <Stamp className="stamp"><MaterialIcon name="check" /> LIVE</Stamp>
      </header>

      <div className="receipt-summary" role="group" aria-label="Sample receipt summary" data-scroll-item>
        <div><span>Asset</span><strong>{DEMO_RECEIPT.assetName}</strong></div>
        <div><span>Amount</span><strong>{DEMO_RECEIPT.amount}</strong></div>
        <div><span>Buyer</span><strong>{DEMO_RECEIPT.buyer}</strong></div>
      </div>

      <div className="landing-receipt-inspector" role="group" aria-label="Inspect sample receipt evidence" data-scroll-item>
        <details>
          <summary>
            <span><strong>Payment evidence</strong><small>Sepolia source fact</small></span>
            <span className="receipt-inspector-plus" aria-hidden="true"><MaterialIcon name="add" /></span>
          </summary>
          <div className="receipt-inspector-panel">
            <div className="receipt-inspector-panel-inner">
              <SampleIdentifier label="Sample payment transaction" value={DEMO_RECEIPT.paymentHash} copyLabel="Copy sample payment hash" />
              <dl>
                <div><dt>Block</dt><dd>{DEMO_RECEIPT.paymentBlock}</dd></div>
                <div><dt>Payer</dt><dd>{DEMO_RECEIPT.buyer}</dd></div>
                <div><dt>Meaning</dt><dd>Installment 04 was sent for this asset.</dd></div>
              </dl>
            </div>
          </div>
        </details>

        <details>
          <summary>
            <span><strong>Shop acknowledgement</strong><small>Sepolia matching fact</small></span>
            <span className="receipt-inspector-plus" aria-hidden="true"><MaterialIcon name="add" /></span>
          </summary>
          <div className="receipt-inspector-panel">
            <div className="receipt-inspector-panel-inner">
              <SampleIdentifier label="Sample acknowledgement transaction" value={DEMO_RECEIPT.acknowledgementHash} copyLabel="Copy sample acknowledgement hash" />
              <dl>
                <div><dt>Block</dt><dd>{DEMO_RECEIPT.acknowledgementBlock}</dd></div>
                <div><dt>Shop</dt><dd>{DEMO_RECEIPT.shop}</dd></div>
                <div><dt>Meaning</dt><dd>The shop cited the exact payment above.</dd></div>
              </dl>
            </div>
          </div>
        </details>

        <details>
          <summary>
            <span><strong>Title evidence</strong><small>Creditcoin public result</small></span>
            <span className="receipt-inspector-plus" aria-hidden="true"><MaterialIcon name="add" /></span>
          </summary>
          <div className="receipt-inspector-panel">
            <div className="receipt-inspector-panel-inner">
              <SampleIdentifier label="Sample asset ID" value={DEMO_RECEIPT.assetId} copyLabel="Copy sample asset ID" />
              <div className="landing-receipt-title-row">
                <div><span>Title progress</span><strong>{String(DEMO_RECEIPT.slice).padStart(2, '0')} of {DEMO_RECEIPT.totalSlices}</strong></div>
                <div className="landing-receipt-slices" role="img" aria-label={`${DEMO_RECEIPT.slice} of ${DEMO_RECEIPT.totalSlices} sample title slices complete`}>
                  {Array.from({ length: DEMO_RECEIPT.totalSlices }, (_, index) => <i className={index < DEMO_RECEIPT.slice ? 'filled' : ''} key={index} />)}
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <footer className="receipt-final landing-receipt-footer" data-scroll-item>
        <span>Sample only. Real receipts expose their source transactions.</span>
        <Link href="/verify">Verify a real receipt <MaterialIcon name="arrow_forward" /></Link>
      </footer>
    </Card>
  );
}
