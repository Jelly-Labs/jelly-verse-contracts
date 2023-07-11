// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {JellyToken} from "../../contracts/JellyToken.sol";

contract InvariantJellyToken is StdInvariant, Test {
    JellyToken public jellyToken;

    uint256 internal constant cap = 1_000_000_000;

    address internal owner = vm.addr(0x1);
    address internal vesting = vm.addr(0x2);
    address internal vestingJelly = vm.addr(0x3);
    address internal allocator = vm.addr(0x3);

    function setUp() public {
        jellyToken = new JellyToken(cap, vesting, vestingJelly, allocator);
        targetContract(address(jellyToken));
    }

    function invariant_supplyAlwaysBellowCap() public {
        assertLe(jellyToken.totalSupply(), cap * 10 ** 18);
    }
}
