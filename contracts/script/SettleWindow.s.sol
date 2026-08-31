// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ShortfallTape} from "../creditcoin/ShortfallTape.sol";

/// @notice Writes the outcome of a closed window: Shortfall if nothing was
///         proven, Disputed if a payment was proven but never acknowledged.
///
///         forge script contracts/script/SettleWindow.s.sol \
///           --rpc-url creditcoin --broadcast
///
/// @dev Permissionless by design — the buyer has every reason to call it, and
///      so does the shop. Nothing on the tape moves to a red state until
///      someone does, so a demo that wants to show red rows has to run this.
contract SettleWindow is Script {
    function run() external {
        ShortfallTape tape = ShortfallTape(vm.envAddress("CTC_SHORTFALL_TAPE"));
        bytes32 assetId = vm.envBytes32("ASSET_ID");
        uint8 n = uint8(vm.envUint("SLICE"));

        vm.startBroadcast();
        tape.settleWindow(assetId, n);
        vm.stopBroadcast();

        ShortfallTape.Slice memory s = tape.sliceOf(assetId, n);
        console2.log("Slice %s settled as status %s", n, uint8(s.status));
        console2.log("  (2=Live 3=Shortfall 4=Disputed)");
        if (s.payTx != bytes32(0)) {
            console2.log("  payment on record: %s", vm.toString(s.payTx));
        }
    }
}
