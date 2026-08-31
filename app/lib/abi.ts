export const tapeAbi = [
  {
    type: 'function',
    name: 'sliceOf',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'status', type: 'uint8' },
        { name: 'windowEnd', type: 'uint64' },
        { name: 'updatedAt', type: 'uint64' },
        { name: 'payTx', type: 'bytes32' },
        { name: 'ackTx', type: 'bytes32' },
        { name: 'payer', type: 'address' },
        { name: 'paymentProven', type: 'bool' },
      ],
    }],
  },
  {
    type: 'function',
    name: 'settleWindow',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }],
    outputs: [],
  },
] as const;

export const registryAbi = [
  {
    type: 'function',
    name: 'getAsset',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'kind', type: 'uint8' },
        { name: 'installment', type: 'uint256' },
        { name: 'shopCtc', type: 'address' },
        { name: 'shopSepolia', type: 'address' },
        { name: 'buyer', type: 'address' },
        { name: 'exists', type: 'bool' },
      ],
    }],
  },
  {
    type: 'event',
    name: 'Listed',
    inputs: [
      { name: 'assetId', type: 'bytes32', indexed: true },
      { name: 'kind', type: 'uint8', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'shopCtc', type: 'address' },
      { name: 'shopSepolia', type: 'address' },
      { name: 'installment', type: 'uint256' },
      { name: 'windows', type: 'uint64[12]' },
    ],
  },
] as const;

export const titlePassAbi = [
  {
    type: 'function',
    name: 'isSliceLive',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'slicesFilled',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'isCleared',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const consumerAbi = [
  {
    type: 'event',
    name: 'InstallmentReceipt',
    inputs: [
      { name: 'assetId', type: 'bytes32', indexed: true },
      { name: 'n', type: 'uint8', indexed: true },
      { name: 'payTx', type: 'bytes32' },
      { name: 'ackTx', type: 'bytes32' },
      { name: 'payer', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'shop', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'payHeight', type: 'uint64' },
      { name: 'ackHeight', type: 'uint64' },
    ],
  },
] as const;

export const paySinkAbi = [
  {
    type: 'function',
    name: 'pay',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'n', type: 'uint8' },
      { name: 'shop', type: 'address' },
      { name: 'buyer', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'installmentAmount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const shopAckAbi = [
  {
    type: 'function',
    name: 'ack',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'n', type: 'uint8' },
      { name: 'payTx', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

export const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const STATUS_LABELS = ['None', 'Due', 'Live', 'Shortfall', 'Disputed', 'Reclaimed'] as const;
export const ASSET_KINDS = ['GENERATOR', 'SOLAR', 'OKADA', 'SEW'] as const;
