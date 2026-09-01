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

  if (lower.includes('chain') || lower.includes('network') || lower.includes('4902')) {
    return {
      title: 'Wrong network',
      message: 'This action has to run on the chain shown in the button flow.',
      action: 'Approve the network switch in your wallet, then try again.',
      tone: 'warn',
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

  if (lower.includes('fetch') || lower.includes('timeout') || lower.includes('network') || lower.includes('failed to load')) {
    return {
      title: 'Network read failed',
      message: 'The testnet RPC did not answer cleanly.',
      action: 'Retry in a moment, or switch to a healthier RPC in .env.local.',
      tone: 'error',
    };
  }

  return {
    title: fallback,
    message: raw,
    action: 'Try again. If it repeats, copy the technical detail for debugging.',
    tone: 'error',
  };
}
