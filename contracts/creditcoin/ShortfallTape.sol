// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AssetRegistry} from "./AssetRegistry.sol";

/// @title ShortfallTape — the portable record, including the parts a shop dislikes
/// @notice Append-only. Every transition is written as a new entry and nothing
///         is ever edited or removed, because the whole point of the tape is
///         that a buyer can carry it to the next shop and the next shop can
///         believe it.
///
///         The `Disputed` state is a deliberate departure from the original
///         design, which wrote `Shortfall` whenever a window closed without a
///         valid batch and let the shop reclaim. That rule is exploitable: a
///         shop takes the payment on Sepolia, never acknowledges it, waits for
///         the window to lapse, reclaims the slice, and leaves a false miss on
///         the record of a buyer who actually paid. It converts the shop's own
///         silence into evidence against the buyer.
///
///         So the two cases are separated by what was actually proven:
///
///         | At windowEnd                  | State      | Reclaim |
///         |-------------------------------|------------|---------|
///         | No proven payment             | Shortfall  | allowed |
///         | Payment proven, no valid ack  | Disputed   | blocked |
///         | Valid batch consumed in time  | Live       | blocked |
///
///         In the `Disputed` case the buyer's payment hash is written to the
///         tape and shown publicly. The shop's failure to acknowledge becomes
///         the shop's problem, which is where it belongs.
contract ShortfallTape {
    enum Status {
        None,
        Due,
        Live,
        Shortfall,
        Disputed,
        Reclaimed
    }

    struct Slice {
        Status status;
        uint64 windowEnd;
        uint64 updatedAt;
        /// @dev Set by a proven payment, with or without an ack. This is the
        ///      field that makes a dispute legible.
        bytes32 payTx;
        bytes32 ackTx;
        address payer;
        /// @dev True once a payment has been proven for this slice, even if no
        ///      acknowledgement ever arrived.
        bool paymentProven;
    }

    /// @dev One append-only log entry. The tape is the history, not just the
    ///      current state.
    struct Entry {
        bytes32 assetId;
        uint8 n;
        Status status;
        uint64 at;
        bytes32 payTx;
        bytes32 ackTx;
    }

    AssetRegistry public immutable registry;

    address public consumer;
    address public immutable deployer;

    /// @dev slices[assetId][n], n in 1..12.
    mapping(bytes32 => mapping(uint8 => Slice)) internal _slices;

    Entry[] internal _entries;

    /// @dev Per-asset index into the append-only log, for cheap reads.
    mapping(bytes32 => uint256[]) internal _entriesOf;

    event SliceOpened(bytes32 indexed assetId, uint8 indexed n, uint64 windowEnd);
    event MarkedLive(bytes32 indexed assetId, uint8 indexed n, bytes32 payTx, bytes32 ackTx, address payer);
    event PaymentProven(bytes32 indexed assetId, uint8 indexed n, bytes32 payTx, address payer);
    event Settled(bytes32 indexed assetId, uint8 indexed n, Status status, bytes32 payTx);
    event Reclaimed(bytes32 indexed assetId, uint8 indexed n, address by);

    error NotConsumer(address caller);
    error NotRegistry(address caller);
    error ConsumerAlreadySet();
    error OnlyDeployer();
    error SliceOutOfRange(uint8 n);
    error SliceNotOpen(bytes32 assetId, uint8 n, Status status);
    error SliceAlreadyResolved(bytes32 assetId, uint8 n, Status status);
    error WindowStillOpen(bytes32 assetId, uint8 n, uint64 windowEnd, uint256 nowTs);

    /// @notice Refusal #7: a slice that was proven paid and acknowledged in
    ///         time is settled forever. The shop cannot take it back.
    error ReclaimBlockedLive(bytes32 assetId, uint8 n);

    /// @notice Refusal #8: the buyer proved they paid and the shop did not
    ///         acknowledge it. The shop does not get to profit from its own
    ///         silence.
    error ReclaimBlockedDisputed(bytes32 assetId, uint8 n, bytes32 payTx);

    error NotReclaimable(bytes32 assetId, uint8 n, Status status);

    constructor(AssetRegistry registry_) {
        registry = registry_;
        deployer = msg.sender;
    }

    /// @dev Set once, after ProofConsumer is deployed (they reference each
    ///      other, so one of the two links must be late-bound).
    function setConsumer(address consumer_) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (consumer != address(0)) revert ConsumerAlreadySet();
        consumer = consumer_;
    }

    modifier onlyConsumer() {
        if (msg.sender != consumer) revert NotConsumer(msg.sender);
        _;
    }

    /// @notice Open all 12 slices as `Due`. Callable by anyone for a listed
    ///         asset; it only ever writes the schedule the registry already
    ///         holds, and it refuses to touch a slice twice.
    function open(bytes32 assetId) external {
        uint64[12] memory windows = registry.allWindows(assetId);

        for (uint8 i = 0; i < 12; i++) {
            uint8 n = i + 1;
            Slice storage s = _slices[assetId][n];
            if (s.status != Status.None) revert SliceAlreadyResolved(assetId, n, s.status);

            s.status = Status.Due;
            s.windowEnd = windows[i];
            s.updatedAt = uint64(block.timestamp);

            _append(assetId, n, Status.Due, bytes32(0), bytes32(0));
            emit SliceOpened(assetId, n, windows[i]);
        }
    }

    /// @notice A full, valid batch was consumed inside the window.
    function markLive(bytes32 assetId, uint8 n, bytes32 payTx, bytes32 ackTx, address payer)
        external
        onlyConsumer
    {
        Slice storage s = _requireOpen(assetId, n);

        s.status = Status.Live;
        s.payTx = payTx;
        s.ackTx = ackTx;
        s.payer = payer;
        s.paymentProven = true;
        s.updatedAt = uint64(block.timestamp);

        _append(assetId, n, Status.Live, payTx, ackTx);
        emit MarkedLive(assetId, n, payTx, ackTx, payer);
    }

    /// @notice A payment was proven but no valid acknowledgement accompanied
    ///         it. The slice stays `Due` — the shop can still acknowledge
    ///         before the window closes — but the payment is now on the record,
    ///         and if the window closes this way the slice becomes `Disputed`
    ///         rather than `Shortfall`.
    function markPaymentProven(bytes32 assetId, uint8 n, bytes32 payTx, address payer)
        external
        onlyConsumer
    {
        Slice storage s = _requireOpen(assetId, n);

        s.paymentProven = true;
        s.payTx = payTx;
        s.payer = payer;
        s.updatedAt = uint64(block.timestamp);

        emit PaymentProven(assetId, n, payTx, payer);
    }

    /// @notice After a window closes, write the outcome. Callable by anyone —
    ///         the buyer has every reason to call it, and so does the shop.
    function settleWindow(bytes32 assetId, uint8 n) external {
        Slice storage s = _requireOpen(assetId, n);

        // Windows are day-scale; second-level validator drift is immaterial.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp <= s.windowEnd) {
            revert WindowStillOpen(assetId, n, s.windowEnd, block.timestamp);
        }

        Status outcome = s.paymentProven ? Status.Disputed : Status.Shortfall;
        s.status = outcome;
        s.updatedAt = uint64(block.timestamp);

        _append(assetId, n, outcome, s.payTx, bytes32(0));
        emit Settled(assetId, n, outcome, s.payTx);
    }

    /// @notice The shop reclaims a genuinely missed slice.
    /// @dev Reverts on `Live` and on `Disputed`. Both are required tests.
    function reclaim(bytes32 assetId, uint8 n) external {
        if (n == 0 || n > 12) revert SliceOutOfRange(n);
        Slice storage s = _slices[assetId][n];

        if (s.status == Status.Live) revert ReclaimBlockedLive(assetId, n);
        if (s.status == Status.Disputed) revert ReclaimBlockedDisputed(assetId, n, s.payTx);
        if (s.status != Status.Shortfall) revert NotReclaimable(assetId, n, s.status);

        s.status = Status.Reclaimed;
        s.updatedAt = uint64(block.timestamp);

        _append(assetId, n, Status.Reclaimed, s.payTx, bytes32(0));
        emit Reclaimed(assetId, n, msg.sender);
    }

    // ------------------------------------------------------------------ views

    function sliceOf(bytes32 assetId, uint8 n) external view returns (Slice memory) {
        if (n == 0 || n > 12) revert SliceOutOfRange(n);
        return _slices[assetId][n];
    }

    function entryCount() external view returns (uint256) {
        return _entries.length;
    }

    function entryAt(uint256 i) external view returns (Entry memory) {
        return _entries[i];
    }

    function entryCountOf(bytes32 assetId) external view returns (uint256) {
        return _entriesOf[assetId].length;
    }

    function entryOfAt(bytes32 assetId, uint256 i) external view returns (Entry memory) {
        return _entries[_entriesOf[assetId][i]];
    }

    // --------------------------------------------------------------- internal

    function _requireOpen(bytes32 assetId, uint8 n) internal view returns (Slice storage s) {
        if (n == 0 || n > 12) revert SliceOutOfRange(n);
        s = _slices[assetId][n];
        if (s.status == Status.None) revert SliceNotOpen(assetId, n, s.status);
        if (s.status != Status.Due) revert SliceAlreadyResolved(assetId, n, s.status);
    }

    function _append(bytes32 assetId, uint8 n, Status status, bytes32 payTx, bytes32 ackTx) internal {
        _entriesOf[assetId].push(_entries.length);
        _entries.push(
            Entry({
                assetId: assetId,
                n: n,
                status: status,
                at: uint64(block.timestamp),
                payTx: payTx,
                ackTx: ackTx
            })
        );
    }
}
