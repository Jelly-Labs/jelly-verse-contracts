// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {Vesting} from "../../../contracts/utils/Vesting.sol";
import {Strings} from "../../../contracts/vendor/openzeppelin/v4.9.0/utils/Strings.sol";
import {SafeCast} from "../../../contracts/vendor/openzeppelin/v4.9.0/utils/math/SafeCast.sol";
import {VestingTest} from "../../../contracts/test/VestingTest.sol";

contract VestingFuzzTest is Vesting, Test {
    using Strings for uint256;

    VestingTest vestingTest;
    address beneficiary;
    uint256 amount;
    uint32 cliffDuration;
    uint32 vestingDuration;
    uint120 booster;
    uint8 nerfParameter;
    VestingPosition vestingPosition;

    function setUp() public {
        amount = 133_000_000 * 10 ** 18;
        cliffDuration = SafeCast.toUint32(15638400); // @dev 6 month Wednesday, 1 July 1970 00:00:00
        vestingDuration = SafeCast.toUint32(44582400); // @dev 18 month Tuesday, 1 June 1971 00:00:00
        booster = SafeCast.toUint120(2 ether); // @dev max booster value
        nerfParameter = 10; // @dev no nerf
        vestingTest = new VestingTest();
        vestingPosition = vestingTest.createNewVestingPosition(
            amount,
            cliffDuration,
            vestingDuration,
            booster,
            nerfParameter
        );
    }

    function testFuzz_createVestingPosition(
        uint256 _amount,
        uint32 _cliffDuration,
        uint32 _vestingDuration,
        uint120 _booster,
        uint8 _nerfParameter
    ) external {
        vm.assume(_amount > 0);
        vm.assume(_cliffDuration > 0);
        vm.assume(_vestingDuration > 0);
        vm.assume(_booster > 0 && _booster <= 10 ether);
        vm.assume(_nerfParameter > 0 && _nerfParameter <= 10);
        uint256 beforeIndex = index;
        _createVestingPosition(
            _amount,
            _cliffDuration,
            _vestingDuration,
            _booster,
            _nerfParameter
        );
        uint256 afterIndex = index;

        assertEq(beforeIndex + 1, afterIndex);
    }
}
