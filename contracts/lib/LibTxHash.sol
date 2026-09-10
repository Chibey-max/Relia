// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LibRLP} from "./LibRLP.sol";
import {
    CommonTx,
    Type2Fields,
    Type4Fields,
    AuthorizationListEntry,
    AccessListEntry
} from "../creditcoin/interfaces/IAttestcoin.sol";

/// @title LibTxHash — recover a source-chain transaction hash from its decoded fields
/// @notice The Block Prover attests to a transaction's *contents*, not to its
///         hash. That leaves a gap Relia cannot afford: the shop's ack cites a
///         payment by transaction hash, and without a hash to compare it to,
///         "the ack cites exactly this payment" would be an unchecked claim
///         and `consumed[payTx]` would be keyed on something the worker made up.
///
///         So Relia rebuilds the canonical EIP-1559 serialization from the
///         proven fields and hashes it:
///
///             txHash = keccak256(0x02 || rlp([chainId, nonce,
///                 maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value,
///                 data, accessList, yParity, r, s]))
///
///         Every input comes from the attested payload, so the result is as
///         trustworthy as the proof itself.
library LibTxHash {
    /// @notice Relia's own transactions never carry an access list, and
    ///         supporting one would add a nested-list encoder for no benefit.
    ///         A payment that carries one is refused rather than mis-hashed.
    error AccessListUnsupported();

    /// @notice Contract-creation transactions have no `to` and cannot be a
    ///         Relia payment or acknowledgement.
    error ContractCreationUnsupported();

    function type2Hash(CommonTx memory common, Type2Fields memory t2)
        internal
        pure
        returns (bytes32)
    {
        if (t2.accessList.length != 0) revert AccessListUnsupported();
        if (common.toIsNull) revert ContractCreationUnsupported();

        // Built in stages: a single 12-argument encodePacked puts every
        // encoded field on the stack at once and overflows it.
        bytes memory payload = abi.encodePacked(
            LibRLP.encodeUint(t2.chainId),
            LibRLP.encodeUint(common.nonce),
            LibRLP.encodeUint(t2.maxPriorityFeePerGas),
            LibRLP.encodeUint(t2.maxFeePerGas)
        );
        payload = abi.encodePacked(
            payload,
            LibRLP.encodeUint(common.gasLimit),
            LibRLP.encodeAddress(common.to),
            LibRLP.encodeUint(common.value),
            LibRLP.encodeBytes(common.data)
        );
        payload = abi.encodePacked(
            payload,
            // Empty access list: an empty RLP list.
            hex"c0",
            LibRLP.encodeUint(t2.yParity),
            LibRLP.encodeBytes32AsScalar(t2.r),
            LibRLP.encodeBytes32AsScalar(t2.s)
        );

        return keccak256(abi.encodePacked(uint8(0x02), LibRLP.encodeList(payload)));
    }

    function type4Hash(CommonTx memory common, Type4Fields memory t4)
        internal
        pure
        returns (bytes32)
    {
        if (t4.accessList.length != 0) revert AccessListUnsupported();
        if (common.toIsNull) revert ContractCreationUnsupported();

        bytes memory payload = abi.encodePacked(
            LibRLP.encodeUint(t4.chainId),
            LibRLP.encodeUint(common.nonce),
            LibRLP.encodeUint(t4.maxPriorityFeePerGas),
            LibRLP.encodeUint(t4.maxFeePerGas)
        );
        payload = abi.encodePacked(
            payload,
            LibRLP.encodeUint(common.gasLimit),
            LibRLP.encodeAddress(common.to),
            LibRLP.encodeUint(common.value),
            LibRLP.encodeBytes(common.data)
        );
        payload = abi.encodePacked(
            payload,
            hex"c0",
            _encodeAuthorizationList(t4.authorizationList),
            LibRLP.encodeUint(t4.yParity),
            LibRLP.encodeBytes32AsScalar(t4.r),
            LibRLP.encodeBytes32AsScalar(t4.s)
        );

        return keccak256(abi.encodePacked(uint8(0x04), LibRLP.encodeList(payload)));
    }

    function _encodeAuthorizationList(AuthorizationListEntry[] memory auths)
        private
        pure
        returns (bytes memory)
    {
        bytes memory payload;
        for (uint256 i = 0; i < auths.length; i++) {
            AuthorizationListEntry memory auth = auths[i];
            bytes memory entry = abi.encodePacked(
                LibRLP.encodeUint(auth.chainId),
                LibRLP.encodeAddress(auth.account),
                LibRLP.encodeUint(auth.nonce),
                LibRLP.encodeUint(auth.yParity),
                LibRLP.encodeUint(auth.r),
                LibRLP.encodeUint(auth.s)
            );
            payload = abi.encodePacked(payload, LibRLP.encodeList(entry));
        }
        return LibRLP.encodeList(payload);
    }
}
