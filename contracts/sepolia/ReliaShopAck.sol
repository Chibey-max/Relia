// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Rel1} from "../lib/Rel1.sol";

/// @title ReliaShopAck — the shop's half of the fact
/// @notice A payment alone does not move title. The shop must separately say,
///         in its own Sepolia transaction, "I received *that* payment". Two
///         independent facts from two independent senders is what makes the
///         batch worth proving — a single event could be forged by whoever
///         controls one key.
///
///         This is a real transaction on purpose. An off-chain signature would
///         be cheaper and would prove nothing to Attestcoin.
contract ReliaShopAck {
    /// @notice Which shop is allowed to acknowledge for which asset.
    /// @dev Registered on Sepolia because that is where the ack is sent. The
    ///      Creditcoin registry holds the same binding, and ProofConsumer
    ///      checks the proven ack against *its own* copy — so a lie here does
    ///      not become a lie there.
    mapping(bytes32 => address) public shopOf;

    /// @notice Set once per asset, by the shop itself.
    /// @dev First-write-once, but self-registration only: `registerShop`
    ///      requires `msg.sender == shop`, so a third party can no longer
    ///      squat another shop's binding by front-running its registration
    ///      transaction. The binding that actually gates title still lives on
    ///      Creditcoin in AssetRegistry, and ProofConsumer cross-checks a
    ///      proven ack against that copy — a lie here still can't move title.
    event ShopRegistered(bytes32 indexed assetId, address indexed shop);

    /// @param rel1 A `Rel1.KIND_ACK` record citing the exact payment tx hash.
    event Acked(bytes32 indexed assetId, uint8 indexed n, bytes rel1);

    error AlreadyRegistered(bytes32 assetId, address shop);
    error NotTheShop(bytes32 assetId, address expected, address caller);
    error ZeroShop();
    error SliceOutOfRange(uint8 n);
    error ZeroPayTx();
    error NotTheRegisteringShop(address shop, address caller);

    /// @notice Register `msg.sender` as the shop for `assetId`.
    /// @dev Only the shop can claim its own slot — this closes the
    ///      front-run where an observer registers a newly-listed assetId to
    ///      an address the real shop does not control before the real shop's
    ///      own registration transaction lands.
    function registerShop(bytes32 assetId, address shop) external {
        if (shop == address(0)) revert ZeroShop();
        if (msg.sender != shop) revert NotTheRegisteringShop(shop, msg.sender);
        address current = shopOf[assetId];
        if (current != address(0)) revert AlreadyRegistered(assetId, current);
        shopOf[assetId] = shop;
        emit ShopRegistered(assetId, shop);
    }

    /// @notice Acknowledge that payment `payTx` settled installment `n`.
    /// @param payTx The Sepolia transaction hash of the `pay()` call. This is
    ///        the citation that binds the two facts together; ProofConsumer
    ///        recomputes the payment's true hash and refuses anything else.
    function ack(bytes32 assetId, uint8 n, bytes32 payTx) external {
        address shop = shopOf[assetId];
        if (msg.sender != shop) revert NotTheShop(assetId, shop, msg.sender);
        if (n == 0 || n > 12) revert SliceOutOfRange(n);
        if (payTx == bytes32(0)) revert ZeroPayTx();

        bytes memory rel1 =
            Rel1.encodeAck(Rel1.Ack({assetId: assetId, n: n, payTx: payTx, shop: shop}));

        emit Acked(assetId, n, rel1);
    }

    /// @notice topic0 of `Acked`.
    function ackedTopic() external pure returns (bytes32) {
        return keccak256("Acked(bytes32,uint8,bytes)");
    }
}
