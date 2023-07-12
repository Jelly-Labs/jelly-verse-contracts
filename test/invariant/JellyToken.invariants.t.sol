// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {JellyToken} from "../../contracts/JellyToken.sol";

contract InvariantJellyToken is StdInvariant, Test {
    JellyToken public jellyToken;

    uint256 internal constant cap = 1_000_000_000;

    address internal owner;
    address internal vesting;
    address internal vestingJelly;
    address internal allocator;

    function setUp() public {
        owner = makeAddr("owner");
        vesting = makeAddr("vesting");
        vestingJelly = makeAddr("vestingJelly");
        allocator = makeAddr("allocator");

        jellyToken = new JellyToken(vesting, vestingJelly, allocator);
        targetContract(address(jellyToken));
    }

    function invariant_supplyAlwaysBellowCap() public {
        assertLe(jellyToken.totalSupply(), cap * 10 ** 18);
    }
}
