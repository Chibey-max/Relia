// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    IBlockProver,
    IEvmV1Decoder,
    MerkleProof,
    ContinuityProof,
    Type2Transaction,
    Receipt,
    EvmLog
} from "./interfaces/IAttestcoin.sol";
import {AssetRegistry} from "./AssetRegistry.sol";
import {ShortfallTape} from "./ShortfallTape.sol";
import {TitlePass} from "./TitlePass.sol";
import {Rel1} from "../lib/Rel1.sol";
import {LibTxHash} from "../lib/LibTxHash.sol";

/// @title ProofConsumer — where a Sepolia fact becomes Creditcoin title
/// @notice Title slice N of an asset does not exist until this contract has
///         seen, in one batch, proof of two finalized Sepolia transactions —
///         a successful REL1 installment payment, and the shop's
///         acknowledgement citing that exact payment hash — and confirmed that
///         neither hash has been consumed and the window is still open.
///
///         Every refusal below is a named error. Nothing here is a bare
///         require, because the frontend renders the rule that fired, and
///         "execution reverted" is not a rule.
contract ProofConsumer {
    /// @notice One transaction to be proven: where it lives and its inclusion proof.
    struct Query {
        uint64 height;
        bytes encodedTransaction;
        MerkleProof merkleProof;
    }

    /// @dev topic0 of ReliaPaySink.Paid.
    bytes32 public constant PAID_TOPIC = keccak256("Paid(bytes32,uint8,bytes)");

    /// @dev topic0 of ReliaShopAck.Acked.
    bytes32 public constant ACKED_TOPIC = keccak256("Acked(bytes32,uint8,bytes)");

    uint8 internal constant TX_TYPE_EIP1559 = 2;
    uint8 internal constant RECEIPT_SUCCESS = 1;

    IBlockProver public immutable prover;
    IEvmV1Decoder public immutable decoder;
    AssetRegistry public immutable registry;
    ShortfallTape public immutable tape;
    TitlePass public immutable titlePass;

    /// @notice Attestcoin's internal index for the source chain. Resolved from
    ///         the ChainInfo precompile at deploy time, never assumed.
    uint64 public immutable sourceChainKey;

    /// @notice The Sepolia addresses whose events are the only ones Relia will
    ///         believe. Without this binding, anyone could deploy a lookalike
    ///         sink and prove payments to themselves.
    address public immutable paySinkSepolia;
    address public immutable shopAckSepolia;

    /// @notice Source-chain transaction hashes already spent on a slice.
    mapping(bytes32 => bool) public consumed;

    event InstallmentReceipt(
        bytes32 indexed assetId,
        uint8 indexed n,
        bytes32 payTx,
        bytes32 ackTx,
        address payer,
        address buyer,
        address shop,
        uint256 amount,
        uint64 payHeight,
        uint64 ackHeight
    );

    event PaymentOnlyProven(bytes32 indexed assetId, uint8 indexed n, bytes32 payTx, address payer);

    // ------------------------------------------------------------- refusals

    /// @notice Refusal #1: the Block Prover rejected the batch outright.
    error ProofRejected();

    /// @notice Refusal #1: the transaction was included and attested, but it
    ///         reverted. A failed payment is still a real, provable
    ///         transaction — this is the check that stops it buying title.
    error NotSuccessful(bytes32 txHash, uint8 receiptStatus);

    error WrongTransactionType(uint8 txType);

    /// @notice The proven transaction did not target Relia's Sepolia contract.
    error WrongTarget(address expected, address found);

    /// @notice No log with the expected topic0, emitted by the expected
    ///         contract, was present in the proven receipt.
    error EventNotFound(bytes32 topic, address expectedEmitter);

    /// @notice The event's indexed topics disagree with its REL1 body.
    error TopicBodyMismatch();

    error UnknownAsset(bytes32 assetId);
    error AssetMismatch(bytes32 expected, bytes32 found);
    error SliceMismatch(uint8 expected, uint8 found);
    error ShopMismatch(address expected, address found);
    error BuyerMismatch(address expected, address found);

    /// @notice Refusal #3.
    error UnderPaid(uint256 paid, uint256 required);

    /// @notice Refusal #4: the acknowledgement does not cite this payment.
    error AckDoesNotCitePayment(bytes32 cited, bytes32 actual);

    /// @notice Refusal #5.
    error AlreadyConsumed(bytes32 txHash);

    /// @notice Refusal #6: the batch is correct but arrived too late.
    error WindowClosed(bytes32 assetId, uint8 n, uint64 windowEnd, uint256 nowTs);

    /// @notice The two facts must be distinct transactions.
    error SameTransaction(bytes32 txHash);

    constructor(
        IBlockProver prover_,
        IEvmV1Decoder decoder_,
        AssetRegistry registry_,
        ShortfallTape tape_,
        TitlePass titlePass_,
        uint64 sourceChainKey_,
        address paySinkSepolia_,
        address shopAckSepolia_
    ) {
        prover = prover_;
        decoder = decoder_;
        registry = registry_;
        tape = tape_;
        titlePass = titlePass_;
        sourceChainKey = sourceChainKey_;
        paySinkSepolia = paySinkSepolia_;
        shopAckSepolia = shopAckSepolia_;
    }

    // ------------------------------------------------------------- happy path

    /// @notice Prove a payment and its acknowledgement together, and tick title.
    function consume(Query calldata payQ, Query calldata ackQ, ContinuityProof calldata continuity)
        external
    {
        _verifyBatch(payQ, ackQ, continuity);

        (Rel1.Payment memory payment, bytes32 payTx) = _readPayment(payQ.encodedTransaction);
        (Rel1.Ack memory ackRecord, bytes32 ackTx) = _readAck(ackQ.encodedTransaction);

        if (payTx == ackTx) revert SameTransaction(payTx);

        _checkAgainstRegistry(payment);

        // The citation. This is the join between the two facts, and the reason
        // the payment's true hash had to be recomputed rather than trusted.
        if (ackRecord.payTx != payTx) revert AckDoesNotCitePayment(ackRecord.payTx, payTx);
        if (ackRecord.assetId != payment.assetId) {
            revert AssetMismatch(payment.assetId, ackRecord.assetId);
        }
        if (ackRecord.n != payment.n) revert SliceMismatch(payment.n, ackRecord.n);

        {
            AssetRegistry.Asset memory asset = registry.getAsset(payment.assetId);
            if (ackRecord.shop != asset.shopSepolia) {
                revert ShopMismatch(asset.shopSepolia, ackRecord.shop);
            }
        }

        _spend(payTx);
        _spend(ackTx);

        _requireWindowOpen(payment.assetId, payment.n);

        titlePass.tick(payment.assetId, payment.n);
        tape.markLive(payment.assetId, payment.n, payTx, ackTx, payment.payer);

        _emitReceipt(payment, payTx, ackTx, payQ.height, ackQ.height);
    }

    /// @dev Split out purely to keep `consume` within the stack limit.
    function _emitReceipt(
        Rel1.Payment memory payment,
        bytes32 payTx,
        bytes32 ackTx,
        uint64 payHeight,
        uint64 ackHeight
    ) internal {
        emit InstallmentReceipt(
            payment.assetId,
            payment.n,
            payTx,
            ackTx,
            payment.payer,
            payment.buyer,
            payment.shop,
            payment.amount,
            payHeight,
            ackHeight
        );
    }

    /// @notice Prove a payment on its own, with no acknowledgement.
    /// @dev This is the buyer's defence. It ticks no title and mints nothing —
    ///      a payment alone never moves title — but it puts the payment on the
    ///      tape, so that if the window closes without the shop acknowledging,
    ///      the slice settles as `Disputed` rather than `Shortfall` and the
    ///      shop cannot reclaim it.
    ///
    ///      The payment hash is deliberately *not* marked consumed: the shop
    ///      may still acknowledge before the window closes, and the full batch
    ///      must remain consumable.
    function proveShortfallDispute(Query calldata payQ, ContinuityProof calldata continuity) external {
        _verifySingle(payQ, continuity);

        (Rel1.Payment memory payment, bytes32 payTx) = _readPayment(payQ.encodedTransaction);
        _checkAgainstRegistry(payment);
        _requireWindowOpen(payment.assetId, payment.n);

        if (consumed[payTx]) revert AlreadyConsumed(payTx);

        tape.markPaymentProven(payment.assetId, payment.n, payTx, payment.payer);
        emit PaymentOnlyProven(payment.assetId, payment.n, payTx, payment.payer);
    }

    // --------------------------------------------------------------- internal

    function _verifyBatch(Query calldata payQ, Query calldata ackQ, ContinuityProof calldata continuity)
        internal
    {
        uint64[] memory heights = new uint64[](2);
        heights[0] = payQ.height;
        heights[1] = ackQ.height;

        bytes[] memory txs = new bytes[](2);
        txs[0] = payQ.encodedTransaction;
        txs[1] = ackQ.encodedTransaction;

        MerkleProof[] memory proofs = new MerkleProof[](2);
        proofs[0] = payQ.merkleProof;
        proofs[1] = ackQ.merkleProof;

        if (!prover.verify(sourceChainKey, heights, txs, proofs, continuity)) revert ProofRejected();
    }

    function _verifySingle(Query calldata q, ContinuityProof calldata continuity) internal {
        uint64[] memory heights = new uint64[](1);
        heights[0] = q.height;

        bytes[] memory txs = new bytes[](1);
        txs[0] = q.encodedTransaction;

        MerkleProof[] memory proofs = new MerkleProof[](1);
        proofs[0] = q.merkleProof;

        if (!prover.verify(sourceChainKey, heights, txs, proofs, continuity)) revert ProofRejected();
    }

    /// @dev Decodes one attested transaction, enforces success and target, and
    ///      returns the log matching `topic` plus the transaction's true hash.
    function _readEvent(bytes memory encodedTx, address expectedTarget, bytes32 topic)
        internal
        view
        returns (EvmLog memory log, bytes32 txHash)
    {
        uint8 txType = decoder.getTransactionType(encodedTx);
        if (txType != TX_TYPE_EIP1559) revert WrongTransactionType(txType);

        Type2Transaction memory t = decoder.decodeTransactionType2(encodedTx);

        txHash = LibTxHash.type2Hash(t.commonTx, t.type2);

        // Refusal #1. Checked before anything in the payload is read, so a
        // reverted transaction's logs are never even looked at.
        if (t.receipt.receiptStatus != RECEIPT_SUCCESS) {
            revert NotSuccessful(txHash, t.receipt.receiptStatus);
        }

        if (t.commonTx.to != expectedTarget) revert WrongTarget(expectedTarget, t.commonTx.to);

        EvmLog[] memory logs = decoder.getLogsByEventSignature(t.receipt, topic);

        // The emitter must be Relia's own contract. A matching topic0 from
        // some other address proves nothing.
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].address_ == expectedTarget) {
                return (logs[i], txHash);
            }
        }
        revert EventNotFound(topic, expectedTarget);
    }

    function _readPayment(bytes memory encodedTx)
        internal
        view
        returns (Rel1.Payment memory payment, bytes32 txHash)
    {
        EvmLog memory log;
        (log, txHash) = _readEvent(encodedTx, paySinkSepolia, PAID_TOPIC);

        payment = Rel1.decodePayment(abi.decode(log.data, (bytes)));

        // The indexed topics and the REL1 body are two encodings of the same
        // claim. If they disagree, the event is not what it appears to be.
        if (log.topics.length != 3) revert TopicBodyMismatch();
        if (log.topics[1] != payment.assetId) revert TopicBodyMismatch();
        if (uint256(log.topics[2]) != uint256(payment.n)) revert TopicBodyMismatch();
    }

    function _readAck(bytes memory encodedTx)
        internal
        view
        returns (Rel1.Ack memory ackRecord, bytes32 txHash)
    {
        EvmLog memory log;
        (log, txHash) = _readEvent(encodedTx, shopAckSepolia, ACKED_TOPIC);

        ackRecord = Rel1.decodeAck(abi.decode(log.data, (bytes)));

        if (log.topics.length != 3) revert TopicBodyMismatch();
        if (log.topics[1] != ackRecord.assetId) revert TopicBodyMismatch();
        if (uint256(log.topics[2]) != uint256(ackRecord.n)) revert TopicBodyMismatch();
    }

    /// @dev The registry, not the event, is the authority on what this payment
    ///      was supposed to be.
    function _checkAgainstRegistry(Rel1.Payment memory payment) internal view {
        if (!registry.exists(payment.assetId)) revert UnknownAsset(payment.assetId);
        AssetRegistry.Asset memory asset = registry.getAsset(payment.assetId);

        if (payment.shop != asset.shopSepolia) revert ShopMismatch(asset.shopSepolia, payment.shop);
        if (payment.buyer != asset.buyer) revert BuyerMismatch(asset.buyer, payment.buyer);

        // Refusal #3. Overpayment is fine; underpayment is not a payment.
        if (payment.amount < asset.installment) revert UnderPaid(payment.amount, asset.installment);
    }

    function _requireWindowOpen(bytes32 assetId, uint8 n) internal view {
        uint64 end = registry.windowEnd(assetId, n);
        // Windows are day-scale deadlines; second-level drift changes nothing.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > end) revert WindowClosed(assetId, n, end, block.timestamp);
    }

    function _spend(bytes32 txHash) internal {
        if (consumed[txHash]) revert AlreadyConsumed(txHash);
        consumed[txHash] = true;
    }
}
