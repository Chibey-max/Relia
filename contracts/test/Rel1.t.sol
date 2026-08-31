// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Rel1} from "../lib/Rel1.sol";

/// @dev Thin wrapper so library reverts surface through an external call and
///      can be caught with vm.expectRevert.
contract Rel1Harness {
    function decodePayment(bytes memory r) external pure returns (Rel1.Payment memory) {
        return Rel1.decodePayment(r);
    }

    function decodeAck(bytes memory r) external pure returns (Rel1.Ack memory) {
        return Rel1.decodeAck(r);
    }

    function encodePayment(Rel1.Payment memory p) external pure returns (bytes memory) {
        return Rel1.encodePayment(p);
    }

    function encodeAck(Rel1.Ack memory a) external pure returns (bytes memory) {
        return Rel1.encodeAck(a);
    }
}

contract Rel1Test is Test {
    Rel1Harness codec;

    function setUp() public {
        codec = new Rel1Harness();
    }

    // ------------------------------------------------------------ round trip

    function test_paymentRoundTrip() public view {
        Rel1.Payment memory p = Rel1.Payment({
            assetId: keccak256("generator-42"),
            n: 5,
            shop: address(0xBEEF),
            buyer: address(0xCAFE),
            payer: address(0xD00D),
            amount: 40_000_000
        });

        Rel1.Payment memory out = codec.decodePayment(codec.encodePayment(p));

        assertEq(out.assetId, p.assetId, "assetId");
        assertEq(out.n, p.n, "n");
        assertEq(out.shop, p.shop, "shop");
        assertEq(out.buyer, p.buyer, "buyer");
        assertEq(out.payer, p.payer, "payer");
        assertEq(out.amount, p.amount, "amount");
    }

    function test_ackRoundTrip() public view {
        Rel1.Ack memory a = Rel1.Ack({
            assetId: keccak256("solar-7"),
            n: 12,
            payTx: keccak256("some-sepolia-tx"),
            shop: address(0xBEEF)
        });

        Rel1.Ack memory out = codec.decodeAck(codec.encodeAck(a));

        assertEq(out.assetId, a.assetId, "assetId");
        assertEq(out.n, a.n, "n");
        assertEq(out.payTx, a.payTx, "payTx");
        assertEq(out.shop, a.shop, "shop");
    }

    function testFuzz_paymentRoundTrip(
        bytes32 assetId,
        uint8 n,
        address shop,
        address buyer,
        address payer,
        uint256 amount
    ) public view {
        Rel1.Payment memory p = Rel1.Payment(assetId, n, shop, buyer, payer, amount);
        Rel1.Payment memory out = codec.decodePayment(codec.encodePayment(p));

        assertEq(out.assetId, assetId);
        assertEq(out.n, n);
        assertEq(out.shop, shop);
        assertEq(out.buyer, buyer);
        assertEq(out.payer, payer);
        assertEq(out.amount, amount);
    }

    function testFuzz_ackRoundTrip(bytes32 assetId, uint8 n, bytes32 payTx, address shop) public view {
        Rel1.Ack memory a = Rel1.Ack(assetId, n, payTx, shop);
        Rel1.Ack memory out = codec.decodeAck(codec.encodeAck(a));

        assertEq(out.assetId, assetId);
        assertEq(out.n, n);
        assertEq(out.payTx, payTx);
        assertEq(out.shop, shop);
    }

    // --------------------------------------------------------- wrong version

    /// @dev The headline version test: a payload that is byte-for-byte a valid
    ///      payment except that it claims REL2 must be refused outright.
    function test_wrongVersionByte_reverts() public {
        Rel1.Payment memory p = Rel1.Payment(keccak256("a"), 1, address(1), address(2), address(3), 4);
        bytes memory good = codec.encodePayment(p);

        bytes memory bad = good;
        bad[3] = bytes1(uint8(0x32)); // "REL1" -> "REL2"

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1BadVersion.selector, bytes4(0x52454c32)));
        codec.decodePayment(bad);
    }

    function test_completelyForeignMagic_reverts() public {
        bytes memory bad = abi.encodePacked(bytes4(0xdeadbeef), uint8(1), new bytes(192));

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1BadVersion.selector, bytes4(0xdeadbeef)));
        codec.decodePayment(bad);
    }

    /// @dev A record whose body is a perfectly valid ABI-encoded payment but
    ///      which carries no REL1 header at all. This is the case that would
    ///      slip through if the version prefix were cosmetic.
    function test_bareAbiEncodedBodyWithoutHeader_reverts() public {
        bytes memory body = abi.encode(keccak256("a"), uint256(1), address(1), address(2), address(3), uint256(4));

        vm.expectRevert();
        codec.decodePayment(body);
    }

    // ------------------------------------------------------------ wrong kind

    function test_ackDecodedAsPayment_reverts() public {
        bytes memory ack = codec.encodeAck(Rel1.Ack(keccak256("a"), 1, keccak256("tx"), address(1)));

        vm.expectRevert(
            abi.encodeWithSelector(Rel1.Rel1WrongKind.selector, Rel1.KIND_PAYMENT, Rel1.KIND_ACK)
        );
        codec.decodePayment(ack);
    }

    function test_paymentDecodedAsAck_reverts() public {
        bytes memory pay =
            codec.encodePayment(Rel1.Payment(keccak256("a"), 1, address(1), address(2), address(3), 4));

        vm.expectRevert(
            abi.encodeWithSelector(Rel1.Rel1WrongKind.selector, Rel1.KIND_ACK, Rel1.KIND_PAYMENT)
        );
        codec.decodeAck(pay);
    }

    // ------------------------------------------------------------- malformed

    function test_emptyPayload_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1Malformed.selector, uint256(0)));
        codec.decodePayment("");
    }

    function test_headerOnlyNoBody_reverts() public {
        bytes memory r = abi.encodePacked(Rel1.MAGIC, Rel1.KIND_PAYMENT);

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1Malformed.selector, uint256(5)));
        codec.decodePayment(r);
    }

    function test_truncatedBody_reverts() public {
        bytes memory good =
            codec.encodePayment(Rel1.Payment(keccak256("a"), 1, address(1), address(2), address(3), 4));

        bytes memory truncated = new bytes(good.length - 32);
        for (uint256 i = 0; i < truncated.length; i++) {
            truncated[i] = good[i];
        }

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1Malformed.selector, truncated.length));
        codec.decodePayment(truncated);
    }

    function test_overlongBody_reverts() public {
        bytes memory good =
            codec.encodePayment(Rel1.Payment(keccak256("a"), 1, address(1), address(2), address(3), 4));
        bytes memory overlong = abi.encodePacked(good, uint256(0));

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1Malformed.selector, overlong.length));
        codec.decodePayment(overlong);
    }

    /// @dev `n` rides in a 256-bit word to keep the body length fixed. A word
    ///      that does not fit uint8 is malformed, not silently truncated.
    function test_sliceIndexOutOfDomain_reverts() public {
        bytes memory body =
            abi.encode(keccak256("a"), uint256(256), address(1), address(2), address(3), uint256(4));
        bytes memory r = abi.encodePacked(Rel1.MAGIC, Rel1.KIND_PAYMENT, body);

        vm.expectRevert(abi.encodeWithSelector(Rel1.Rel1Malformed.selector, r.length));
        codec.decodePayment(r);
    }

    function test_magicIsAsciiREL1() public pure {
        assertEq(Rel1.MAGIC, bytes4("REL1"));
    }
}
