export const PAY_SINK_ABI = [
  'event Paid(bytes32 indexed assetId, uint8 indexed n, bytes rel1)',
] as const;

export const SHOP_ACK_ABI = [
  'event Acked(bytes32 indexed assetId, uint8 indexed n, bytes rel1)',
] as const;

export const PROOF_CONSUMER_ABI = [
  'function consume((uint64 height, bytes encodedTransaction, (bytes32 root, (bytes32 hash, bool isLeft)[] siblings) merkleProof) payQ, (uint64 height, bytes encodedTransaction, (bytes32 root, (bytes32 hash, bool isLeft)[] siblings) merkleProof) ackQ, (bytes32 lowerEndpointDigest, bytes32[] roots) continuity)',
  'function proveShortfallDispute((uint64 height, bytes encodedTransaction, (bytes32 root, (bytes32 hash, bool isLeft)[] siblings) merkleProof) payQ, (bytes32 lowerEndpointDigest, bytes32[] roots) continuity)',
  'function consumed(bytes32) view returns (bool)',
  'function sourceChainKey() view returns (uint64)',
  'event InstallmentReceipt(bytes32 indexed assetId, uint8 indexed n, bytes32 payTx, bytes32 ackTx, address payer, address buyer, address shop, uint256 amount, uint64 payHeight, uint64 ackHeight)',
] as const;

/**
 * Every named refusal ProofConsumer, the tape and the codec can raise. The
 * worker decodes these so a rejection is reported as the rule that fired, not
 * as an opaque revert blob — the frontend renders the same names.
 */
export const REFUSAL_ABI = [
  'error ProofRejected()',
  'error NotSuccessful(bytes32 txHash, uint8 receiptStatus)',
  'error WrongTransactionType(uint8 txType)',
  'error WrongTarget(address expected, address found)',
  'error EventNotFound(bytes32 topic, address expectedEmitter)',
  'error TopicBodyMismatch()',
  'error UnknownAsset(bytes32 assetId)',
  'error AssetMismatch(bytes32 expected, bytes32 found)',
  'error SliceMismatch(uint8 expected, uint8 found)',
  'error ShopMismatch(address expected, address found)',
  'error BuyerMismatch(address expected, address found)',
  'error UnderPaid(uint256 paid, uint256 required)',
  'error AckDoesNotCitePayment(bytes32 cited, bytes32 actual)',
  'error AlreadyConsumed(bytes32 txHash)',
  'error WindowClosed(bytes32 assetId, uint8 n, uint64 windowEnd, uint256 nowTs)',
  'error SameTransaction(bytes32 txHash)',
  'error Rel1Malformed(uint256 length)',
  'error Rel1BadVersion(bytes4 found)',
  'error Rel1WrongKind(uint8 expected, uint8 found)',
  'error AccessListUnsupported()',
  'error ContractCreationUnsupported()',
] as const;
