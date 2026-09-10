export const RECORD_STATE_KEYS = ['live', 'disputed', 'shortfall', 'reclaimed', 'due'] as const;

export type RecordState = (typeof RECORD_STATE_KEYS)[number];

export interface RecordStateDefinition {
  label: string;
  symbol: string;
  meaning: string;
  nextAction: string;
}

export const RECORD_STATES: Record<RecordState, RecordStateDefinition> = {
  live: {
    label: 'Live',
    symbol: 'check',
    meaning: 'The payment and matching shop acknowledgement are proven. This title slice is active.',
    nextAction: 'Open or share the public receipt.',
  },
  disputed: {
    label: 'Disputed',
    symbol: 'warning',
    meaning: 'A payment was proven, but the acknowledgement window closed without a valid shop response.',
    nextAction: 'Inspect the payment record; the shop cannot reclaim this slice.',
  },
  shortfall: {
    label: 'Shortfall',
    symbol: 'close',
    meaning: 'The payment window closed without a proven installment.',
    nextAction: 'Inspect the closed window; the shop may reclaim this slice.',
  },
  reclaimed: {
    label: 'Reclaimed',
    symbol: 'keyboard_return',
    meaning: 'The shop reclaimed a slice after a recorded shortfall.',
    nextAction: 'Inspect the tape before beginning another payment.',
  },
  due: {
    label: 'Due',
    symbol: 'radio_button_unchecked',
    meaning: 'The installment window is unresolved. It may still be waiting for payment, acknowledgement, or proof.',
    nextAction: 'Send the installment, finish its proof, or settle it after the window closes.',
  },
};

export function recordStateFromStatus(status: number): RecordState | null {
  return ({ 1: 'due', 2: 'live', 3: 'shortfall', 4: 'disputed', 5: 'reclaimed' } as const)[status] ?? null;
}
