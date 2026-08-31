// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "./IERC20.sol";
import {Rel1} from "../lib/Rel1.sol";

/// @title ReliaPaySink — where installment money actually lands
/// @notice Settlement honesty: USDC paid here stays here, on Sepolia, and is
///         forwarded to the shop. Creditcoin never holds the money. It holds
///         the title and the tape. Nothing in Relia bridges a dollar.
///
///         This contract's only job beyond moving the money is to emit a
///         `Paid` event that is precise enough to be proven on another chain
///         weeks later, by a contract that has never heard of this one.
contract ReliaPaySink {
    /// @notice The settlement token (MockUSDC on Sepolia).
    IERC20 public immutable token;

    /// @notice Amount required per installment, in token units (6 decimals).
    uint256 public immutable installmentAmount;

    /// @notice The proven record of one installment payment.
    /// @dev `assetId` and `n` are indexed so the worker can filter cheaply.
    ///      Everything the Creditcoin side must trust travels in `rel1`, whose
    ///      first five bytes are the REL1 header. ProofConsumer reads this
    ///      event out of the proven receipt — never the calldata.
    /// @param rel1 A `Rel1.KIND_PAYMENT` record.
    event Paid(bytes32 indexed assetId, uint8 indexed n, bytes rel1);

    error ZeroShop();
    error TransferFailed();
    error ZeroBuyer();
    error SliceOutOfRange(uint8 n);

    constructor(IERC20 token_, uint256 installmentAmount_) {
        token = token_;
        installmentAmount = installmentAmount_;
    }

    /// @notice Pay installment `n` of `assetId` on behalf of `buyer`.
    /// @dev Any address may pay for any buyer. This is the family rule and it
    ///      is deliberate: a son in Lagos paying his mother's generator slice
    ///      is the normal case, not an attack. The payer is recorded in the
    ///      REL1 record so the tape can show who actually paid, but it is
    ///      never required to equal the buyer.
    ///
    ///      Slices are 1..12. Slice 0 is not payable — it is the pre-title
    ///      state of a fresh asset.
    function pay(bytes32 assetId, uint8 n, address shop, address buyer) external {
        if (shop == address(0)) revert ZeroShop();
        if (buyer == address(0)) revert ZeroBuyer();
        if (n == 0 || n > 12) revert SliceOutOfRange(n);

        uint256 amount = installmentAmount;

        // Pull from the payer, forward to the shop. The money never rests here.
        // Returns are checked: a token that reports failure without reverting
        // must not be able to mint a Paid event out of nothing.
        if (!token.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        if (!token.transfer(shop, amount)) revert TransferFailed();

        bytes memory rel1 = Rel1.encodePayment(
            Rel1.Payment({
                assetId: assetId,
                n: n,
                shop: shop,
                buyer: buyer,
                payer: msg.sender,
                amount: amount
            })
        );

        emit Paid(assetId, n, rel1);
    }

    /// @notice topic0 of `Paid`. Exposed so the Creditcoin side and the worker
    ///         can be checked against the same constant rather than a literal
    ///         copied between chains.
    function paidTopic() external pure returns (bytes32) {
        return keccak256("Paid(bytes32,uint8,bytes)");
    }
}
