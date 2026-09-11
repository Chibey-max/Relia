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
    // Contract status `Due` means "no recorded outcome yet", not "payment owed now".
    label: 'Unsettled',
    symbol: 'radio_button_unchecked',
    meaning: 'This window has no recorded outcome yet. It is open, upcoming, or past its deadline awaiting settlement.',
    nextAction: 'Pay it while open, or settle it once the deadline passes.',
  },
};

export function recordStateFromStatus(status: number): RecordState | null {
  return ({ 1: 'due', 2: 'live', 3: 'shortfall', 4: 'disputed', 5: 'reclaimed' } as const)[status] ?? null;
}

export type WindowTiming = 'open' | 'upcoming' | 'overdue';

type SliceDisplay = RecordStateDefinition & { tone: RecordState | 'neutral' };

export const WINDOW_TIMING: Record<WindowTiming, SliceDisplay> = {
  open: {
    label: 'Open',
    symbol: 'schedule',
    tone: 'due',
    meaning: 'This is the current payment window. The installment, the shop acknowledgement, and the proof must land before its deadline.',
    nextAction: 'Send the installment for this slice.',
  },
  upcoming: {
    label: 'Upcoming',
    symbol: 'event',
    tone: 'neutral',
    meaning: 'This deadline is still ahead. Nothing is late.',
    nextAction: 'Nothing is required yet.',
  },
  overdue: {
    label: 'Needs settling',
    symbol: 'hourglass_bottom',
    tone: 'disputed',
    meaning: 'The deadline passed without a proven installment. Anyone can settle it to record Shortfall, or Disputed if a payment was proven.',
    nextAction: 'Settle the closed window.',
  },
};

export function windowTiming(windowEnd: bigint | number, isCurrent: boolean, now = Date.now()): WindowTiming {
  if (Number(windowEnd) * 1000 < now) return 'overdue';
  return isCurrent ? 'open' : 'upcoming';
}

/** Earliest unsettled slice whose deadline has not passed: the window to pay now. */
export function currentWindowIndex(slices: ReadonlyArray<{ state: RecordState | null; windowEnd: bigint | number }>, now = Date.now()): number {
  return slices.findIndex((slice) => slice.state === 'due' && Number(slice.windowEnd) * 1000 >= now);
}

/** What to show for a slice: its recorded outcome, or its deadline position while unsettled. */
export function sliceDisplay(state: RecordState, windowEnd?: bigint | number, isCurrent = false): SliceDisplay {
  if (state !== 'due' || windowEnd === undefined) return { ...RECORD_STATES[state], tone: state };
  return WINDOW_TIMING[windowTiming(windowEnd, isCurrent)];
}
