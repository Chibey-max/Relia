// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title REL1 — Relia's versioned cross-chain record codec
/// @notice Every fact Relia proves across chains is carried as a REL1 record.
///         A record is `MAGIC (4 bytes) || KIND (1 byte) || abi.encode(fields)`.
///
///         The version prefix is load-bearing, not decoration. `ProofConsumer`
///         runs on Creditcoin and decodes bytes that were emitted on Sepolia by
///         a contract it cannot introspect. The magic is what lets it refuse a
///         payload that is well-formed ABI but is not a Relia record, and the
///         kind byte is what stops a payment record being replayed into the
///         slot where an acknowledgement is expected.
///
///         Both are checked before any field is trusted.
library Rel1 {
    /// @dev ASCII "REL1".
    bytes4 internal constant MAGIC = 0x52454c31;

    uint8 internal constant KIND_PAYMENT = 0x01;
    uint8 internal constant KIND_ACK = 0x02;

    /// @dev A record must carry at least the 5-byte header.
    uint256 internal constant HEADER_LEN = 5;

    /// @dev Payment body: assetId, n, shop, buyer, payer, amount -> 6 * 32 bytes.
    uint256 internal constant PAYMENT_BODY_LEN = 192;

    /// @dev Ack body: assetId, n, payTx, shop -> 4 * 32 bytes.
    uint256 internal constant ACK_BODY_LEN = 128;

    /// @notice A proven installment payment made on the source chain.
    struct Payment {
        bytes32 assetId;
        uint8 n;
        address shop;
        address buyer;
        address payer;
        uint256 amount;
    }

    /// @notice A shop's acknowledgement that it received a specific payment.
    struct Ack {
        bytes32 assetId;
        uint8 n;
        bytes32 payTx;
        address shop;
    }

    /// @notice The payload is shorter than a REL1 header, or its body length is
    ///         not exactly what the declared kind requires.
    error Rel1Malformed(uint256 length);

    /// @notice The payload does not begin with "REL1". Explicitly carries what
    ///         was found so a future REL2 reader can report it usefully.
    error Rel1BadVersion(bytes4 found);

    /// @notice The payload is a valid REL1 record, but of the wrong kind for
    ///         the slot it was supplied in (e.g. an Ack where a Payment is due).
    error Rel1WrongKind(uint8 expected, uint8 found);

    // ---------------------------------------------------------------- encode

    function encodePayment(Payment memory p) internal pure returns (bytes memory) {
        return abi.encodePacked(
            MAGIC, KIND_PAYMENT, abi.encode(p.assetId, uint256(p.n), p.shop, p.buyer, p.payer, p.amount)
        );
    }

    function encodeAck(Ack memory a) internal pure returns (bytes memory) {
        return abi.encodePacked(MAGIC, KIND_ACK, abi.encode(a.assetId, uint256(a.n), a.payTx, a.shop));
    }

    // ---------------------------------------------------------------- decode

    /// @notice Validates the header and returns the record's kind and body.
    /// @dev Reverts before the body is touched if the magic is wrong, so a
    ///      non-Relia payload can never be partially interpreted.
    function readHeader(bytes memory record) internal pure returns (uint8 kind, bytes memory body) {
        if (record.length < HEADER_LEN) revert Rel1Malformed(record.length);

        bytes4 magic;
        assembly {
            magic := mload(add(record, 32))
        }
        if (magic != MAGIC) revert Rel1BadVersion(magic);

        kind = uint8(record[4]);

        uint256 bodyLen = record.length - HEADER_LEN;
        body = new bytes(bodyLen);
        for (uint256 i = 0; i < bodyLen; i++) {
            body[i] = record[HEADER_LEN + i];
        }
    }

    function decodePayment(bytes memory record) internal pure returns (Payment memory p) {
        (uint8 kind, bytes memory body) = readHeader(record);
        if (kind != KIND_PAYMENT) revert Rel1WrongKind(KIND_PAYMENT, kind);
        if (body.length != PAYMENT_BODY_LEN) revert Rel1Malformed(record.length);

        (bytes32 assetId, uint256 n, address shop, address buyer, address payer, uint256 amount) =
            abi.decode(body, (bytes32, uint256, address, address, address, uint256));

        // `n` travels as a uint256 word so the body length is fixed and
        // checkable, but it is a slice index and must fit the domain.
        if (n > type(uint8).max) revert Rel1Malformed(record.length);

        // Safe: the line above rejects any n outside the uint8 domain.
        // forge-lint: disable-next-line(unsafe-typecast)
        p = Payment(assetId, uint8(n), shop, buyer, payer, amount);
    }

    function decodeAck(bytes memory record) internal pure returns (Ack memory a) {
        (uint8 kind, bytes memory body) = readHeader(record);
        if (kind != KIND_ACK) revert Rel1WrongKind(KIND_ACK, kind);
        if (body.length != ACK_BODY_LEN) revert Rel1Malformed(record.length);

        (bytes32 assetId, uint256 n, bytes32 payTx, address shop) =
            abi.decode(body, (bytes32, uint256, bytes32, address));

        if (n > type(uint8).max) revert Rel1Malformed(record.length);

        // Safe: the line above rejects any n outside the uint8 domain.
        // forge-lint: disable-next-line(unsafe-typecast)
        a = Ack(assetId, uint8(n), payTx, shop);
    }
}
