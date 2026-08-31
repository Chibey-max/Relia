// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title LibRLP — minimal RLP encoder
/// @notice Only the encoding direction, and only what a type-2 transaction
///         needs. Relia uses this to rebuild a Sepolia transaction's canonical
///         serialization so its hash can be recomputed on Creditcoin.
library LibRLP {
    /// @notice RLP-encode a scalar. Scalars are minimal big-endian byte
    ///         strings, so leading zero bytes are stripped and zero is the
    ///         empty string.
    function encodeUint(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) return hex"80";
        // Safe: guarded by value < 0x80 on the line above.
        // forge-lint: disable-next-line(unsafe-typecast)
        if (value < 0x80) return abi.encodePacked(uint8(value));

        uint256 len = 0;
        uint256 v = value;
        while (v != 0) {
            len++;
            v >>= 8;
        }

        bytes memory out = new bytes(len);
        v = value;
        for (uint256 i = len; i > 0; i--) {
            // Intentional: takes the low byte while shifting the scalar down.
            // forge-lint: disable-next-line(unsafe-typecast)
            out[i - 1] = bytes1(uint8(v));
            v >>= 8;
        }
        return encodeBytes(out);
    }

    /// @notice RLP-encode a byte string.
    function encodeBytes(bytes memory value) internal pure returns (bytes memory) {
        uint256 len = value.length;
        if (len == 1 && uint8(value[0]) < 0x80) return value;
        // Safe: guarded by len <= 55, so 0x80 + len cannot exceed 0xb7.
        // forge-lint: disable-next-line(unsafe-typecast)
        if (len <= 55) return abi.encodePacked(uint8(0x80 + len), value);
        bytes memory lenBytes = _binaryLength(len);
        return abi.encodePacked(uint8(0xb7 + lenBytes.length), lenBytes, value);
    }

    /// @notice RLP-encode a 20-byte address as a byte string.
    function encodeAddress(address value) internal pure returns (bytes memory) {
        return abi.encodePacked(uint8(0x94), value);
    }

    /// @notice A 32-byte signature component is a scalar, not a fixed-width
    ///         string: leading zeros must be stripped or the hash is wrong.
    function encodeBytes32AsScalar(bytes32 value) internal pure returns (bytes memory) {
        return encodeUint(uint256(value));
    }

    /// @notice Wrap already-encoded items as an RLP list.
    /// @param payload The concatenation of the encoded items.
    function encodeList(bytes memory payload) internal pure returns (bytes memory) {
        uint256 len = payload.length;
        // Safe: guarded by len <= 55, so 0xc0 + len cannot exceed 0xf7.
        // forge-lint: disable-next-line(unsafe-typecast)
        if (len <= 55) return abi.encodePacked(uint8(0xc0 + len), payload);
        bytes memory lenBytes = _binaryLength(len);
        return abi.encodePacked(uint8(0xf7 + lenBytes.length), lenBytes, payload);
    }

    function _binaryLength(uint256 len) private pure returns (bytes memory) {
        uint256 n = 0;
        uint256 v = len;
        while (v != 0) {
            n++;
            v >>= 8;
        }
        bytes memory out = new bytes(n);
        v = len;
        for (uint256 i = n; i > 0; i--) {
            // Intentional: takes the low byte while shifting the length down.
            // forge-lint: disable-next-line(unsafe-typecast)
            out[i - 1] = bytes1(uint8(v));
            v >>= 8;
        }
        return out;
    }
}
