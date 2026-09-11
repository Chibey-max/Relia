import Link from 'next/link';
import { TitleTrack } from '@/components/TitleTrack';
import { HeroProof } from '@/components/HeroProof';
import { LandingReceipt } from '@/components/LandingReceipt';
import { ProcessJourney } from '@/components/ProcessJourney';
import { RecordComparison } from '@/components/RecordComparison';
import { MaterialIcon } from '@/components/MaterialIcon';
import { Button, DrawnLoop, Grid, RecordStateBadge, Section, Starburst, StatusIndicator } from '@/components/ui';
import { RECORD_STATE_KEYS } from '@/lib/recordStates';
import { CountUp } from '@/components/CountUp';
import { contractConfiguration } from '@/lib/chain';
import { DEMO_PROCESS } from '@/lib/demoData';
import { PROJECT_EVIDENCE } from '@/lib/projectFacts';

const FAQS = [
  ['Does Relia move money between chains?', 'No. Payments stay on Sepolia. Creditcoin receives proof, not funds.'],
  ['What if the shop stays silent?', 'A proven payment becomes Disputed, so the shop cannot reclaim it.'],
  ['Do I need a wallet to read a receipt?', 'No. A wallet is required only when writing to a chain.'],
];

export default function LandingPage() {
  return (
    <main className="landing-main refreshed-landing">
      <Section spacing="none" tone="transparent" composition="open" className="landing-hero editorial-hero landing-section-narrative">
        <Starburst className="starburst hero-star" />
        <Starburst color="live" className="starburst green hero-star-green" />
        <div className="landing-kicker" data-hero-reveal><span className="dot" />PUBLIC TITLE FROM REAL PAYMENTS</div>
        <h1 data-hero-reveal>
          Pay in slices. Leave with a record{' '}
          <span className="highlight">nobody can rewrite</span>
        </h1>
        <p className="hero-copy" data-hero-reveal>
          Every confirmed installment becomes a title slice the buyer keeps and anyone can check.
        </p>
        <div className="hero-action-block" data-hero-reveal>
          <div className="hero-actions">
            <Button href="/send">Send an installment <MaterialIcon name="arrow_forward" /></Button>
            <Link className="text-action" href="/verify">Verify a public receipt <MaterialIcon name="open_in_new" /></Link>
          </div>
          <p className="reading-note"><StatusIndicator tone="live" label="Reading is public. Writing needs a wallet." /></p>
        </div>
        <HeroProof />
      </Section>

      <Section spacing="none" tone="transparent" composition="open" className="editorial-section problem-story landing-section-narrative" data-reveal data-reveal-group>
        <div className="section-index" data-reveal-item>01 | THE PROBLEM</div>
        <Grid columns={2} gap={12} className="story-grid" data-reveal-item>
          <div><h2>Payment history should travel with the buyer.</h2></div>
          <div>
            <p className="lead">
              Private notes can disappear or change. A public record gives both sides the same facts.
            </p>
          </div>
        </Grid>
        <p className="source-chain-note" data-reveal-item><MaterialIcon name="link" /><span><strong>Money stays on Sepolia.</strong> Only proof reaches Creditcoin to update the public title.</span></p>
        <RecordComparison />
      </Section>

      <Section spacing="none" tone="transparent" composition="contained" className="process-section process-section-compact landing-section-data" data-reveal data-reveal-group aria-labelledby="process-title">
        <details className="process-disclosure" data-reveal-item="artifact">
          <summary>
            <span><span className="section-index">02 | OPTIONAL WALKTHROUGH</span><strong id="process-title">Inspect all four payment-to-title steps</strong></span>
            <span className="process-disclosure-action">Open technical walkthrough <MaterialIcon name="add" /></span>
          </summary>
          <div className="process-disclosure-body">
            <p className="lead">A payment, shop acknowledgement, accepted proof, and title update must agree in sequence.</p>
            <ProcessJourney steps={[...DEMO_PROCESS]} />
            <details className="technical-drawer">
              <summary>Source and proof mechanics <span aria-hidden="true"><MaterialIcon name="add" /></span></summary>
              <div className="technical-drawer-body">
                <div><strong>1 | Source records</strong><p>Payment and acknowledgement remain on Sepolia.</p></div>
                <div><strong>2 | Independent proof</strong><p>Attestcoin checks both finalized transactions together.</p></div>
                <div><strong>3 | Title update</strong><p>Creditcoin accepts the pair once and fills one slice.</p></div>
              </div>
            </details>
          </div>
        </details>
      </Section>

      <Section spacing="none" tone="transparent" composition="evidence" className="receipt-stage landing-section-data" data-reveal data-reveal-group>
        <div className="receipt-copy" data-reveal-item>
          <div className="section-index section-index-light">03 | THE ARTIFACT</div>
          <h2>A receipt people can actually read.</h2>
          <p className="lead">The verdict comes first. Source hashes remain available for inspection.</p>
          <div className="state-key landing-state-key" role="group" aria-label="Possible title slice states">
            {RECORD_STATE_KEYS.map((state) => <RecordStateBadge state={state} key={state} />)}
          </div>
          <Button href="/verify">Open the receipt index <MaterialIcon name="arrow_forward" /></Button>
        </div>
        <LandingReceipt />
      </Section>

      <TitleTrack />

      <Section spacing="none" tone="proof" composition="evidence" className="evidence-band landing-evidence-status landing-section-data" data-reveal data-reveal-group aria-labelledby="evidence-title">
        <div className="evidence-overview" data-reveal-item><div className="section-index section-index-light">04 | PUBLIC EVIDENCE</div><h2 id="evidence-title">Counted, not marketed.</h2><p>Live testnet facts, with the limits left visible.</p></div>
        <div className="evidence-grid" data-scroll-story="evidence">
          <div className="evidence-primary" data-scroll-item><CountUp value={PROJECT_EVIDENCE.titleSlices} /><span>proven slices complete the sample title</span></div>
          <div className="evidence-support" data-scroll-item><CountUp value={PROJECT_EVIDENCE.contractTests} /><span>contract tests passing</span></div>
          <div className="evidence-support" data-scroll-item><CountUp value={PROJECT_EVIDENCE.crossNetworkFundsMoved} /><span>payment funds moved across networks</span></div>
        </div>
        <div className="status-list landing-status-compact" data-scroll-story="status">
          <div data-scroll-item>
            <span className={`status-symbol ${contractConfiguration.ready ? 'status-symbol-live' : 'status-symbol-warn'}`}><MaterialIcon name={contractConfiguration.ready ? 'check' : 'warning'} /></span>
            <div>
              <strong>{contractConfiguration.ready ? 'Test contracts are configured' : 'Contract configuration is incomplete'}</strong>
              <p>{contractConfiguration.ready ? 'Payment and title addresses are public.' : 'Live actions stay disabled until all addresses are set.'}</p>
            </div>
            <span className={`status-badge ${contractConfiguration.ready ? 'status-live' : 'status-disputed'}`}>{contractConfiguration.ready ? 'LIVE TESTNET' : 'DEMO ONLY'}</span>
          </div>
          <details className="status-limitations" data-scroll-item>
            <summary><span className="status-symbol status-symbol-warn"><MaterialIcon name="warning" /></span><span><strong>Testnet limitations</strong><small>Availability can change</small></span><span className="status-badge status-disputed">TESTNET</span></summary>
            <p>RPC and proof services may pause; confirmed chain records remain public.</p>
          </details>
        </div>
        <small className="evidence-snapshot">Evidence snapshot · {PROJECT_EVIDENCE.verifiedOn}</small>
      </Section>

      <Section spacing="none" tone="transparent" composition="contained" className="faq-section landing-final landing-section-data" data-reveal data-reveal-group>
        <div className="section-index" data-reveal-item>05 | STRAIGHT ANSWERS</div>
        <Grid columns={2} gap={12} className="faq-layout" data-reveal-item>
          <div><h2>Know before the wallet opens.</h2><p className="lead">Reading stays public. Connect only to write.</p></div>
          <div className="questions">
            {FAQS.map(([question, answer]) => (
              <details className="question" name="landing-faq" key={question}>
                <summary><span>{question}</span><span className="question-plus" aria-hidden="true"><MaterialIcon name="add" /></span></summary>
                <div className="question-answer"><p>{answer}</p></div>
              </details>
            ))}
          </div>
        </Grid>
        <div className="landing-final-actions" data-reveal-item>
          <DrawnLoop className="final-cta-loop" />
          <div><span className="mini-title">START WITH THE RECORD</span><h2>Inspect first. Sign only when ready.</h2></div>
          <div className="final-actions"><Button href="/verify">Verify a receipt</Button><Button variant="secondary" href="/send">Send an installment</Button></div>
        </div>
      </Section>
    </main>
  );
}
