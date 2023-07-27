// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {VestingLib} from "../../contracts/utils/VestingLib.sol";
import {JellyToken} from "../../contracts/JellyToken.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract VestingTest is VestingLib {
    constructor(
        uint256 _amount,
        address _beneficiary,
        address _revoker,
        uint256 _startTimestamp,
        uint32 _cliffDuration,
        uint32 _vestingDuration,
        address _token
    )
        VestingLib(
            _amount,
            _beneficiary,
            _revoker,
            _startTimestamp,
            _cliffDuration,
            _vestingDuration,
            _token
        )
    {}
}

contract VestedAmountDifferentialTest is Test {
    using Strings for uint256;

    VestingTest vestingLib;
    JellyToken jellyToken;

    uint256 startTimestamp;
    uint256 cliffTimestamp;
    uint32 totalDuration;

    function setUp() public {
        uint256 amount = 133_000_000 * 10 ** 18;
        address beneficiary = makeAddr("beneficiary");
        address revoker = makeAddr("revoker");
        uint32 cliffDuration = 15778458; // 6 months
        uint32 vestingDuration = 47335374; // 18 months

        startTimestamp = block.timestamp;
        cliffTimestamp = startTimestamp + cliffDuration;
        totalDuration = cliffDuration + vestingDuration;

        address vesting = makeAddr("vesting");
        address vestingJelly = makeAddr("vestingJelly");
        address allocator = makeAddr("allocator");

        jellyToken = new JellyToken(vesting, vestingJelly, allocator);

        vestingLib = new VestingTest(
            amount,
            beneficiary,
            revoker,
            startTimestamp,
            cliffDuration,
            vestingDuration,
            address(jellyToken)
        );
    }

    function ffi_vestedAmount(
        uint256 blockTimestamp
    ) public returns (uint256 vestedAmountRust) {
        string[] memory inputs = new string[](7);
        inputs[0] = "cargo";
        inputs[1] = "run";
        inputs[2] = "--quiet";
        inputs[3] = startTimestamp.toString();
        inputs[4] = cliffTimestamp.toString();
        inputs[5] = uint256(totalDuration).toString();
        inputs[6] = blockTimestamp.toString();

        bytes memory res = vm.ffi(inputs);

        vestedAmountRust = abi.decode(res, (uint256));
    }

    function test_vestedAmount(uint256 numberOfSeconds) external {
        vm.assume(numberOfSeconds < totalDuration * 2);
        vm.warp(numberOfSeconds);

        uint256 vestedAmountSol = vestingLib.vestedAmount();
        uint256 vestedAmountRust = ffi_vestedAmount(block.timestamp);

        assertEq(vestedAmountSol, vestedAmountRust);
    }
}
