'use client';

/**
 * The public receipt.
 *
 * No wallet, no backend, no indexer, no API key. Everything on this page is
 * read from Creditcoin by anyone who has the URL. That is the point: a record
 * you can only see while logged in to the app that issued it is not a portable
 * record.
 */
import { useEffect, useState } from 'react';
import { use } from 'react';
import { creditcoinClient, addresses, explorers } from '@/lib/chain';
import { consumerAbi } from '@/lib/abi';

interface Receipt {
  assetId: string;
  n: number;
  payTx: string;
  ackTx: string;
  payer: string;
  buyer: string;
  shop: string;
  amount: bigint;
  payHeight: bigint;
  ackHeight: bigint;
  creditcoinTx: string;
  creditcoinBlock: bigint;
}

export default function VerifyPage({ params }: { params: Promise<{ payTx: string }> }) {
  const { payTx } = use(params);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const events = await creditcoinClient.getContractEvents({
          address: addresses.consumer,
          abi: consumerAbi,
          eventName: 'InstallmentReceipt',
          fromBlock: 'earliest',
        });

        const hit = events.find(
          (e) => String(e.args.payTx).toLowerCase() === payTx.toLowerCase(),
        );

        if (!hit) {
          setError('notfound');
          return;
        }

        setReceipt({
          assetId: String(hit.args.assetId),
          n: Number(hit.args.n),
          payTx: String(hit.args.payTx),
          ackTx: String(hit.args.ackTx),
          payer: String(hit.args.payer),
          buyer: String(hit.args.buyer),
          shop: String(hit.args.shop),
          amount: hit.args.amount as bigint,
          payHeight: hit.args.payHeight as bigint,
          ackHeight: hit.args.ackHeight as bigint,
          creditcoinTx: hit.transactionHash,
          creditcoinBlock: hit.blockNumber,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [payTx]);

  if (loading) return <p>Reading Creditcoin…</p>;

  if (error === 'notfound') {
    return (
      <main>
        <h1>No slice for this payment</h1>
        <div style={{ border: '2px solid #b00020', background: '#fff5f5', padding: 12, maxWidth: 620 }}>
          <div style={{ fontWeight: 700 }}>Nothing proven</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            Creditcoin holds no installment receipt citing{' '}
            <code style={{ wordBreak: 'break-all' }}>{payTx}</code>. Either the payment was never
            proven together with a shop acknowledgement, or it was refused.
          </div>
        </div>
        <p style={{ fontSize: 13, marginTop: 12 }}>
          A payment on Sepolia is not a title slice. The slice exists only once both facts are
          proven here.
        </p>
      </main>
    );
  }

  if (error) return <p style={{ color: '#b00020' }}>Could not read Creditcoin: {error}</p>;
  if (!receipt) return null;

  return (
    <main>
      <h1>Installment receipt</h1>
      <p style={{ fontSize: 13, color: '#555' }}>
        Read live from Creditcoin with no wallet connected.
      </p>

      <h2 style={{ fontSize: 15 }}>The two Sepolia facts</h2>
      <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
        <tbody>
          <Row label="Payment tx">
            <a href={explorers.sepoliaTx(receipt.payTx)} target="_blank" rel="noreferrer">
              {receipt.payTx}
            </a>{' '}
            <span style={{ color: '#666' }}>(block {String(receipt.payHeight)})</span>
          </Row>
          <Row label="Acknowledgement tx">
            <a href={explorers.sepoliaTx(receipt.ackTx)} target="_blank" rel="noreferrer">
              {receipt.ackTx}
            </a>{' '}
            <span style={{ color: '#666' }}>(block {String(receipt.ackHeight)})</span>
          </Row>
        </tbody>
      </table>

      <h2 style={{ fontSize: 15 }}>Decoded REL1 record</h2>
      <pre style={{ background: '#f6f6f6', padding: 12, fontSize: 12, overflowX: 'auto' }}>
{`version   REL1
kind      payment
assetId   ${receipt.assetId}
slice     ${receipt.n} of 12
shop      ${receipt.shop}
buyer     ${receipt.buyer}
payer     ${receipt.payer}
amount    ${(Number(receipt.amount) / 1e6).toFixed(2)} USDC`}
      </pre>
      {receipt.payer.toLowerCase() !== receipt.buyer.toLowerCase() && (
        <p style={{ fontSize: 13 }}>
          Paid by someone other than the buyer. That is allowed, and the tape records who paid.
        </p>
      )}

      <h2 style={{ fontSize: 15 }}>Proven on Creditcoin</h2>
      <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
        <tbody>
          <Row label="Verification tx">
            <a href={explorers.creditcoinTx(receipt.creditcoinTx)} target="_blank" rel="noreferrer">
              {receipt.creditcoinTx}
            </a>
          </Row>
          <Row label="Block">{String(receipt.creditcoinBlock)}</Row>
          <Row label="Consumer">
            <a
              href={explorers.creditcoinAddress(addresses.consumer)}
              target="_blank"
              rel="noreferrer"
            >
              {addresses.consumer}
            </a>
          </Row>
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: '#555', marginTop: 20 }}>
        Both hashes are now spent: neither can fill another slice.
      </p>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td style={{ paddingRight: 12, verticalAlign: 'top', color: '#555', whiteSpace: 'nowrap' }}>
        {label}
      </td>
      <td style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{children}</td>
    </tr>
  );
}
