import Link from 'next/link';
import { BrandMotion } from '@/components/BrandMotion';
import { HeroProof } from '@/components/HeroProof';
import { LandingReceipt } from '@/components/LandingReceipt';
import { ProcessJourney } from '@/components/ProcessJourney';
import { MaterialIcon } from '@/components/MaterialIcon';
import { Badge, Button, Card, DrawnLoop, DrawnUnderline, Grid, RecordStateContext, Section, Starburst, StatusIndicator } from '@/components/ui';
import { RECORD_STATE_KEYS } from '@/lib/recordStates';
import { CountUp } from '@/components/CountUp';
import { contractConfiguration } from '@/lib/chain';
import { DEMO_PROCESS } from '@/lib/demoData';

const FAQS = [
  ['Does Relia move money between chains?', 'No. Payments stay on Sepolia. Creditcoin receives proof, not funds.'],
  ['What if the shop stays silent?', 'The buyer can still prove the payment after the window. The slice becomes Disputed and the shop cannot reclaim it.'],
  ['Does someone need a wallet to read a receipt?', 'No. Tape, title, and verification pages are public. A wallet is required only for actions that write to a chain.'],
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
              Private notebooks are easy to lose, dispute, or rewrite. Relia turns each paid slice into a public record both sides can inspect.
            </p>
          </div>
        </Grid>
        <div className="ledger-compare" data-scroll-story="ledger">
          <article className="ledger-sheet ledger-old">
            <span className="tape-mark" aria-hidden="true" />
            <div className="mini-title">ONE PERSON'S NOTEBOOK</div>
            <div className="mini-row"><span>04</span><span>paid</span><span><MaterialIcon name="check" /></span></div>
            <div className="mini-row is-missing"><span>05</span><span>missed?</span><span>shop says</span></div>
            <div className="mini-row"><span>06</span><span>paid</span><span><MaterialIcon name="check" /></span></div>
            <p>Private and hard to defend.</p>
          </article>
          <div className="compare-arrow" aria-hidden="true"><span>becomes</span><MaterialIcon name="arrow_forward" /></div>
          <article className="ledger-sheet ledger-public">
            <div className="mini-title">THE PUBLIC TAPE</div>
            <div className="mini-row"><span>04</span><span className="state-live"><MaterialIcon name="check" /> Live</span><span className="proof-hash">0x71c3...</span></div>
            <div className="mini-row"><span>05</span><span className="state-disputed"><MaterialIcon name="warning" /> Disputed</span><span className="proof-hash">0x2fb4...</span></div>
            <div className="mini-row"><span>06</span><span className="state-live"><MaterialIcon name="check" /> Live</span><span className="proof-hash">0x9d0b...</span></div>
            <p>Public and easy to verify.</p>
          </article>
        </div>
      </Section>

      <Section spacing="none" tone="transparent" composition="contained" className="process-section landing-section-data" data-reveal data-reveal-group aria-labelledby="process-title">
        <div className="section-heading-row" data-reveal-item>
          <div><div className="section-index">02 | PAYMENT TO TITLE</div><h2 id="process-title">Four steps. No money bridge.</h2></div>
          <div className="process-intro">
            <p className="lead">One installment becomes one shared source of truth.</p>
            <div className="party-outcomes" role="group" aria-label="Outcomes for the buyer and shop">
              <p><strong>Buyer</strong><span>Keeps a payment history that travels with them.</span></p>
              <p><strong>Shop</strong><span>Gets a receipt it can share instead of defending a private notebook.</span></p>
            </div>
          </div>
        </div>
        <ProcessJourney steps={[...DEMO_PROCESS]} />
      </Section>

      <Section spacing="none" tone="transparent" composition="evidence" className="receipt-stage landing-section-data" data-reveal data-reveal-group>
        <div className="receipt-copy" data-reveal-item>
          <div className="section-index section-index-light">03 | THE ARTIFACT</div>
          <h2>A receipt people can actually read.</h2>
          <p className="lead">The important facts are visible first. Hashes stay available for audit and copy.</p>
          <div className="state-key" role="group" aria-label="Title slice state guide">
            {RECORD_STATE_KEYS.map((state) => <RecordStateContext state={state} compact key={state} />)}
          </div>
          <Button href="/verify">Open the receipt index <MaterialIcon name="arrow_forward" /></Button>
        </div>
        <LandingReceipt />
      </Section>

      <Section spacing="none" tone="transparent" composition="open" className="trust-section landing-section-narrative" data-reveal data-reveal-group>
        <div className="section-index" data-reveal-item>04 | DESIGNED FOR THE HARD CASES</div>
        <Grid columns={2} gap={12} className="story-grid trust-heading" data-reveal-item>
          <h2>The rules protect the record when people disagree.</h2>
          <p className="lead">The interface shows silence, missed windows, and refused proofs without hiding the original payment.</p>
        </Grid>
        <div className="trust-cards">
          <Card as="article" variant="illustrated" className="trust-card trust-card-yellow" data-reveal-item="artifact">
            <Badge tone="disputed">DISPUTED</Badge>
            <h3>Silence does not erase a payment.</h3>
            <p>If the buyer proves payment without a valid confirmation, reclaim is blocked.</p>
          </Card>
          <Card as="article" variant="quiet" className="trust-card" data-reveal-item="artifact">
            <Badge tone="live">EXACT MATCH</Badge>
            <h3>Bad evidence is refused.</h3>
            <p>Relia rebuilds the expected record instead of trusting pasted shortcuts.</p>
          </Card>
        </div>
      </Section>

      <Section spacing="none" tone="transparent" composition="contained" className="architecture-section landing-section-data" data-reveal data-reveal-group aria-labelledby="architecture-title">
        <div className="section-heading-row" data-reveal-item>
          <div><div className="section-index">05 | UNDER THE HOOD</div><h2 id="architecture-title">The payment stays put. Only proof travels.</h2></div>
          <p className="lead">Most people only need the receipt. Auditors can open the exact verification path.</p>
        </div>
        <details className="technical-drawer" data-reveal-item="artifact">
          <summary>How verification works <span aria-hidden="true"><MaterialIcon name="add" /></span></summary>
          <div className="technical-drawer-body">
            <div><strong>1 | Original records</strong><p>The payment and shop confirmation stay on Sepolia. They use the REL1 format, and the confirmation names the exact payment transaction.</p></div>
            <div><strong>2 | Independent check</strong><p>Attestcoin proves what both finalized transactions contain. Relia rebuilds the expected payment hash instead of accepting a supplied shortcut.</p></div>
            <div><strong>3 | Title update</strong><p>Creditcoin accepts each proven pair once, fills the title slice, and stores the receipt. No payment funds arrive there.</p></div>
          </div>
        </details>
      </Section>

      <BrandMotion />

      <Section spacing="none" tone="proof" composition="evidence" className="evidence-band landing-section-data" data-reveal data-reveal-group aria-labelledby="evidence-title">
        <div data-reveal-item><div className="section-index section-index-light">06 | PUBLIC EVIDENCE</div><h2 id="evidence-title">Counted, not marketed.</h2></div>
        <div className="evidence-grid" data-scroll-story="evidence">
          <div data-scroll-item><CountUp value={12} /><span>equal slices complete this example title</span></div>
          <div data-scroll-item><CountUp value={10} /><span>ways invalid evidence is refused</span></div>
          <div data-scroll-item><CountUp value={46} /><span>automated rule checks passing</span></div>
          <div data-scroll-item><CountUp value={0} /><span>payment funds moved between networks</span></div>
        </div>
      </Section>

      <Section spacing="none" tone="transparent" composition="open" className="status-section landing-section-data" data-reveal data-reveal-group>
        <div className="section-heading-row" data-reveal-item>
          <div><div className="section-index">07 | HONEST STATUS</div><h2>Know what is live before you sign.</h2></div>
          <p className="lead">See what has shipped, what has been tested, and what still relies on public test networks.</p>
        </div>
        <div className="status-list" data-scroll-story="status">
          <div data-scroll-item>
            <span className={`status-symbol ${contractConfiguration.ready ? 'status-symbol-live' : 'status-symbol-warn'}`}><MaterialIcon name={contractConfiguration.ready ? 'check' : 'warning'} /></span>
            <div>
              <strong>{contractConfiguration.ready ? 'Test contracts are configured' : 'Contract configuration is incomplete'}</strong>
              <p>{contractConfiguration.ready ? 'The configured payment and title contracts have public testnet addresses you can inspect.' : 'The interactive examples remain available, but live reads and writes stay unavailable until every public contract address is configured.'}</p>
            </div>
            <span className={`status-badge ${contractConfiguration.ready ? 'status-live' : 'status-disputed'}`}>{contractConfiguration.ready ? 'LIVE TESTNET' : 'DEMO ONLY'}</span>
          </div>
          <div data-scroll-item><span className="status-symbol status-symbol-live"><MaterialIcon name="check" /></span><div><strong>46 automated checks pass</strong><p>The contract suite covers successful updates and named refusal paths.</p></div><span className="status-badge status-live">46 PASS</span></div>
          <div data-scroll-item><span className="status-symbol status-symbol-warn"><MaterialIcon name="warning" /></span><div><strong>Public networks can pause</strong><p>Reads and writes still depend on testnet RPC and proof services being available.</p></div><span className="status-badge status-disputed">TESTNET</span></div>
        </div>
      </Section>

      <Section spacing="none" tone="transparent" composition="contained" className="faq-section landing-section-data" data-reveal data-reveal-group>
        <div className="section-index" data-reveal-item>08 | STRAIGHT ANSWERS</div>
        <Grid columns={2} gap={12} className="faq-layout" data-reveal-item>
          <div><h2>Questions that should be answered before a wallet opens.</h2><p className="lead">Public reading stays free and unconnected.</p></div>
          <div className="questions">
            {FAQS.map(([question, answer]) => (
              <details className="question" key={question}>
                <summary><span>{question}</span><span className="question-plus" aria-hidden="true"><MaterialIcon name="add" /></span></summary>
                <div className="question-answer"><p>{answer}</p></div>
              </details>
            ))}
          </div>
        </Grid>
      </Section>

      <Section spacing="none" tone="proof" composition="evidence" className="final-cta landing-section-narrative" data-reveal data-reveal-group>
        <DrawnLoop className="final-cta-loop" />
        <div data-reveal-item><div className="section-index section-index-light">START WITH THE PUBLIC RECORD</div><h2>Inspect first. Connect only to write.</h2></div>
        <div className="final-actions" data-reveal-item><Button href="/verify">Verify a receipt</Button><Button variant="secondary" href="/send">Send an installment</Button></div>
      </Section>
    </main>
  );
}
