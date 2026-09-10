'use client';

export interface UiError {
  title: string;
  message: string;
  action: string;
  tone: 'error' | 'warn';
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function explainError(error: unknown, fallback = 'Something stopped this action.'): UiError {
  const raw = errorText(error);
  const lower = raw.toLowerCase();

  if (lower.includes('no injected wallet')) {
    return {
      title: 'Wallet not found',
      message: 'Relia needs an injected browser wallet for writes. Reads still work without one.',
      action: 'Install MetaMask or Rabby, then connect again.',
      tone: 'warn',
    };
  }

  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request')) {
    return {
      title: 'Wallet request cancelled',
      message: 'The site did not send anything because the wallet confirmation was rejected.',
      action: 'Run the action again when you are ready to sign.',
      tone: 'warn',
    };
  }

  if (lower.includes('fetch') || lower.includes('timeout') || lower.includes('failed to load') || lower.includes('rpc')) {
    return {
      title: 'Network read failed',
      message: 'The testnet RPC did not answer cleanly.',
      action: 'Retry in a moment, or switch to a healthier RPC in .env.local.',
      tone: 'error',
    };
  }

  if (lower.includes('wrong network') || lower.includes('chain mismatch') || lower.includes('switch chain') || lower.includes('4902')) {
    return {
      title: 'Wrong network',
      message: 'This action has to run on the chain shown in the button flow.',
      action: 'Approve the network switch in your wallet, then try again.',
      tone: 'warn',
    };
  }

  if (lower.includes('soulbound')) {
    return {
      title: 'Title is still soulbound',
      message: 'This title cannot be transferred or receive a token approval until all twelve slices are proven.',
      action: 'Return to the title record and wait for the remaining proof slices.',
      tone: 'warn',
    };
  }

  if (lower.includes('wrong from') || lower.includes('not the current title owner')) {
    return {
      title: 'Ownership changed',
      message: 'The address being used as the sender is no longer the title owner.',
      action: 'Refresh the ownership record before preparing another transfer.',
      tone: 'warn',
    };
  }

  if (lower.includes('not authorized') || lower.includes('unauthorized')) {
    return {
      title: 'Wallet is not authorized',
      message: 'The connected wallet is neither the owner nor an approved operator for this title.',
      action: 'Connect the owner or an address that the owner has approved.',
      tone: 'warn',
    };
  }

  if (lower.includes('nottheshop') || lower.includes('registered shop')) {
    return {
      title: 'Connected wallet is not the shop',
      message: 'Only the shop address registered for this asset may acknowledge its payment.',
      action: 'Switch to the registered shop account shown beside the acknowledgement action.',
      tone: 'warn',
    };
  }

  if (lower.includes('nottheregisteringshop')) {
    return {
      title: 'Connected wallet is not that shop',
      message: 'A shop can only register itself. The connected wallet must match the Sepolia shop address being registered.',
      action: 'Switch to the shop account shown for this asset, then register again.',
      tone: 'warn',
    };
  }

  if (lower.includes('revert')) {
    return {
      title: 'Transaction was not confirmed',
      message: 'The network returned the transaction, but its contract execution did not succeed. No later proof or title stage has been marked complete.',
      action: 'Inspect the transaction detail, correct the cause, then start the action again.',
      tone: 'error',
    };
  }

  if (lower.includes('valid 32-byte') || lower.includes('valid buyer') || lower.includes('valid sepolia')) {
    return {
      title: 'Check the form',
      message: raw,
      action: 'Fix the highlighted value and submit again.',
      tone: 'warn',
    };
  }

  return {
    title: fallback,
    message: raw,
    action: 'Try again. If it repeats, copy the technical detail for debugging.',
    tone: 'error',
  };
}
