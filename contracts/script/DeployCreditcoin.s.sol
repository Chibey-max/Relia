// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AssetRegistry} from "../creditcoin/AssetRegistry.sol";
import {ShortfallTape} from "../creditcoin/ShortfallTape.sol";
import {TitlePass} from "../creditcoin/TitlePass.sol";
import {ProofConsumer} from "../creditcoin/ProofConsumer.sol";
import {IBlockProver, IEvmV1Decoder} from "../creditcoin/interfaces/IAttestcoin.sol";

/// @notice forge script contracts/script/DeployCreditcoin.s.sol \
///           --rpc-url creditcoin --broadcast
///
/// @dev SOURCE_CHAIN_KEY must be the value discovered from the ChainInfo
///      precompile, not a guess. Run `npm run chainkey` in worker/ first —
///      it reads get_supported_chains() and prints the key whose chainId is
///      Sepolia's 11155111. See docs/gate-2-constants.md for why the value
///      1 from the original research table is almost certainly wrong.
contract DeployCreditcoin is Script {
    address constant BLOCK_PROVER = 0x0000000000000000000000000000000000000FD2;

    function run() external {
        uint64 sourceChainKey = uint64(vm.envUint("SOURCE_CHAIN_KEY"));
        address decoder = vm.envAddress("CREDITCOIN_DECODER");
        address paySink = vm.envAddress("SEPOLIA_PAY_SINK");
        address shopAck = vm.envAddress("SEPOLIA_SHOP_ACK");
        address blockProver = vm.envOr("CREDITCOIN_BLOCK_PROVER", BLOCK_PROVER);

        vm.startBroadcast();

        AssetRegistry registry = new AssetRegistry();
        ShortfallTape tape = new ShortfallTape(registry);
        TitlePass pass = new TitlePass();

        ProofConsumer consumer = new ProofConsumer(
            IBlockProver(blockProver),
            IEvmV1Decoder(decoder),
            registry,
            tape,
            pass,
            sourceChainKey,
            paySink,
            shopAck
        );

        // The four contracts reference each other; these are the late-bound
        // links, each settable exactly once by the deployer.
        registry.wire(pass, tape);
        tape.setConsumer(address(consumer));
        pass.setConsumer(address(consumer));
        pass.setRegistrar(address(registry));

        vm.stopBroadcast();

        console2.log("CTC_ASSET_REGISTRY=%s", address(registry));
        console2.log("CTC_SHORTFALL_TAPE=%s", address(tape));
        console2.log("CTC_TITLE_PASS=%s", address(pass));
        console2.log("CTC_PROOF_CONSUMER=%s", address(consumer));
        console2.log("SOURCE_CHAIN_KEY=%s", sourceChainKey);
    }
}
