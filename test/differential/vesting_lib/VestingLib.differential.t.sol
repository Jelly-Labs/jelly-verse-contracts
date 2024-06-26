// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {Vesting} from "../../../contracts/utils/Vesting.sol";
import {Strings} from "../../../contracts/vendor/openzeppelin/v4.9.0/utils/Strings.sol";
import {SafeCast} from "../../../contracts/vendor/openzeppelin/v4.9.0/utils/math/SafeCast.sol";

contract VestingDifferentialTest is Vesting, Test {
    using Strings for uint256;

    uint256 amount;
    address beneficiary;
    uint40 startTimestamp;
    uint32 cliffDuration;
    uint32 vestingDuration;
    uint8 nerfParameter;
    uint120 booster;
    VestingPosition vestingPosition;

    function setUp() public {
        amount = 133_000_000 * 10 ** 18;
        beneficiary = makeAddr("beneficiary");
        startTimestamp = SafeCast.toUint40(block.timestamp);
        cliffDuration = SafeCast.toUint32(15638400); // @dev 6 month Wednesday, 1 July 1970 00:00:00
        vestingDuration = SafeCast.toUint32(44582400); // @dev 18 month Tuesday, 1 June 1971 00:00:00
        nerfParameter = 10; // @dev no nerf
        booster = 1e18; // @dev INITIAL_BOOSTER
        vestingPosition = _createVestingPosition(
            amount,
            cliffDuration,
            vestingDuration,
            booster,
            nerfParameter
        );
    }

    function test_releasableAmount(uint256 blockTimestamp) external {
        uint48 maxClaimTime = vestingPosition.cliffTimestamp +
            (SafeCast.toUint48(vestingPosition.vestingDuration) * 15); // @dev ~30 years for claiming
        blockTimestamp = bound(blockTimestamp, block.timestamp, maxClaimTime);
        vm.warp(blockTimestamp);

        uint256 vestedAmountRust = ffi_vestedAmount(block.timestamp);
        uint256 vestedAmountSol = releasableAmount(0);

        console.logUint(vestedAmountRust);
        console.logUint(vestedAmountSol);

        assertEq(vestedAmountRust, vestedAmountSol);
    }

    function ffi_vestedAmount(
        uint256 blockTimestamp
    ) private returns (uint256 vestedAmountRust) {
        string[] memory inputs = new string[](10);
        inputs[0] = "cargo";
        inputs[1] = "run";
        inputs[2] = "--quiet";
        inputs[3] = "--manifest-path";
        inputs[4] = "test/differential/vesting_lib/Cargo.toml";
        inputs[5] = amount.toString();
        inputs[6] = blockTimestamp.toString();
        inputs[7] = uint256(startTimestamp + SafeCast.toUint48(cliffDuration))
            .toString();
        inputs[8] = uint256(vestingDuration).toString(); // @dev 60220800 - 2 years

        bytes memory result = vm.ffi(inputs);

        vestedAmountRust = abi.decode(result, (uint256));
    }
}
