import Link from 'next/link';

const REFUSALS = [
  'NOTSUCCESSFUL', 'REL1BADVERSION', 'UNDERPAID', 'ACKDOESNOTCITEPAYMENT', 'ALREADYCONSUMED',
  'WINDOWCLOSED', 'RECLAIMBLOCKEDLIVE', 'RECLAIMBLOCKEDDISPUTED', 'SOULBOUND', 'EVENTNOTFOUND',
];

export default function LandingPage() {
  return (
    <main className="landing-main">
      <section className="landing-hero" data-reveal>
        <span className="starburst" style={{ right: 44, top: 92 }} />
        <span className="starburst green" style={{ left: 88, top: 210 }} />
        <div className="landing-kicker"><span className="dot" />DEPLOYED TO SEPOLIA + CREDITCOIN TESTNET · 46 TESTS GREEN</div>
        <h1>Twelve payments for a generator in Lagos, and a record <span className="highlight">neither side can rewrite</span></h1>
        <p className="hero-copy">
          Relia is hire-purchase title, proven across chains. Money settles on Sepolia. Creditcoin holds the title
          and the tape. A slice of title exists only when two finalized Sepolia transactions have been proven
          together — never because someone said so.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/send">Send an installment →</Link>
          <Link className="button secondary" href="/verify">See a public receipt</Link>
        </div>
        <p className="reading-note">READING IS FREE · NO WALLET, NO LOGIN, NO BACKEND · WRITING NEEDS A WALLET</p>
        <div className="photo-strip">
          <div className="photo-slot"><span>PHOTO · BUYER AND HER GENERATOR</span></div>
          <div className="photo-slot"><span>PHOTO · SHOP COUNTER, LAGOS</span></div>
          <div className="photo-slot"><span>PHOTO · OKADA, SOLAR, SEWING MACHINE</span></div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block problem" data-reveal>
          <div className="section-label"><span>01</span>THE PROBLEM</div>
          <div className="two-col">
            <div>
              <h2>Her word against theirs, and <span className="highlight">the record does not travel</span></h2>
              <p className="lead">
                Today that payment schedule lives in a shop&apos;s notebook. If the shop says the buyer missed month
                five, she missed month five — her word against theirs, and none of that history follows her to the
                next shop if she wants credit elsewhere.
              </p>
              <p className="lead" style={{ marginTop: 16 }}>
                A buyer who paid eleven times on time has nothing to show for it. A shop with a genuinely delinquent
                buyer has nothing to point at either. Both sides are asked to trust a notebook one of them owns.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="mini-ledger pin-left">
                <div className="mini-title">THE SHOP&apos;S NOTEBOOK</div>
                <div className="mini-row"><span className="muted-text">04</span><span>paid</span><span className="muted-text">ticked</span></div>
                <div className="mini-row"><span className="red-text">05</span><span className="red-text">missed</span><span className="red-text">shop&apos;s word</span></div>
                <div className="mini-row"><span className="muted-text">06</span><span>paid</span><span className="muted-text">ticked</span></div>
                <p className="aside-note" style={{ marginTop: 16 }}>Visible to nobody else. Worthless at the next shop.</p>
              </div>
              <div className="arrow-down">↓</div>
              <div className="mini-ledger dark pin-right">
                <div className="mini-title">THE TAPE ON CREDITCOIN</div>
                <div className="mini-row"><span className="muted-text">04</span><span className="green-text">✓ Live</span><span style={{ color: '#8fc0ff' }}>0x71c39a4e…</span></div>
                <div className="mini-row"><span className="yellow-text">05</span><span className="yellow-text">! Disputed</span><span style={{ color: '#8fc0ff' }}>0x2fb41c09…</span></div>
                <div className="mini-row"><span className="muted-text">06</span><span className="green-text">✓ Live</span><span style={{ color: '#8fc0ff' }}>0x9d0b73fc…</span></div>
                <p className="aside-note" style={{ marginTop: 16, color: '#b9d3d9' }}>
                  Readable by anyone with a URL. Every line points at a transaction that either happened or did not.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block mechanism" data-reveal>
          <div className="section-label"><span>02</span>THE MECHANISM</div>
          <p className="mechanism-statement">
            Title slice N does not exist until the Attestcoin Protocol proves two finalized Sepolia transactions in
            one batch — a <span className="green-text">successful</span> REL1 installment payment, and the shop&apos;s
            acknowledgement <span className="highlight" style={{ background: 'var(--yellow)', color: 'var(--ink-deep)' }}>citing that exact payment hash</span> — and
            Relia confirms neither hash has been consumed and the window is still open.
          </p>
          <div className="mechanism-grid">
            <div className="chain-card">
              <div className="mini-title" style={{ color: '#7fa6af' }}>SOURCE CHAIN</div>
              <div className="chain-card-title">Sepolia</div>
              <div className="aside-note" style={{ color: '#9ec2c9' }}>Money moves and stays here.</div>
              <div className="chain-list">
                <div><span>MockUSDC</span></div>
                <div><span>ReliaPaySink</span><span style={{ color: '#7fa6af' }}>Paid(REL1)</span></div>
                <div><span>ReliaShopAck</span><span style={{ color: '#7fa6af' }}>Acked(REL1)</span></div>
              </div>
            </div>
            <div className="connector">FACTS</div>
            <div className="chain-card prover">
              <div className="mini-title" style={{ color: 'var(--yellow)' }}>READABILITY PATH</div>
              <div className="chain-card-title">Attestcoin</div>
              <div className="aside-note" style={{ color: '#d9e8eb' }}>A bridge of facts, not funds.</div>
              <div className="chain-list">
                <div><span>Block Prover</span><span style={{ color: '#c6a24a' }}>0x..0FD2</span></div>
                <div><span>EVM-v1 decoder</span></div>
              </div>
              <p style={{ marginTop: 18, fontSize: 13.5, color: '#d9e8eb' }}>
                Not a third chain — a precompile on Creditcoin that can verify a Sepolia transaction happened and
                succeeded.
              </p>
            </div>
            <div className="connector">TITLE</div>
            <div className="chain-card">
              <div className="mini-title" style={{ color: '#7fa6af' }}>EXECUTION CHAIN</div>
              <div className="chain-card-title">Creditcoin</div>
              <div className="aside-note" style={{ color: '#9ec2c9' }}>Never touches the money.</div>
              <div className="chain-list">
                <div><span>ProofConsumer</span></div>
                <div><span>AssetRegistry</span></div>
                <div><span>TitlePass</span><span style={{ color: '#7fa6af' }}>soulbound</span></div>
                <div><span>ShortfallTape</span><span style={{ color: '#7fa6af' }}>permanent</span></div>
              </div>
            </div>
          </div>
          <div className="side-grid" style={{ marginTop: 32 }}>
            <div className="mini-ledger dark" style={{ boxShadow: 'none' }}>
              <div style={{ fontWeight: 800, marginBottom: 9 }}>Nothing is bridged</div>
              <p className="aside-note" style={{ color: '#9ec2c9' }}>No wrapped asset, no custodian, no message-passing of value. The only thing that crosses is a proof that a transaction happened.</p>
            </div>
            <div className="mini-ledger dark" style={{ boxShadow: 'none' }}>
              <div style={{ fontWeight: 800, marginBottom: 9 }}>The worker has no custody</div>
              <p className="aside-note" style={{ color: '#9ec2c9' }}>It watches, waits for attestation, builds the batch proof and pays gas. If it disappeared, the facts are still on Sepolia and anyone could prove the same thing.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block receipt" data-reveal>
          <div className="section-label" style={{ color: '#0b5237' }}><span>03</span>THE TITLE, AND THE RECEIPT</div>
          <div className="receipt-layout">
            <div>
              <h2>Every proven slice carries <span className="highlight">its own proof</span></h2>
              <p className="lead" style={{ color: '#1a5c43' }}>
                The receipt is the artifact a buyer would actually share. It names the two Sepolia transactions the
                slice was built from, the decoded record, and the Creditcoin transaction where the proof was
                accepted. No wallet, no login, no backend, no indexer.
              </p>
              <p className="lead" style={{ color: '#1a5c43', marginTop: 16, marginBottom: 24 }}>
                It also says who paid. A son paying his mother&apos;s slice is the normal case, not an exception to
                be hidden.
              </p>
              <div className="receipt-legend">
                <span className="green-text mono" style={{ fontWeight: 600 }}>✓ Live</span><span>payment and ack both proven — ticked, never reclaimable</span>
                <span className="mono" style={{ color: '#b26a00', fontWeight: 600 }}>! Disputed</span><span>buyer proved a payment the shop never acked — reclaim blocked</span>
                <span className="mono" style={{ color: '#e5484d', fontWeight: 600 }}>✕ Shortfall</span><span>window closed with nothing proven — the shop may reclaim</span>
                <span className="mono muted-text" style={{ fontWeight: 600 }}>↩ Reclaimed</span><span>a genuinely-missed slice, taken back</span>
                <span className="mono muted-text" style={{ fontWeight: 600 }}>○ Due</span><span>window open, nothing proven yet</span>
              </div>
              <Link className="button" href="/verify" style={{ marginTop: 26 }}>Open a live receipt →</Link>
            </div>
            <div className="browser-card mock-browser">
              <div className="screen-head">
                <div className="window-dots"><i /><i /><i /></div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>relia.app/verify/0x71c39a4e…</span>
              </div>
              <div className="receipt-table">
                <div className="receipt-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                    <div>
                      <div className="mini-title">INSTALLMENT RECEIPT</div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>Slice 04 of 12 · proven</div>
                    </div>
                    <span className="stamp">✓ LIVE</span>
                  </div>
                </div>
                <div className="receipt-panel">
                  <div className="mini-title">THE TWO SEPOLIA FACTS</div>
                  <div className="receipt-kv">
                    <span style={{ fontWeight: 600 }}>Payment</span><span className="hash">0x71c39a4e…4d0f83b7</span><span className="muted-text mono" style={{ whiteSpace: 'nowrap' }}>block 6841203</span>
                    <span style={{ fontWeight: 600 }}>Acknowledgement</span><span className="hash">0x2e8f41d7…2b5a09d3</span><span className="muted-text mono" style={{ whiteSpace: 'nowrap' }}>block 6841207</span>
                  </div>
                </div>
                <div className="receipt-panel" style={{ background: '#f7fbfc' }}>
                  <div className="mini-title">DECODED REL1 RECORD</div>
                  <div className="receipt-kv two mono">
                    <span className="muted-text">slice</span><span>4 of 12</span>
                    <span className="muted-text">amount</span><span>40.00 USDC</span>
                    <span className="muted-text">payer</span><span style={{ color: '#c98a00', fontWeight: 600 }}>0x08bF3d…d539</span>
                  </div>
                </div>
                <div className="receipt-panel" style={{ borderTop: '2px solid var(--ink-deep)', fontFamily: 'var(--mono, inherit)', fontWeight: 500 }}>
                  Both hashes are now spent: neither can fill another slice.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block status" data-reveal>
          <div className="section-label"><span>04</span>WHY YOU CAN TRUST THIS</div>
          <h2>The two design decisions <span className="highlight">worth arguing about</span></h2>
          <p className="lead" style={{ margin: '12px 0 40px' }}>Both exist because the obvious version of the rule is exploitable. Neither is decorative.</p>
          <div className="two-col">
            <div className="decision-card pin-left">
              <h3><code className="mono" style={{ background: 'var(--yellow)', border: '2px solid var(--ink-deep)', padding: '1px 6px' }}>Disputed</code> — a shop must not profit from its own silence</h3>
              <p className="lead" style={{ marginTop: 16, fontSize: 15 }}>
                The obvious rule is: window closed without a valid batch, write <code className="mono red-text">Shortfall</code>, let the
                shop reclaim. That rule is exploitable. A shop takes the payment on Sepolia, never acknowledges it,
                waits out the window, reclaims the slice, and leaves a false miss on the record of a buyer who{' '}
                <em>actually paid</em>.
              </p>
              <table className="small-table" style={{ marginTop: 20 }}>
                <thead><tr><th>At windowEnd</th><th>Tape state</th><th>Reclaim</th></tr></thead>
                <tbody>
                  <tr><td>No proven payment</td><td className="mono red-text">✕ Shortfall</td><td className="muted-text">allowed</td></tr>
                  <tr><td>Payment proven, no valid ack</td><td className="mono" style={{ color: '#c98a00', fontWeight: 600 }}>! Disputed</td><td><strong>blocked</strong>, hash published</td></tr>
                  <tr><td>Valid batch consumed in time</td><td className="mono green-text">✓ Live</td><td><strong>blocked</strong>, permanently</td></tr>
                </tbody>
              </table>
              <p className="aside-note" style={{ marginTop: 20 }}>
                This needs a way to prove a payment <em>without</em> an acknowledgement, so{' '}
                <code className="mono">proveShortfallDispute()</code> exists. It ticks no title and mints nothing.
              </p>
            </div>
            <div className="decision-card pin-right">
              <h3>The payment&apos;s transaction hash is recomputed on Creditcoin</h3>
              <p className="lead" style={{ marginTop: 16, fontSize: 15 }}>
                The Block Prover attests to a transaction&apos;s <em>contents</em>, not its hash. So &quot;the ack
                cites <strong>that exact</strong> payment hash&quot; would otherwise be a check against a number the
                worker supplied itself.
              </p>
              <p className="aside-note" style={{ margin: '14px 0 20px' }}>
                <code className="mono">LibTxHash</code> rebuilds the canonical EIP-1559 serialization from the
                attested fields and hashes it. Verified against five real transactions signed offline by ethers.
              </p>
              <pre><code>{`keccak256(
  0x02 ‖ rlp([ chainId, nonce, maxPriorityFee,
               maxFee, gasLimit, to, value,
               data, [], v, r, s ]))
        ↓
payTx  0x71c39a4e…4d0f83b7   attested, not asserted`}</code></pre>
              <div className="notice warn" style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>LIMITATION, STATED PLAINLY</div>
                Type-2 with an empty access list only. Anything else is <strong>refused</strong>, never mis-hashed.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block how" data-reveal>
          <div className="section-label"><span>05</span>HOW IT WORKS</div>
          <h2>Two people, two transactions, <span className="highlight" style={{ background: 'var(--green)' }}>one slice</span></h2>
          <div className="two-col" style={{ marginTop: 40 }}>
            <div className="step-card">
              <div className="status-badge status-live" style={{ marginBottom: 22 }}>BUYER</div>
              <div className="steps">
                {[
                  ['Read the record before signing', 'The exact REL1 string is shown before the wallet opens.'],
                  ['Pay the installment on Sepolia', 'Anyone may pay for any buyer — the payer is recorded and never has to be the buyer.'],
                  ['Watch the proof resolve', 'Seven stages fill in with real hashes and block heights rather than a spinner.'],
                  ['If the shop stays silent, prove it alone', 'The window closes Disputed instead of Shortfall.'],
                ].map(([t, b], i) => (
                  <div className="step" key={t}>
                    <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                    <div><h3>{t}</h3><p className="aside-note" style={{ marginTop: 4 }}>{b}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="step-card">
              <div className="status-badge status-disputed" style={{ marginBottom: 22 }}>SHOP</div>
              <div className="steps">
                {[
                  ['Acknowledge the payment on-chain', 'A second real Sepolia transaction citing the payment hash.'],
                  ['The slice ticks, and stays ticked', 'A settled slice can never be reclaimed.'],
                  ['Reclaim a genuinely missed slice', 'A window that closed with nothing proven reads Shortfall.'],
                  ['Twelve slices clear the title', 'The pass is soulbound until every slice is proven.'],
                ].map(([t, b], i) => (
                  <div className="step" key={t}>
                    <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                    <div><h3>{t}</h3><p className="aside-note" style={{ marginTop: 4 }}>{b}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block numbers" data-reveal>
          <div className="section-label"><span>06</span>BY THE NUMBERS</div>
          <h2>Counted, not marketed</h2>
          <div className="number-grid" style={{ marginTop: 40 }}>
            <div className="stat"><span className="stat-label">TITLE SLICES</span><span className="stat-value" style={{ color: '#3fd99a' }}>12</span><p className="aside-note" style={{ color: '#9fb4b9', marginTop: 14 }}>Per asset, each with its own window.</p></div>
            <div className="stat"><span className="stat-label">NAMED REFUSALS</span><span className="stat-value">10</span><p className="aside-note" style={{ color: '#9fb4b9', marginTop: 14 }}>Every failure is a rule with a name.</p></div>
            <div className="stat"><span className="stat-label">TESTS GREEN</span><span className="stat-value" style={{ color: '#eaf4f6' }}>46</span><p className="aside-note" style={{ color: '#9fb4b9', marginTop: 14 }}>Each asserts the specific named error.</p></div>
            <div className="stat"><span className="stat-label">FUNDS BRIDGED</span><span className="stat-value" style={{ color: '#eaf4f6' }}>0</span><p className="aside-note" style={{ color: '#9fb4b9', marginTop: 14 }}>Money settles on Sepolia and stays there.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block brand-break" data-reveal>
          <div className="brand-break-layout">
            <div>
              <div className="mini-title" style={{ color: '#ffd9e4' }}>THE REASONS ARE THE PRODUCT</div>
              <p style={{ maxWidth: '22em', fontSize: 19, fontWeight: 500 }}>
                Every rule is a named custom error. The app renders the rule that fired — never a raw revert string,
                never an error toast.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="brand-word">relia</div>
              <div className="mini-title" style={{ letterSpacing: '0.34em', color: 'var(--ink-deep)' }}>TITLE, PROVEN</div>
            </div>
          </div>
          <div className="status-orbs">
            <span className="green-text">✓</span><span style={{ color: '#c98a00' }}>!</span><span className="red-text">✕</span><span className="muted-text">↩</span><span className="muted-text">○</span><span>R1</span>
          </div>
          <div className="marquee">
            <div className="marquee-track">
              {[0, 1].map((k) => (
                <span key={k}>{REFUSALS.map((r) => <span key={r}>{r} <span style={{ color: 'var(--pink)' }}>✳</span></span>)}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block" data-reveal>
          <div className="section-label"><span>07</span>HONEST STATUS</div>
          <h2>What is built, deployed, and <span className="highlight">not yet confirmed</span></h2>
          <p className="lead" style={{ margin: '12px 0 40px' }}>
            No result here is mocked and presented as live. This says exactly what has run against real chains and
            what has only run in tests.
          </p>
          <div className="status-grid">
            <div className="status-card">
              <div className="status-badge status-live" style={{ marginBottom: 18 }}>✓ WRITTEN, TESTED &amp; DEPLOYED</div>
              <div className="steps" style={{ gap: 12, fontSize: 14.5 }}>
                <div>Both contract sets deployed — Sepolia and Creditcoin testnet</div>
                <div><code className="mono">forge test</code>: 46 tests green, each asserting a named error</div>
                <div>An asset listed on-chain, window settlement wired up</div>
                <div>Frontend: five routes, builds clean</div>
              </div>
            </div>
            <div className="status-card">
              <div className="status-badge status-disputed" style={{ marginBottom: 18 }}>· NOT YET CONFIRMED LIVE</div>
              <div className="steps" style={{ gap: 12, fontSize: 14.5 }}>
                <div>No documented full round trip: a real payment producing a real title tick</div>
                <div>Three refusals (NotSuccessful, Rel1BadVersion, ReclaimBlockedLive) are test-only by construction</div>
                <div className="muted-text" style={{ paddingTop: 4 }}>See the demo runbook for the exact reproduction steps.</div>
              </div>
            </div>
            <div className="status-card">
              <div className="status-badge status-shortfall" style={{ marginBottom: 18 }}>✕ OUT OF SCOPE</div>
              <div className="steps" style={{ gap: 12, fontSize: 14.5 }}>
                <div>No KYC, no fiat rails, no credit score</div>
                <div>No bridging of real USDC, no shop bond vault</div>
                <div>No token, no governance, no AI agent layer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block" data-reveal style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>FAQ</div>
          <h2>Questions worth answering</h2>
          <div className="questions" style={{ marginTop: 40, textAlign: 'left' }}>
            {[
              ['Do I need a wallet to look at a record?', 'No. The tape, any title and any receipt read straight from Creditcoin with no wallet, no login, no backend and no API key.'],
              ['Why does the same session use two networks?', 'Paying and acknowledging happen on Sepolia, where the money is. Title and tape live on Creditcoin, so settling happens there.'],
              ['Can someone else pay my installment?', 'Yes. Anyone may pay for any buyer — the payer is recorded and never has to be the buyer.'],
              ['What happens if the worker goes offline?', 'Nothing is lost. It holds no funds and has no special authority — every fact is still on Sepolia and anyone could prove it.'],
              ['Is this deployed and running end-to-end?', 'Deployed to both testnets with an asset listed — yes. A fully documented live round trip (payment → title tick) is not yet confirmed; see Honest Status above.'],
            ].map(([q, a], i) => (
              <details className="question" key={q} open={i === 0}>
                <summary className="question-head">{q}<span className="question-icon">+</span></summary>
                <p className="aside-note" style={{ marginTop: 14 }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="color-block footer" data-reveal>
          <div className="footer-grid">
            <div>
              <div className="brand" style={{ marginBottom: 16 }}>
                <span className="brand-mark" style={{ background: 'var(--yellow)', color: '#0b1416' }}>R</span>
                <span className="brand-name">Relia</span>
              </div>
              <p style={{ fontSize: 14, color: '#9fb4b9', maxWidth: '26em' }}>
                Hire-purchase title, proven across chains. Built for BUIDL CTC 2026 Fall — Creditcoin + Credit Labs.
              </p>
            </div>
            <div>
              <div className="mini-title" style={{ color: '#6f8a90' }}>APP</div>
              <div className="footer-links">
                <Link href="/tape">Tape</Link>
                <Link href="/send">Send</Link>
                <Link href="/title">Title</Link>
                <Link href="/verify">Verify</Link>
              </div>
            </div>
            <div>
              <div className="mini-title" style={{ color: '#6f8a90' }}>CONTRACTS</div>
              <div className="footer-links" style={{ color: '#9fb4b9' }}>
                <span>ProofConsumer</span><span>TitlePass</span><span>ShortfallTape</span><span>AssetRegistry</span>
              </div>
            </div>
            <div className="panel dark" style={{ border: '2px solid #2a3a3e' }}>
              <h3>Read the docs</h3>
              <p style={{ fontSize: 14, color: '#9fb4b9', margin: '8px 0 18px' }}>
                The README states what is tested, deployed, and out of scope. So does the demo runbook.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 44, paddingTop: 22, borderTop: '1px solid #2a3a3e', fontSize: 13, color: '#6f8a90', flexWrap: 'wrap' }}>
            <span>No bridged USDC · no KYC · no token · no governance</span>
            <span>Testnet only</span>
          </div>
        </div>
      </section>
    </main>
  );
}
