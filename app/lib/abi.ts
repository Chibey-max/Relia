export const tapeAbi = [
  {
    type: 'error',
    name: 'ReclaimBlockedLive',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }],
  },
  {
    type: 'error',
    name: 'ReclaimBlockedDisputed',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }, { name: 'payTx', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'NotReclaimable',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }, { name: 'status', type: 'uint8' }],
  },
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
    name: 'entryCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'entryAt',
    stateMutability: 'view',
    inputs: [{ name: 'i', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'assetId', type: 'bytes32' },
        { name: 'n', type: 'uint8' },
        { name: 'status', type: 'uint8' },
        { name: 'at', type: 'uint64' },
        { name: 'payTx', type: 'bytes32' },
        { name: 'ackTx', type: 'bytes32' },
      ],
    }],
  },
  {
    type: 'function',
    name: 'entryCountOf',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'entryOfAt',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'i', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'assetId', type: 'bytes32' },
        { name: 'n', type: 'uint8' },
        { name: 'status', type: 'uint8' },
        { name: 'at', type: 'uint64' },
        { name: 'payTx', type: 'bytes32' },
        { name: 'ackTx', type: 'bytes32' },
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
  {
    type: 'function',
    name: 'reclaim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'n', type: 'uint8' }],
    outputs: [],
  },
] as const;

export const registryAbi = [
  {
    type: 'function',
    name: 'list',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetKind', type: 'uint8' },
      { name: 'installment', type: 'uint256' },
      { name: 'windows', type: 'uint64[12]' },
      { name: 'shopCtc', type: 'address' },
      { name: 'shopSepolia', type: 'address' },
      { name: 'buyer', type: 'address' },
    ],
    outputs: [{ name: 'assetId', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'exists',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
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
    type: 'function',
    name: 'allWindows',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ type: 'uint64[12]' }],
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
    type: 'error',
    name: 'Soulbound',
    inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'slicesFilled', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
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
  {
    type: 'function',
    name: 'safeTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getApproved',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    outputs: [],
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
    name: 'shopOf',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'registerShop',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'assetId', type: 'bytes32' }, { name: 'shop', type: 'address' }],
    outputs: [],
  },
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
  {
    type: 'event',
    name: 'ShopRegistered',
    inputs: [
      { name: 'assetId', type: 'bytes32', indexed: true },
      { name: 'shop', type: 'address', indexed: true },
    ],
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
