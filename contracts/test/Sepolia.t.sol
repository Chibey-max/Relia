// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {ReliaShopAck} from "../sepolia/ReliaShopAck.sol";
import {ReliaPaySink} from "../sepolia/ReliaPaySink.sol";
import {MockUSDC} from "../sepolia/MockUSDC.sol";
import {IERC20} from "../sepolia/IERC20.sol";
import {TitlePass, IERC721Receiver} from "../creditcoin/TitlePass.sol";

/// @notice Coverage for the two contract-level findings fixed alongside this
///         test file: ReliaShopAck.registerShop can no longer be front-run by
///         a third party, and TitlePass.safeTransferFrom now actually checks
///         IERC721Receiver instead of aliasing transferFrom.
contract SepoliaTest is Test {
    ReliaShopAck ack;
    ReliaPaySink sink;
    MockUSDC usdc;

    address constant SHOP = address(0xBEEF);
    address constant IMPOSTOR = address(0xBAD1);
    address constant BUYER = address(0xCAFE);
    bytes32 constant ASSET_ID = keccak256("asset-1");
    uint256 constant INSTALLMENT = 40_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        sink = new ReliaPaySink(IERC20(address(usdc)), INSTALLMENT);
        ack = new ReliaShopAck();
    }

    // ------------------------------------------------- registerShop front-run

    function test_shopCanRegisterItself() public {
        vm.prank(SHOP);
        ack.registerShop(ASSET_ID, SHOP);
        assertEq(ack.shopOf(ASSET_ID), SHOP);
    }

    /// @notice The bug this closes: previously any address could call
    ///         registerShop(assetId, someoneElsesAddress) and permanently
    ///         squat the binding, since the only check was "is it empty".
    function test_thirdPartyCannotRegisterAnotherAddressAsShop() public {
        vm.prank(IMPOSTOR);
        vm.expectRevert(abi.encodeWithSelector(ReliaShopAck.NotTheRegisteringShop.selector, SHOP, IMPOSTOR));
        ack.registerShop(ASSET_ID, SHOP);
        assertEq(ack.shopOf(ASSET_ID), address(0));
    }

    function test_registrationIsStillFirstWriteOnce() public {
        vm.prank(SHOP);
        ack.registerShop(ASSET_ID, SHOP);

        vm.prank(SHOP);
        vm.expectRevert(abi.encodeWithSelector(ReliaShopAck.AlreadyRegistered.selector, ASSET_ID, SHOP));
        ack.registerShop(ASSET_ID, SHOP);
    }

    function test_onlyRegisteredShopCanAck() public {
        vm.prank(SHOP);
        ack.registerShop(ASSET_ID, SHOP);

        vm.prank(IMPOSTOR);
        vm.expectRevert(abi.encodeWithSelector(ReliaShopAck.NotTheShop.selector, ASSET_ID, SHOP, IMPOSTOR));
        ack.ack(ASSET_ID, 1, bytes32(uint256(1)));
    }

    // --------------------------------------------------------------- pay sink

    function test_anyoneMayPayOnBehalfOfTheBuyer() public {
        address payer = address(0x5011);
        usdc.mint(payer, INSTALLMENT);
        vm.prank(payer);
        usdc.approve(address(sink), INSTALLMENT);

        vm.prank(payer);
        sink.pay(ASSET_ID, 1, SHOP, BUYER);

        assertEq(usdc.balanceOf(SHOP), INSTALLMENT);
        assertEq(usdc.balanceOf(payer), 0);
    }

    function test_paySliceOutOfRangeIsRefused() public {
        vm.expectRevert(abi.encodeWithSelector(ReliaPaySink.SliceOutOfRange.selector, uint8(13)));
        sink.pay(ASSET_ID, 13, SHOP, BUYER);
    }

    // -------------------------------------------------------- safeTransferFrom

    /// @dev Minimal harness to reach a cleared, transferable title without
    ///      going through the full attestation pipeline — this file only
    ///      needs TitlePass's own transfer machinery, not ProofConsumer.
    function _clearedTitle() internal returns (TitlePass pass, uint256 tokenId) {
        pass = new TitlePass();
        pass.setConsumer(address(this));
        pass.setRegistrar(address(this));
        pass.mint(ASSET_ID, BUYER);
        tokenId = uint256(ASSET_ID);
        for (uint8 n = 1; n <= 12; n++) {
            pass.tick(ASSET_ID, n);
        }
        assertTrue(pass.isCleared(ASSET_ID));
    }

    function test_safeTransferFromToEOASucceeds() public {
        (TitlePass pass, uint256 tokenId) = _clearedTitle();
        address recipient = address(0xD00D);
        vm.prank(BUYER);
        pass.safeTransferFrom(BUYER, recipient, tokenId);
        assertEq(pass.ownerOf(tokenId), recipient);
    }

    /// @notice The bug this closes: previously safeTransferFrom was a bare
    ///         alias for transferFrom, so a title sent to a contract with no
    ///         onERC721Received implementation would move anyway and then be
    ///         stuck there forever (cleared titles have no recovery path).
    function test_safeTransferFromToNonReceiverContractReverts() public {
        (TitlePass pass, uint256 tokenId) = _clearedTitle();
        NonReceiver trap = new NonReceiver();
        vm.prank(BUYER);
        vm.expectRevert(abi.encodeWithSelector(TitlePass.NonERC721Receiver.selector, address(trap)));
        pass.safeTransferFrom(BUYER, address(trap), tokenId);
        // The revert must roll back the transfer too, not just the check.
        assertEq(pass.ownerOf(tokenId), BUYER);
    }

    function test_safeTransferFromToProperReceiverSucceeds() public {
        (TitlePass pass, uint256 tokenId) = _clearedTitle();
        GoodReceiver vault = new GoodReceiver();
        vm.prank(BUYER);
        pass.safeTransferFrom(BUYER, address(vault), tokenId);
        assertEq(pass.ownerOf(tokenId), address(vault));
    }

    function test_plainTransferFromStillSkipsTheReceiverCheck() public {
        (TitlePass pass, uint256 tokenId) = _clearedTitle();
        NonReceiver trap = new NonReceiver();
        // transferFrom (the non-safe path) intentionally has no receiver
        // check — ERC-721 only requires it on the safe variants.
        vm.prank(BUYER);
        pass.transferFrom(BUYER, address(trap), tokenId);
        assertEq(pass.ownerOf(tokenId), address(trap));
    }
}

contract NonReceiver {
    // Deliberately does not implement onERC721Received.
}

contract GoodReceiver is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
