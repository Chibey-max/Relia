// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {LibTxHash} from "../lib/LibTxHash.sol";
import {CommonTx, Type2Fields, AccessListEntry} from "../creditcoin/interfaces/IAttestcoin.sol";

/// @notice Checks LibTxHash against real EIP-1559 transactions signed offline
///         by ethers (tools/gen-tx-vectors.mjs). The expected hashes come from
///         an independent implementation, so a bug in the RLP encoder cannot
///         hide behind a matching bug in the test.
contract LibTxHashTest is Test {
    using stdJson for string;

    string internal json;
    uint256 internal count;

    function setUp() public {
        json = vm.readFile("test-vectors/type2-tx.json");
        while (vm.keyExistsJson(json, _path(count, "hash"))) {
            count++;
        }
    }

    function _path(uint256 i, string memory field) internal pure returns (string memory) {
        return string.concat("$[", vm.toString(i), "].", field);
    }

    function _common(uint256 i) internal view returns (CommonTx memory) {
        return CommonTx({
            nonce: uint64(json.readUint(_path(i, "nonce"))),
            gasLimit: uint64(json.readUint(_path(i, "gasLimit"))),
            from: json.readAddress(_path(i, "from")),
            toIsNull: false,
            to: json.readAddress(_path(i, "to")),
            value: json.readUint(_path(i, "value")),
            data: json.readBytes(_path(i, "data"))
        });
    }

    function _type2(uint256 i) internal view returns (Type2Fields memory) {
        return Type2Fields({
            chainId: uint64(json.readUint(_path(i, "chainId"))),
            maxPriorityFeePerGas: uint128(json.readUint(_path(i, "maxPriorityFeePerGas"))),
            maxFeePerGas: uint128(json.readUint(_path(i, "maxFeePerGas"))),
            accessList: new AccessListEntry[](0),
            yParity: uint8(json.readUint(_path(i, "yParity"))),
            r: json.readBytes32(_path(i, "r")),
            s: json.readBytes32(_path(i, "s"))
        });
    }

    function test_matchesEthersSignedHashes() public view {
        assertGt(count, 0, "no vectors loaded");

        for (uint256 i = 0; i < count; i++) {
            assertEq(
                LibTxHash.type2Hash(_common(i), _type2(i)),
                json.readBytes32(_path(i, "hash")),
                json.readString(_path(i, "label"))
            );
        }
    }

    function test_accessListIsRefusedNotMishashed() public {
        Type2Fields memory t2 = _type2(0);
        AccessListEntry[] memory al = new AccessListEntry[](1);
        al[0] = AccessListEntry({account: address(0xABCD), storageKeys: new bytes32[](0)});
        t2.accessList = al;

        vm.expectRevert(LibTxHash.AccessListUnsupported.selector);
        this.hash(_common(0), t2);
    }

    function test_contractCreationIsRefused() public {
        CommonTx memory c = _common(0);
        c.toIsNull = true;
        c.to = address(0);

        vm.expectRevert(LibTxHash.ContractCreationUnsupported.selector);
        this.hash(c, _type2(0));
    }

    /// @dev Any single-field change must change the hash. This is what stops
    ///      one transaction's fields being passed off as another's.
    function test_anyFieldChangeChangesTheHash() public view {
        CommonTx memory c = _common(0);
        Type2Fields memory t2 = _type2(0);
        bytes32 base = LibTxHash.type2Hash(c, t2);

        c.nonce += 1;
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "nonce");
        c = _common(0);

        c.value += 1;
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "value");
        c = _common(0);

        c.to = address(uint160(c.to) + 1);
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "to");
        c = _common(0);

        c.data = abi.encodePacked(c.data, uint8(0));
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "data");
        c = _common(0);

        t2.chainId += 1;
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "chainId");
        t2 = _type2(0);

        t2.yParity = t2.yParity == 0 ? 1 : 0;
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "yParity");
        t2 = _type2(0);

        t2.r = bytes32(uint256(t2.r) ^ 1);
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "r");
        t2 = _type2(0);

        t2.s = bytes32(uint256(t2.s) ^ 1);
        assertTrue(LibTxHash.type2Hash(c, t2) != base, "s");
    }

    function hash(CommonTx memory c, Type2Fields memory t) external pure returns (bytes32) {
        return LibTxHash.type2Hash(c, t);
    }
}
