/**
 * Stable explanatory data for the landing page.
 *
 * These values never come from a wallet or RPC and must never be passed into a
 * write flow. Keeping them in one module prevents an interactive example from
 * drifting into something that looks like live contract state.
 */
export const DEMO_DISCLOSURE = 'Interactive example | sample data | no wallet';

export const DEMO_PROCESS = [
  {
    number: '01',
    title: 'A payment is sent',
    body: 'The buyer approves one exact installment.',
    meta: 'SEPOLIA | PAYMENT',
  },
  {
    number: '02',
    title: 'The shop acknowledges it',
    body: 'The shop confirms that same payment.',
    meta: 'SEPOLIA | ACK',
  },
  {
    number: '03',
    title: 'Both facts are proven',
    body: 'Relia proves the records belong together.',
    meta: 'PROOF | NO CUSTODY',
  },
  {
    number: '04',
    title: 'The title slice turns live',
    body: 'Creditcoin fills one slice and records the receipt.',
    meta: 'CREDITCOIN | TITLE',
  },
] as const;

export const DEMO_RECEIPT = {
  paymentHash: '0x71c39a4e02e7b14651b19c33ab229c7784e36d00f1659ff9aa34c71e4d0f83b7',
  acknowledgementHash: '0x2e8f41d7ad3c4198106c623b17f5c194e824839181425433367068492b5a09d3',
  assetId: '0x3a4ad2bf3d66ac764e9199b152d7485b665ef4352e7d342bdcdb68b4af52421c',
  assetName: 'Generator',
  amount: '40.00 USDC',
  buyer: 'Ada E.',
  shop: 'Generator Market',
  slice: 4,
  totalSlices: 12,
  paymentBlock: '6,841,203',
  acknowledgementBlock: '6,841,207',
} as const;
