// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {AssetRegistry} from "../creditcoin/AssetRegistry.sol";
import {ShortfallTape} from "../creditcoin/ShortfallTape.sol";
import {TitlePass} from "../creditcoin/TitlePass.sol";
import {ProofConsumer} from "../creditcoin/ProofConsumer.sol";
import {
    CommonTx, Type2Fields, AccessListEntry, Receipt as EvmReceipt, EvmLog, ContinuityProof, MerkleProof, MerkleProofEntry
} from "../creditcoin/interfaces/IAttestcoin.sol";
import {MockBlockProver, LocalEvmV1Decoder, AttestcoinEncoder} from "./mocks/MockAttestcoin.sol";
import {Rel1} from "../lib/Rel1.sol";
import {LibTxHash} from "../lib/LibTxHash.sol";

/// @notice The refusal matrix. Each rule Relia claims to enforce gets a test
///         that makes the rule fire, by name.
contract ReliaTest is Test {
    AssetRegistry registry;
    ShortfallTape tape;
    TitlePass pass;
    ProofConsumer consumer;
    MockBlockProver prover;
    LocalEvmV1Decoder decoder;

    address constant PAY_SINK = address(0x5151);
    address constant SHOP_ACK = address(0xACAC);
    address constant SHOP_SEPOLIA = address(0xBEEF);
    address constant SHOP_CTC = address(0xB00B);
    address constant BUYER = address(0xCAFE);
    address constant SON = address(0x5011); // pays for his mother
    uint64 constant CHAIN_KEY = 11;
    uint256 constant INSTALLMENT = 40_000_000; // 40 USDC, 6dp

    bytes32 assetId;
    uint64[12] windows;

    /// @dev Nonce source so every constructed transaction gets a unique hash.
    uint64 nonceCursor = 1;

    function setUp() public {
        vm.warp(1_800_000_000);

        registry = new AssetRegistry();
        tape = new ShortfallTape(registry);
        pass = new TitlePass();
        prover = new MockBlockProver();
        decoder = new LocalEvmV1Decoder();

        consumer = new ProofConsumer(
            prover, decoder, registry, tape, pass, CHAIN_KEY, PAY_SINK, SHOP_ACK
        );

        registry.wire(pass, tape);
        tape.setConsumer(address(consumer));
        pass.setConsumer(address(consumer));
        pass.setRegistrar(address(registry));

        for (uint8 i = 0; i < 12; i++) {
            windows[i] = uint64(block.timestamp + 30 days * (uint256(i) + 1));
        }

        assetId = registry.list(
            uint8(AssetRegistry.AssetKind.GENERATOR),
            INSTALLMENT,
            windows,
            SHOP_CTC,
            SHOP_SEPOLIA,
            BUYER
        );
    }

    // ------------------------------------------------------- payload builders

    function _receipt(uint8 status, EvmLog[] memory logs) internal pure returns (EvmReceipt memory) {
        return EvmReceipt({
            receiptStatus: status,
            receiptGasUsed: 100000,
            receiptLogs: logs,
            receiptLogsBloom: new bytes(256)
        });
    }

    function _oneLog(address emitter, bytes32 topic0, bytes32 assetId_, uint8 n, bytes memory rel1)
        internal
        pure
        returns (EvmLog[] memory logs)
    {
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = topic0;
        topics[1] = assetId_;
        topics[2] = bytes32(uint256(n));

        logs = new EvmLog[](1);
        logs[0] = EvmLog({address_: emitter, topics: topics, data: abi.encode(rel1)});
    }

    function _tx(address to, EvmReceipt memory receipt)
        internal
        returns (bytes memory encoded, bytes32 txHash)
    {
        CommonTx memory common = CommonTx({
            nonce: nonceCursor,
            gasLimit: 200000,
            from: SON,
            toIsNull: false,
            to: to,
            value: 0,
            data: hex"1234"
        });
        Type2Fields memory t2 = Type2Fields({
            chainId: 11155111,
            maxPriorityFeePerGas: 1 gwei,
            maxFeePerGas: 30 gwei,
            accessList: new AccessListEntry[](0),
            yParity: 1,
            r: keccak256(abi.encode("r", nonceCursor)),
            s: keccak256(abi.encode("s", nonceCursor))
        });
        nonceCursor++;

        encoded = AttestcoinEncoder.encodeType2(common, t2, receipt);
        txHash = LibTxHash.type2Hash(common, t2);
    }

    /// @notice A well-formed payment transaction for slice `n`.
    function _payTx(uint8 n, uint256 amount, uint8 status)
        internal
        returns (bytes memory encoded, bytes32 txHash)
    {
        bytes memory rel1 = Rel1.encodePayment(
            Rel1.Payment({
                assetId: assetId,
                n: n,
                shop: SHOP_SEPOLIA,
                buyer: BUYER,
                payer: SON,
                amount: amount
            })
        );
        return _tx(PAY_SINK, _receipt(status, _oneLog(PAY_SINK, consumer.PAID_TOPIC(), assetId, n, rel1)));
    }

    function _ackTx(uint8 n, bytes32 citedPayTx, uint8 status)
        internal
        returns (bytes memory encoded, bytes32 txHash)
    {
        bytes memory rel1 = Rel1.encodeAck(
            Rel1.Ack({assetId: assetId, n: n, payTx: citedPayTx, shop: SHOP_SEPOLIA})
        );
        return _tx(SHOP_ACK, _receipt(status, _oneLog(SHOP_ACK, consumer.ACKED_TOPIC(), assetId, n, rel1)));
    }

    function _query(bytes memory encoded, uint64 height)
        internal
        pure
        returns (ProofConsumer.Query memory)
    {
        MerkleProofEntry[] memory siblings = new MerkleProofEntry[](1);
        siblings[0] = MerkleProofEntry({hash: keccak256("sibling"), isLeft: true});

        return ProofConsumer.Query({
            height: height,
            encodedTransaction: encoded,
            merkleProof: MerkleProof({root: keccak256("root"), siblings: siblings})
        });
    }

    function _continuity() internal pure returns (ContinuityProof memory) {
        bytes32[] memory roots = new bytes32[](2);
        roots[0] = keccak256("root-a");
        roots[1] = keccak256("root-b");
        return ContinuityProof({lowerEndpointDigest: keccak256("lower"), roots: roots});
    }

    /// @notice Prove slice `n` end to end.
    function _settleSlice(uint8 n) internal returns (bytes32 payTx, bytes32 ackTx) {
        bytes memory payEnc;
        bytes memory ackEnc;
        (payEnc, payTx) = _payTx(n, INSTALLMENT, 1);
        (ackEnc, ackTx) = _ackTx(n, payTx, 1);

        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    // ------------------------------------------------------------ happy path

    function test_happyPath_ticksTitleAndWritesLive() public {
        (bytes32 payTx, bytes32 ackTx) = _settleSlice(1);

        assertTrue(pass.isSliceLive(assetId, 1), "slice not live on pass");
        assertEq(pass.slicesFilled(assetId), 1);

        ShortfallTape.Slice memory s = tape.sliceOf(assetId, 1);
        assertEq(uint8(s.status), uint8(ShortfallTape.Status.Live));
        assertEq(s.payTx, payTx);
        assertEq(s.ackTx, ackTx);
        assertEq(s.payer, SON, "the son paid, and the tape says so");

        assertTrue(consumer.consumed(payTx));
        assertTrue(consumer.consumed(ackTx));
    }

    /// @dev The family rule: the payer need not be the buyer.
    function test_anyoneMayPayForTheBuyer() public {
        _settleSlice(1);
        ShortfallTape.Slice memory s = tape.sliceOf(assetId, 1);
        assertEq(s.payer, SON);
        assertEq(pass.ownerOf(uint256(assetId)), BUYER, "title still belongs to the buyer");
    }

    // ------------------------------------------------- refusal 1: tx reverted

    function test_refusal1_revertedPaymentIsNotATitle() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 0); // status 0
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(abi.encodeWithSelector(ProofConsumer.NotSuccessful.selector, payTx, uint8(0)));
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_refusal1_revertedAckIsNotAnAck() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);
        (bytes memory ackEnc, bytes32 ackTx) = _ackTx(1, payTx, 0);

        vm.expectRevert(abi.encodeWithSelector(ProofConsumer.NotSuccessful.selector, ackTx, uint8(0)));
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_proverRejectionIsRefused() public {
        prover.setShouldAccept(false);
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(ProofConsumer.ProofRejected.selector);
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    // -------------------------------------------------- refusal 2: bad REL1

    function test_refusal2_wrongVersionByteIsRefused() public {
        bytes memory rel1 = Rel1.encodePayment(
            Rel1.Payment(assetId, 1, SHOP_SEPOLIA, BUYER, SON, INSTALLMENT)
        );
        rel1[3] = bytes1(uint8(0x32)); // REL1 -> REL2

        (bytes memory payEnc, bytes32 payTx) =
            _tx(PAY_SINK, _receipt(1, _oneLog(PAY_SINK, consumer.PAID_TOPIC(), assetId, 1, rel1)));
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1BadVersion.selector, bytes4(0x52454c32)));
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_refusal2_ackRecordInThePaymentSlotIsRefused() public {
        bytes memory wrongKind = Rel1.encodeAck(Rel1.Ack(assetId, 1, keccak256("x"), SHOP_SEPOLIA));

        (bytes memory payEnc, bytes32 payTx) =
            _tx(PAY_SINK, _receipt(1, _oneLog(PAY_SINK, consumer.PAID_TOPIC(), assetId, 1, wrongKind)));
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(
            abi.encodeWithSelector(Rel1.Rel1WrongKind.selector, Rel1.KIND_PAYMENT, Rel1.KIND_ACK)
        );
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    /// @dev A lookalike sink emitting a correctly-shaped Paid event proves
    ///      nothing, because it is not the address Relia settles through.
    function test_foreignEmitterIsRefused() public {
        bytes memory rel1 = Rel1.encodePayment(
            Rel1.Payment(assetId, 1, SHOP_SEPOLIA, BUYER, SON, INSTALLMENT)
        );
        address impostor = address(0xDEAD);

        (bytes memory payEnc, bytes32 payTx) =
            _tx(PAY_SINK, _receipt(1, _oneLog(impostor, consumer.PAID_TOPIC(), assetId, 1, rel1)));
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(
            abi.encodeWithSelector(ProofConsumer.EventNotFound.selector, consumer.PAID_TOPIC(), PAY_SINK)
        );
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    // ------------------------------------------------- refusal 3: underpaid

    function test_refusal3_underpaymentIsRefused() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT - 1, 1);
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(
            abi.encodeWithSelector(ProofConsumer.UnderPaid.selector, INSTALLMENT - 1, INSTALLMENT)
        );
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_overpaymentIsAccepted() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT + 1, 1);
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
        assertTrue(pass.isSliceLive(assetId, 1));
    }

    // ---------------------------------------- refusal 4: ack does not cite it

    function test_refusal4_ackCitingAnotherPaymentIsRefused() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);
        bytes32 someoneElsesPayment = keccak256("a different payment entirely");
        (bytes memory ackEnc,) = _ackTx(1, someoneElsesPayment, 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                ProofConsumer.AckDoesNotCitePayment.selector, someoneElsesPayment, payTx
            )
        );
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_refusal4_ackForAnotherSliceIsRefused() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);
        (bytes memory ackEnc,) = _ackTx(2, payTx, 1); // right payment, wrong slice

        vm.expectRevert(abi.encodeWithSelector(ProofConsumer.SliceMismatch.selector, uint8(1), uint8(2)));
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    // ------------------------------------------------- refusal 5: replay

    function test_refusal5_replayingTheSameBatchIsRefused() public {
        bytes memory payEnc;
        bytes memory ackEnc;
        bytes32 payTx;
        (payEnc, payTx) = _payTx(1, INSTALLMENT, 1);
        (ackEnc,) = _ackTx(1, payTx, 1);

        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());

        vm.expectRevert(abi.encodeWithSelector(ProofConsumer.AlreadyConsumed.selector, payTx));
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    /// @dev The interesting replay: one real payment, a fresh ack, aimed at a
    ///      different slice. The payment hash is already spent, so it fails.
    function test_refusal5_onePaymentCannotFillTwoSlices() public {
        bytes memory payEnc;
        bytes32 payTx;
        (payEnc, payTx) = _payTx(1, INSTALLMENT, 1);
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());

        (bytes memory ackEnc2,) = _ackTx(1, payTx, 1); // new tx, same citation

        vm.expectRevert(abi.encodeWithSelector(ProofConsumer.AlreadyConsumed.selector, payTx));
        consumer.consume(_query(payEnc, 100), _query(ackEnc2, 102), _continuity());
    }

    // ------------------------------------------------- refusal 6: late batch

    function test_refusal6_batchAfterWindowCloseMintsNothing() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.warp(windows[0] + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                ProofConsumer.WindowClosed.selector, assetId, uint8(1), windows[0], block.timestamp
            )
        );
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());

        assertFalse(pass.isSliceLive(assetId, 1), "no slice may be minted late");
        assertEq(pass.slicesFilled(assetId), 0);

        tape.settleWindow(assetId, 1);
        assertEq(uint8(tape.sliceOf(assetId, 1).status), uint8(ShortfallTape.Status.Shortfall));
    }

    // ------------------------------------------ refusals 7 and 8: reclaim

    function test_refusal7_reclaimOnLiveSliceIsRefused() public {
        _settleSlice(1);
        vm.warp(windows[0] + 1);

        vm.expectRevert(
            abi.encodeWithSelector(ShortfallTape.ReclaimBlockedLive.selector, assetId, uint8(1))
        );
        vm.prank(SHOP_CTC);
        tape.reclaim(assetId, 1);
    }

    /// @dev The attack the Disputed state exists to stop: the shop takes the
    ///      money on Sepolia, never acknowledges, waits out the window, and
    ///      tries to reclaim the slice while leaving a false miss on the tape.
    function test_refusal8_shopCannotReclaimWhatTheBuyerProvedTheyPaid() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);

        // The buyer proves the payment alone. No ack ever comes.
        consumer.proveShortfallDispute(_query(payEnc, 100), _continuity());

        vm.warp(windows[0] + 1);
        tape.settleWindow(assetId, 1);

        ShortfallTape.Slice memory s = tape.sliceOf(assetId, 1);
        assertEq(uint8(s.status), uint8(ShortfallTape.Status.Disputed), "must not be a plain shortfall");
        assertEq(s.payTx, payTx, "the payment hash is published");

        vm.expectRevert(
            abi.encodeWithSelector(ShortfallTape.ReclaimBlockedDisputed.selector, assetId, uint8(1), payTx)
        );
        vm.prank(SHOP_CTC);
        tape.reclaim(assetId, 1);
    }

    function test_genuineShortfallIsReclaimable() public {
        vm.warp(windows[0] + 1);
        tape.settleWindow(assetId, 1);

        assertEq(uint8(tape.sliceOf(assetId, 1).status), uint8(ShortfallTape.Status.Shortfall));

        vm.prank(SHOP_CTC);
        tape.reclaim(assetId, 1);

        assertEq(uint8(tape.sliceOf(assetId, 1).status), uint8(ShortfallTape.Status.Reclaimed));
    }

    /// @dev A dispute does not become title. The buyer's defence protects the
    ///      record; it does not buy the thing.
    function test_disputeDoesNotMintTitle() public {
        (bytes memory payEnc,) = _payTx(1, INSTALLMENT, 1);
        consumer.proveShortfallDispute(_query(payEnc, 100), _continuity());

        assertFalse(pass.isSliceLive(assetId, 1));
        assertEq(pass.slicesFilled(assetId), 0);
    }

    /// @dev A payment-only proof must not spend the hash: the shop can still
    ///      acknowledge before the window closes.
    function test_disputeThenLateAckStillSettlesLive() public {
        (bytes memory payEnc, bytes32 payTx) = _payTx(1, INSTALLMENT, 1);
        consumer.proveShortfallDispute(_query(payEnc, 100), _continuity());

        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());

        assertEq(uint8(tape.sliceOf(assetId, 1).status), uint8(ShortfallTape.Status.Live));
        assertTrue(pass.isSliceLive(assetId, 1));
    }

    // ------------------------------------------------- refusal 9: soulbound

    function test_refusal9_transferBeforeTwelveSlicesIsRefused() public {
        _settleSlice(1);

        vm.expectRevert(
            abi.encodeWithSelector(TitlePass.Soulbound.selector, uint256(assetId), uint8(1))
        );
        vm.prank(BUYER);
        pass.transferFrom(BUYER, address(0x1234), uint256(assetId));
    }

    function test_refusal9_approveBeforeTwelveSlicesIsRefused() public {
        _settleSlice(1);

        vm.expectRevert(
            abi.encodeWithSelector(TitlePass.Soulbound.selector, uint256(assetId), uint8(1))
        );
        vm.prank(BUYER);
        pass.approve(address(0x1234), uint256(assetId));
    }

    function test_twelfthSliceClearsAndUnlocksTransfer() public {
        for (uint8 n = 1; n <= 12; n++) {
            _settleSlice(n);
        }

        assertEq(pass.slicesFilled(assetId), 12);
        assertTrue(pass.isCleared(assetId));

        vm.prank(BUYER);
        pass.transferFrom(BUYER, address(0x1234), uint256(assetId));

        assertEq(pass.ownerOf(uint256(assetId)), address(0x1234));
    }

    // ------------------------------------------------------------- registry

    function test_paymentForAnotherBuyerIsRefused() public {
        bytes memory rel1 = Rel1.encodePayment(
            Rel1.Payment(assetId, 1, SHOP_SEPOLIA, address(0xDEAD), SON, INSTALLMENT)
        );
        (bytes memory payEnc, bytes32 payTx) =
            _tx(PAY_SINK, _receipt(1, _oneLog(PAY_SINK, consumer.PAID_TOPIC(), assetId, 1, rel1)));
        (bytes memory ackEnc,) = _ackTx(1, payTx, 1);

        vm.expectRevert(
            abi.encodeWithSelector(ProofConsumer.BuyerMismatch.selector, BUYER, address(0xDEAD))
        );
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_unknownAssetIsRefused() public {
        bytes32 ghost = keccak256("never listed");
        bytes memory rel1 =
            Rel1.encodePayment(Rel1.Payment(ghost, 1, SHOP_SEPOLIA, BUYER, SON, INSTALLMENT));

        (bytes memory payEnc, bytes32 payTx) =
            _tx(PAY_SINK, _receipt(1, _oneLog(PAY_SINK, consumer.PAID_TOPIC(), ghost, 1, rel1)));

        bytes memory ackRel1 = Rel1.encodeAck(Rel1.Ack(ghost, 1, payTx, SHOP_SEPOLIA));
        (bytes memory ackEnc,) =
            _tx(SHOP_ACK, _receipt(1, _oneLog(SHOP_ACK, consumer.ACKED_TOPIC(), ghost, 1, ackRel1)));

        vm.expectRevert(abi.encodeWithSelector(ProofConsumer.UnknownAsset.selector, ghost));
        consumer.consume(_query(payEnc, 100), _query(ackEnc, 101), _continuity());
    }

    function test_registryRefusesWindowsInThePast() public {
        uint64[12] memory bad;
        for (uint8 i = 0; i < 12; i++) {
            bad[i] = uint64(block.timestamp - 1);
        }

        vm.expectRevert(
            abi.encodeWithSelector(
                AssetRegistry.WindowInThePast.selector, uint8(1), bad[0], block.timestamp
            )
        );
        registry.list(0, INSTALLMENT, bad, SHOP_CTC, SHOP_SEPOLIA, BUYER);
    }

    function test_theBatchIsSubmittedAsOneBatch() public {
        _settleSlice(1);
        assertEq(prover.lastBatchSize(), 2, "pay and ack must share one continuity proof");
        assertEq(prover.lastChainKey(), CHAIN_KEY);
    }
}
