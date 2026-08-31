// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MockUSDC} from "../sepolia/MockUSDC.sol";
import {ReliaPaySink} from "../sepolia/ReliaPaySink.sol";
import {ReliaShopAck} from "../sepolia/ReliaShopAck.sol";
import {IERC20} from "../sepolia/IERC20.sol";

/// @notice forge script contracts/script/DeploySepolia.s.sol \
///           --rpc-url sepolia --broadcast --verify
contract DeploySepolia is Script {
    function run() external {
        uint256 installment = vm.envOr("INSTALLMENT_AMOUNT", uint256(40_000_000));

        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        ReliaPaySink sink = new ReliaPaySink(IERC20(address(usdc)), installment);
        ReliaShopAck ack = new ReliaShopAck();

        vm.stopBroadcast();

        console2.log("SEPOLIA_USDC=%s", address(usdc));
        console2.log("SEPOLIA_PAY_SINK=%s", address(sink));
        console2.log("SEPOLIA_SHOP_ACK=%s", address(ack));
        console2.log("INSTALLMENT_AMOUNT=%s", installment);
    }
}
