// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {Ownable} from "./Ownable.sol";
import {SafeCast} from "../vendor/openzeppelin/v4.9.0/utils/math/SafeCast.sol";

/**
 * @title Vesting
 * @notice Vesting Library
 *
 *  token amount
 *       ^
 *       |                           __________________
 *       |                          /
 *       |                         /
 *       |                        /
 *       |                       /
 *       |                      /
 *       | <----- cliff ----->
 *       |
 *       |
 *        --------------------.------.-------------------> time
 *                         vesting duration
 *
 *
 * @dev Token is the address of the vested token. Only one token can be vested per contract.
 * @dev Total vested amount is stored as an immutable storage variable to prevent manipulations when calculating current releasable amount.
 * @dev Beneficiary is the addres where the tokens will be released to. It can be smart contract of any kind (and even an EOA, although it's not recommended).
 * @dev Revoker is the address that can revoke the current releasable amount of tokens.
 */

abstract contract VestingLib is Ownable {
    struct VestingPosition {
        uint256 totalVestedAmount;
        uint256 releasedAmount;
    }

    struct VestingConfig {
        uint48 startTimestamp; // ─╮
        uint48 cliffTimestamp; //  │
        uint32 totalDuration; //   │
        bool isVestingStarted; // ─╯
    }

    VestingConfig internal vestingConfig;

    mapping(address => VestingPosition) internal vestingPositions;

    event VestingScheduleConfigured(
        uint48 startTimestamp,
        uint48 cliffTimestamp,
        uint32 totalDuration
    );
    event VestingStarted();

    error VestingLib__VestingAlreadyStarted();
    error VestingLib__StartTimestampMustNotBeInThePast();
    error VestingLib__InvalidDuration();

    constructor(
        uint48 _startTimestamp,
        uint32 _cliffDuration,
        uint32 _vestingDuration,
        address _owner,
        address _pendingOwner
    ) Ownable(_owner, _pendingOwner) {
        _configureVestingSchedule(
            _startTimestamp,
            _cliffDuration,
            _vestingDuration
        );
    }

    function startVesting() external onlyOwner {
        vestingConfig.isVestingStarted = true;
        emit VestingStarted();
    }

    function configureVestingSchedule(
        uint48 startTimestamp,
        uint32 cliffDuration,
        uint32 vestingDuration
    ) external onlyOwner {
        _configureVestingSchedule(
            startTimestamp,
            cliffDuration,
            vestingDuration
        );
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet
     *
     * @return uint256 The amount that has vested but hasn't been released yet
     */
    function releasableAmount(address account) public view returns (uint256) {
        VestingPosition memory vestingPosition = vestingPositions[account];

        if (vestingConfig.isVestingStarted) {
            return vestedAmount(account) - vestingPosition.releasedAmount;
        } else {
            return 0;
        }
    }

    function vestedAmount(
        address account
    ) internal view returns (uint256 vestedAmount_) {
        VestingConfig memory vestingConfig_ = VestingLib.vestingConfig;

        VestingPosition memory vestingPosition_ = VestingLib.vestingPositions[
            account
        ];

        if (block.timestamp < vestingConfig_.cliffTimestamp) {
            vestedAmount_ = 0; // @dev reassiging to zero for clarity & better code readability
        } else if (
            block.timestamp >=
            vestingConfig_.startTimestamp + vestingConfig_.totalDuration
        ) {
            vestedAmount_ = vestingPosition_.totalVestedAmount;
        } else {
            unchecked {
                vestedAmount_ =
                    (vestingPosition_.totalVestedAmount *
                        (block.timestamp - vestingConfig_.startTimestamp)) /
                    vestingConfig_.totalDuration;
            }
        }
    }

    function _configureVestingSchedule(
        uint48 startTimestamp,
        uint32 cliffDuration,
        uint32 vestingDuration
    ) private {
        if (vestingConfig.isVestingStarted)
            revert VestingLib__VestingAlreadyStarted();
        if (startTimestamp < block.timestamp)
            revert VestingLib__StartTimestampMustNotBeInThePast();
        if (cliffDuration <= 0) revert VestingLib__InvalidDuration();
        if (vestingDuration <= 0) revert VestingLib__InvalidDuration();

        uint48 cliffTimestamp = startTimestamp +
            SafeCast.toUint48(cliffDuration);
        uint32 totalDuration = cliffDuration + vestingDuration;

        vestingConfig.startTimestamp = startTimestamp;
        vestingConfig.cliffTimestamp = cliffTimestamp;
        vestingConfig.totalDuration = totalDuration;

        emit VestingScheduleConfigured(
            startTimestamp,
            cliffTimestamp,
            totalDuration
        );
    }
}
