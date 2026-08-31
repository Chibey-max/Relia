// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    IBlockProver,
    IEvmV1Decoder,
    MerkleProof,
    ContinuityProof,
    Type2Transaction,
    Type2Fields,
    CommonTx,
    AccessListEntry,
    Receipt,
    EvmLog
} from "../../creditcoin/interfaces/IAttestcoin.sol";

/// @notice Stands in for the Block Prover precompile. It cannot check Merkle
///         proofs — that is the precompile's job and it is not reimplementable
///         here — so it verifies what a test needs it to: that the batch was
///         handed over intact, and it can be made to reject.
contract MockBlockProver is IBlockProver {
    bool public shouldAccept = true;

    uint64 public lastChainKey;
    uint256 public lastBatchSize;
    ContinuityProof internal _lastContinuity;

    function setShouldAccept(bool v) external {
        shouldAccept = v;
    }

    function verify(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata encodedTransactions,
        MerkleProof[] calldata merkleProofs,
        ContinuityProof calldata sharedContinuityProof
    ) external override returns (bool) {
        require(heights.length == encodedTransactions.length, "length mismatch");
        require(heights.length == merkleProofs.length, "proof length mismatch");

        lastChainKey = chainKey;
        lastBatchSize = heights.length;
        _lastContinuity = sharedContinuityProof;

        return shouldAccept;
    }

    function lastContinuityRootCount() external view returns (uint256) {
        return _lastContinuity.roots.length;
    }
}

/// @notice A local reimplementation of Creditcoin's EVM-v1 decoder, written to
///         match the encoding in the gluwa usc-sdk v0.18.0
///         (`src/encoding/abi/v1.ts`): each attested leaf is
///         `abi.encode(uint8 txType, bytes[] chunks)`, and for a type-2
///         transaction the chunks are common fields, type-2 fields, and the
///         receipt.
///
///         Production points at the canonical deployed decoder. This exists so
///         the test suite exercises the real byte layout rather than a stub.
contract LocalEvmV1Decoder is IEvmV1Decoder {
    function getTransactionType(bytes calldata encodedTx) external pure override returns (uint8) {
        (uint8 txType,) = abi.decode(encodedTx, (uint8, bytes[]));
        return txType;
    }

    function decodeTransactionType2(bytes calldata encodedTx)
        external
        pure
        override
        returns (Type2Transaction memory t)
    {
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTx, (uint8, bytes[]));
        require(txType == 2, "not type 2");
        require(chunks.length == 3, "bad chunk count");

        // One helper per chunk: decoding all three inline puts every field on
        // the stack at once and overflows it.
        t.commonTx = _decodeCommon(chunks[0]);
        t.type2 = _decodeType2Fields(chunks[1]);
        t.receipt = _decodeReceipt(chunks[2]);
    }

    function _decodeCommon(bytes memory chunk) internal pure returns (CommonTx memory c) {
        (c.nonce, c.gasLimit, c.from, c.toIsNull, c.to, c.value, c.data) =
            abi.decode(chunk, (uint64, uint64, address, bool, address, uint256, bytes));
    }

    function _decodeType2Fields(bytes memory chunk) internal pure returns (Type2Fields memory f) {
        (f.chainId, f.maxPriorityFeePerGas, f.maxFeePerGas, f.accessList, f.yParity, f.r, f.s) =
            abi.decode(chunk, (uint64, uint128, uint128, AccessListEntry[], uint8, bytes32, bytes32));
    }

    function _decodeReceipt(bytes memory chunk) internal pure returns (Receipt memory r) {
        (r.receiptStatus, r.receiptGasUsed, r.receiptLogs, r.receiptLogsBloom) =
            abi.decode(chunk, (uint8, uint64, EvmLog[], bytes));
    }

    function getLogsByEventSignature(Receipt memory receipt, bytes32 eventSignature)
        external
        pure
        override
        returns (EvmLog[] memory out)
    {
        uint256 hits;
        for (uint256 i = 0; i < receipt.receiptLogs.length; i++) {
            if (receipt.receiptLogs[i].topics.length > 0 && receipt.receiptLogs[i].topics[0] == eventSignature) {
                hits++;
            }
        }

        out = new EvmLog[](hits);
        uint256 j;
        for (uint256 i = 0; i < receipt.receiptLogs.length; i++) {
            if (receipt.receiptLogs[i].topics.length > 0 && receipt.receiptLogs[i].topics[0] == eventSignature) {
                out[j++] = receipt.receiptLogs[i];
            }
        }
    }
}

/// @notice Builds attested-leaf bytes in the same format the SDK produces, so
///         tests can construct the exact payload the prover would attest to.
library AttestcoinEncoder {
    function encodeType2(CommonTx memory common, Type2Fields memory t2, Receipt memory receipt)
        internal
        pure
        returns (bytes memory)
    {
        bytes[] memory chunks = new bytes[](3);

        chunks[0] = abi.encode(
            common.nonce, common.gasLimit, common.from, common.toIsNull, common.to, common.value, common.data
        );
        chunks[1] = abi.encode(
            t2.chainId, t2.maxPriorityFeePerGas, t2.maxFeePerGas, t2.accessList, t2.yParity, t2.r, t2.s
        );
        chunks[2] =
            abi.encode(receipt.receiptStatus, receipt.receiptGasUsed, receipt.receiptLogs, receipt.receiptLogsBloom);

        return abi.encode(uint8(2), chunks);
    }
}
