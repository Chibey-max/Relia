// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Types and interfaces for the Attestcoin Protocol as deployed on
///         Creditcoin. Every struct here is transcribed field-for-field from
///         the ABIs shipped in `@gluwa/usc-sdk@0.18.0`
///         (`src/block-prover/block_prover.json`, `src/utils/evmV1DecoderAbi.json`).
///         See docs/gate-1-findings.md for the evidence trail.

// --------------------------------------------------------------- Block Prover

struct MerkleProofEntry {
    bytes32 hash;
    bool isLeft;
}

struct MerkleProof {
    bytes32 root;
    MerkleProofEntry[] siblings;
}

struct ContinuityProof {
    bytes32 lowerEndpointDigest;
    bytes32[] roots;
}

/// @notice The Block Prover precompile, canonically at
///         0x0000000000000000000000000000000000000FD2.
interface IBlockProver {
    /// @notice Verifies that each `encodedTransactions[i]` was included in the
    ///         finalized, attested block at `heights[i]` on chain `chainKey`.
    /// @dev The batch form shares one continuity proof across every query,
    ///      which is why Relia's two facts must live within one proof window.
    function verify(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata encodedTransactions,
        MerkleProof[] calldata merkleProofs,
        ContinuityProof calldata sharedContinuityProof
    ) external returns (bool);
}

// -------------------------------------------------------------------- Decoder

struct CommonTx {
    uint64 nonce;
    uint64 gasLimit;
    address from;
    bool toIsNull;
    address to;
    uint256 value;
    bytes data;
}

struct AccessListEntry {
    address account;
    bytes32[] storageKeys;
}

struct Type2Fields {
    uint64 chainId;
    uint128 maxPriorityFeePerGas;
    uint128 maxFeePerGas;
    AccessListEntry[] accessList;
    uint8 yParity;
    bytes32 r;
    bytes32 s;
}

/// @dev `address_` keeps the ABI's own field name; `address` is reserved.
struct EvmLog {
    address address_;
    bytes32[] topics;
    bytes data;
}

/// @notice The receipt half of an attested transaction.
/// @dev This struct is the whole reason Relia's status check is enforceable.
///      It is inside the bytes the Merkle root commits to.
struct Receipt {
    uint8 receiptStatus;
    uint64 receiptGasUsed;
    EvmLog[] receiptLogs;
    bytes receiptLogsBloom;
}

struct Type2Transaction {
    CommonTx commonTx;
    Type2Fields type2;
    Receipt receipt;
}

/// @notice The canonical EVM-v1 decoder deployed on Creditcoin.
interface IEvmV1Decoder {
    function getTransactionType(bytes calldata encodedTx) external view returns (uint8 txType);

    function decodeTransactionType2(bytes calldata chunk)
        external
        view
        returns (Type2Transaction memory);

    function getLogsByEventSignature(Receipt memory receipt, bytes32 eventSignature)
        external
        view
        returns (EvmLog[] memory);
}
