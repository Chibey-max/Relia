import Link from 'next/link';
import { explorers } from '@/lib/chain';
import { PROJECT_EVIDENCE } from '@/lib/projectFacts';
import { MaterialIcon } from '@/components/MaterialIcon';
import { Badge, Button, TransactionField, AddressField, IdentifierField } from '@/components/ui';

const judgeSteps = [
  ['01', 'Open the proven receipt', 'Start with the completed cross-chain proof. No wallet is required.'],
  ['02', 'Try the live flow', 'Pay and acknowledge a new slice on Sepolia when the worker is online.'],
  ['03', 'Inspect the title', 'Confirm the public title state and source facts on Creditcoin.'],
] as const;

export default function JudgePage() {
  return (
    <main className="judge-main">
      <section className="judge-hero" data-reveal>
        <div>
          <Badge tone="live">Judge path</Badge>
          <h1>Verify Relia in two minutes.</h1>
          <p className="lead">
            Relia proves a Sepolia installment and shop acknowledgement on Creditcoin, then updates a public title slice. The completed proof below is live testnet evidence, not sample data.
          </p>
          <div className="judge-actions">
            <Button href={`/verify/${PROJECT_EVIDENCE.paymentTx}`}>Open proven receipt <MaterialIcon name="arrow_forward" /></Button>
            <Button variant="secondary" href={`/send?assetId=${PROJECT_EVIDENCE.assetId}&slice=2`}>Try live slice 2</Button>
          </div>
        </div>
        <aside className="judge-verdict" aria-label="Submission verdict">
          <span className="material-symbols-rounded" aria-hidden="true">verified</span>
          <strong>Cross-chain proof accepted</strong>
          <p>Sepolia facts were consumed by Creditcoin transaction {PROJECT_EVIDENCE.creditcoinProofBlock}.</p>
        </aside>
      </section>

      <section className="judge-grid" aria-labelledby="judge-flow-title" data-reveal>
        <div className="judge-panel judge-flow-panel">
          <h2 id="judge-flow-title">Best demo order</h2>
          <ol className="judge-step-list">
            {judgeSteps.map(([number, title, body]) => (
              <li key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="judge-panel">
          <h2>Why it fits BUIDL CTC</h2>
          <div className="judge-fit-list">
            <p><MaterialIcon name="receipt_long" /><span>Real-world installment records become public title receipts.</span></p>
            <p><MaterialIcon name="hub" /><span>Payments stay on Sepolia while proof and title state live on Creditcoin.</span></p>
            <p><MaterialIcon name="lock" /><span>No bridged funds, no custodial account, no hidden trust step.</span></p>
          </div>
        </div>
      </section>

      <section className="judge-evidence" aria-labelledby="judge-evidence-title" data-reveal>
        <div className="judge-evidence-head">
          <div>
            <Badge tone="live">Live evidence</Badge>
            <h2 id="judge-evidence-title">Source facts and proof transaction.</h2>
          </div>
          <Link href="/verify" className="text-action">Receipt index <MaterialIcon name="open_in_new" /></Link>
        </div>
        <div className="judge-evidence-grid">
          <div className="judge-asset-card">
            <IdentifierField kind="identifier" label="Asset ID" value={PROJECT_EVIDENCE.assetId} />
            <Link href={`/assets/${PROJECT_EVIDENCE.assetId}`} className="text-action">Open asset record <MaterialIcon name="arrow_forward" /></Link>
          </div>
          <AddressField label="Shop on Sepolia" value={PROJECT_EVIDENCE.shopSepolia} explorerHref={explorers.sepoliaAddress(PROJECT_EVIDENCE.shopSepolia)} />
          <AddressField label="Buyer" value={PROJECT_EVIDENCE.buyer} explorerHref={explorers.sepoliaAddress(PROJECT_EVIDENCE.buyer)} />
          <TransactionField label="Sepolia payment" value={PROJECT_EVIDENCE.paymentTx} explorerHref={explorers.sepoliaTx(PROJECT_EVIDENCE.paymentTx)} explorerLabel="View payment" />
          <TransactionField label="Sepolia acknowledgement" value={PROJECT_EVIDENCE.acknowledgementTx} explorerHref={explorers.sepoliaTx(PROJECT_EVIDENCE.acknowledgementTx)} explorerLabel="View acknowledgement" />
          <TransactionField label="Creditcoin proof" value={PROJECT_EVIDENCE.creditcoinProofTx} explorerHref={explorers.creditcoinTx(PROJECT_EVIDENCE.creditcoinProofTx)} explorerLabel="View proof" />
        </div>
      </section>
    </main>
  );
}
