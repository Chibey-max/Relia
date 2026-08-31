// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ReliaShopAck} from "../sepolia/ReliaShopAck.sol";

/// @notice Binds the shop to an asset on Sepolia, so it may acknowledge
///         payments for it. Run AFTER ListAsset.s.sol, with ASSET_ID set to
///         the id that script printed.
///
///         forge script contracts/script/RegisterShop.s.sol \
///           --rpc-url sepolia --broadcast
///
/// @dev This binding and the one held by AssetRegistry on Creditcoin must
///      name the same address. ProofConsumer checks the proven acknowledgement
///      against its OWN copy from the registry, so a mismatch here does not
///      become a lie there — it just means nothing can ever be proven.
contract RegisterShop is Script {
    function run() external {
        ReliaShopAck ack = ReliaShopAck(vm.envAddress("SEPOLIA_SHOP_ACK"));
        bytes32 assetId = vm.envBytes32("ASSET_ID");
        address shop = vm.envAddress("SHOP_SEPOLIA");

        vm.startBroadcast();
        ack.registerShop(assetId, shop);
        vm.stopBroadcast();

        console2.log("Registered shop %s for asset %s", shop, vm.toString(assetId));
    }
}
