import { Interface } from 'ethers';
import { REFUSAL_ABI } from './abi.js';

const iface = new Interface(REFUSAL_ABI);

export interface Refusal {
  name: string;
  args: Record<string, string>;
  /** One sentence a person can act on, naming the rule that fired. */
  sentence: string;
}

function describe(name: string, a: Record<string, string>): string {
  switch (name) {
    case 'NotSuccessful':
      return `That Sepolia transaction reverted. A failed payment is still provable, which is exactly why this check exists.`;
    case 'WrongTransactionType':
      return `Unsupported Sepolia transaction type ${a.txType}. Use a wallet mode that emits a supported transaction type.`;
    case 'AlreadyConsumed':
      return `Consumed. ${a.txHash} has already filled a slice and cannot fill another.`;
    case 'SliceAlreadyResolved':
      return `Slice ${a.n} is already resolved with status ${a.status}; choose the next due slice.`;
    case 'SliceAlreadyTicked':
      return `Slice ${a.n} is already live on the title pass; choose the next due slice.`;
    case 'UnderPaid':
      return `Short by ${BigInt(a.required ?? 0) - BigInt(a.paid ?? 0)} units. The installment is ${a.required}.`;
    case 'AckDoesNotCitePayment':
      return `The shop's acknowledgement cites ${a.cited}, but the proven payment is ${a.actual}.`;
    case 'WindowClosed':
      return `Window closed. Slice ${a.n} ended at ${a.windowEnd}; it is now ${a.nowTs}.`;
    case 'Rel1BadVersion':
      return `Not a REL1 record — the payload claims version ${a.found}.`;
    case 'Rel1WrongKind':
      return `REL1 record of the wrong kind: expected ${a.expected}, found ${a.found}.`;
    case 'EventNotFound':
      return `No matching event from ${a.expectedEmitter}. A lookalike contract's event proves nothing.`;
    case 'ProofRejected':
      return `The Block Prover rejected the batch. The transactions were not in a finalized, attested block.`;
    case 'ShopMismatch':
      return `Shop mismatch: the registry says ${a.expected}, the proof says ${a.found}.`;
    case 'BuyerMismatch':
      return `Buyer mismatch: the registry says ${a.expected}, the proof says ${a.found}.`;
    case 'SliceMismatch':
      return `Slice mismatch: the payment is for ${a.expected}, the acknowledgement for ${a.found}.`;
    case 'UnknownAsset':
      return `No asset ${a.assetId} is listed.`;
    default:
      return `Refused by rule ${name}.`;
  }
}

/** Pulls the named contract error out of whatever shape ethers threw. */
export function decodeRefusal(err: unknown): Refusal | null {
  const data = extractRevertData(err);
  if (!data) return null;

  try {
    const parsed = iface.parseError(data);
    if (!parsed) return null;

    const args: Record<string, string> = {};
    parsed.fragment.inputs.forEach((input, i) => {
      args[input.name || String(i)] = String(parsed.args[i]);
    });

    return { name: parsed.name, args, sentence: describe(parsed.name, args) };
  } catch {
    return null;
  }
}

function extractRevertData(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as Record<string, unknown>;

  for (const key of ['data', 'error', 'info']) {
    const v = e[key];
    if (typeof v === 'string' && v.startsWith('0x') && v.length >= 10) return v;
    if (typeof v === 'object' && v !== null) {
      const nested = extractRevertData(v);
      if (nested) return nested;
    }
  }
  return null;
}
