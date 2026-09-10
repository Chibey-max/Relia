// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TitlePass} from "./TitlePass.sol";
import {ShortfallTape} from "./ShortfallTape.sol";

/// @title AssetRegistry — what is being bought, from whom, on what schedule
/// @notice The registry is the only place Relia decides what a payment is
///         *supposed* to look like. ProofConsumer never takes the shop, buyer
///         or amount from the proven event and believes it; it takes them from
///         here and refuses the event if they disagree.
contract AssetRegistry {
    enum AssetKind {
        GENERATOR,
        SOLAR,
        OKADA,
        SEW
    }

    /// @notice Slices are 1..12. Slice 0 is the pre-title state.
    uint8 public constant SLICES = 12;

    struct Asset {
        AssetKind kind;
        uint256 installment;
        address shopCtc;
        address shopSepolia;
        address buyer;
        bool exists;
    }

    mapping(bytes32 => Asset) internal _assets;

    /// @dev windowEnd[assetId][n] for n in 1..12; index 0 unused.
    mapping(bytes32 => uint64[13]) internal _windowEnd;

    uint256 public assetCount;

    address public immutable deployer;
    TitlePass public titlePass;
    ShortfallTape public tape;

    constructor() {
        deployer = msg.sender;
    }

    /// @dev The registry, tape, pass and consumer all reference each other, so
    ///      one link has to be late-bound. Set once, by the deployer, and
    ///      never again.
    function wire(TitlePass titlePass_, ShortfallTape tape_) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (address(titlePass) != address(0)) revert AlreadyWired();
        titlePass = titlePass_;
        tape = tape_;
    }

    event Listed(
        bytes32 indexed assetId,
        AssetKind indexed kind,
        address indexed buyer,
        address shopCtc,
        address shopSepolia,
        uint256 installment,
        uint64[12] windows
    );

    error UnknownAsset(bytes32 assetId);
    error ZeroInstallment();
    error ZeroAddressField(string field);
    error WindowsNotIncreasing(uint8 index);
    error WindowInThePast(uint8 index, uint64 windowEnd, uint256 nowTs);
    error SliceOutOfRange(uint8 n);
    error OnlyDeployer();
    error AlreadyWired();
    error NotWired();

    /// @notice Register an asset and its 12 payment windows.
    /// @param windows Absolute unix timestamps; `windows[i]` closes slice i+1.
    /// @return assetId Deterministic id, also the TitlePass token id.
    function list(
        uint8 assetKind,
        uint256 installment,
        uint64[12] calldata windows,
        address shopCtc,
        address shopSepolia,
        address buyer
    ) external returns (bytes32 assetId) {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (installment == 0) revert ZeroInstallment();
        if (shopCtc == address(0)) revert ZeroAddressField("shopCtc");
        if (shopSepolia == address(0)) revert ZeroAddressField("shopSepolia");
        if (buyer == address(0)) revert ZeroAddressField("buyer");

        // A schedule that runs backwards, or is already expired on arrival,
        // would make every slice unpayable and every window instantly
        // shortfallable. Refuse it at listing time rather than at settlement.
        for (uint8 i = 0; i < SLICES; i++) {
            // Payment windows are day-to-week scale deadlines. A validator
            // nudging the timestamp by seconds cannot change any outcome here.
            // forge-lint: disable-next-line(block-timestamp)
            if (windows[i] <= block.timestamp) {
                revert WindowInThePast(i + 1, windows[i], block.timestamp);
            }
            if (i > 0 && windows[i] <= windows[i - 1]) revert WindowsNotIncreasing(i + 1);
        }

        assetId = keccak256(abi.encode(block.chainid, address(this), assetCount, buyer, shopCtc));
        assetCount += 1;

        _assets[assetId] = Asset({
            kind: AssetKind(assetKind),
            installment: installment,
            shopCtc: shopCtc,
            shopSepolia: shopSepolia,
            buyer: buyer,
            exists: true
        });

        for (uint8 i = 0; i < SLICES; i++) {
            _windowEnd[assetId][i + 1] = windows[i];
        }

        if (address(titlePass) == address(0)) revert NotWired();

        // Issue the empty pass and open all twelve slices as Due. A listed
        // asset is fully represented on-chain from this moment; what does not
        // exist yet is any *proven* slice.
        titlePass.mint(assetId, buyer);
        tape.open(assetId);

        emit Listed(assetId, AssetKind(assetKind), buyer, shopCtc, shopSepolia, installment, windows);
    }

    function getAsset(bytes32 assetId) external view returns (Asset memory) {
        Asset memory a = _assets[assetId];
        if (!a.exists) revert UnknownAsset(assetId);
        return a;
    }

    function exists(bytes32 assetId) external view returns (bool) {
        return _assets[assetId].exists;
    }

    function windowEnd(bytes32 assetId, uint8 n) external view returns (uint64) {
        if (!_assets[assetId].exists) revert UnknownAsset(assetId);
        if (n == 0 || n > SLICES) revert SliceOutOfRange(n);
        return _windowEnd[assetId][n];
    }

    function allWindows(bytes32 assetId) external view returns (uint64[12] memory out) {
        if (!_assets[assetId].exists) revert UnknownAsset(assetId);
        for (uint8 i = 0; i < SLICES; i++) {
            out[i] = _windowEnd[assetId][i + 1];
        }
    }
}
