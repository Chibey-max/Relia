// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AssetRegistry} from "../creditcoin/AssetRegistry.sol";

/// @notice Lists an asset on Creditcoin. Run this FIRST — the registry derives
///         the assetId, and RegisterShop.s.sol on Sepolia needs that id.
///
///         forge script contracts/script/ListAsset.s.sol \
///           --rpc-url creditcoin --broadcast
///
/// @dev WINDOW_SPACING_SECONDS controls how far apart the twelve deadlines sit.
///      The default is 30 days, which is the real product shape. For a demo,
///      set it to something small (300) so a window actually closes on camera
///      and the Shortfall and Disputed rows become reachable in a live run.
contract ListAsset is Script {
    function run() external {
        AssetRegistry registry = AssetRegistry(vm.envAddress("CTC_ASSET_REGISTRY"));

        uint8 kind = uint8(vm.envOr("ASSET_KIND", uint256(0))); // GENERATOR
        uint256 installment = vm.envOr("INSTALLMENT_AMOUNT", uint256(40_000_000));
        uint256 spacing = vm.envOr("WINDOW_SPACING_SECONDS", uint256(30 days));

        address shopCtc = vm.envAddress("SHOP_CTC");
        address shopSepolia = vm.envAddress("SHOP_SEPOLIA");
        address buyer = vm.envAddress("BUYER");

        uint64[12] memory windows;
        for (uint256 i = 0; i < 12; i++) {
            // Safe: a unix timestamp plus a schedule fits uint64 until the
            // year 292277026596.
            // forge-lint: disable-next-line(unsafe-typecast)
            windows[i] = uint64(block.timestamp + spacing * (i + 1));
        }

        vm.startBroadcast();
        bytes32 assetId = registry.list(kind, installment, windows, shopCtc, shopSepolia, buyer);
        vm.stopBroadcast();

        console2.log("ASSET_ID=%s", vm.toString(assetId));
        console2.log("  kind        %s", kind);
        console2.log("  installment %s", installment);
        console2.log("  buyer       %s", buyer);
        console2.log("  shopSepolia %s", shopSepolia);
        console2.log("  slice 1 window closes at %s", windows[0]);
        console2.log("");
        console2.log("Next: export ASSET_ID and run RegisterShop.s.sol against Sepolia.");
        console2.log("The shop binding must match on both chains or consume() refuses");
        console2.log("with ShopMismatch.");
    }
}
