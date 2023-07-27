// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import {VestingLib} from "./utils/VestingLib.sol";

contract VestingJelly is VestingLib {
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
