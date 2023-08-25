// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import {VestingLib} from "./utils/VestingLib.sol";
import {IERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";
import {SafeERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";

contract VestingTeam is VestingLib, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address immutable i_beneficiary;
    address immutable i_revoker;
    address immutable i_token;

    event Release(address indexed beneficiary, uint256 amount);

    error VestingTeam__OnlyRevokerCanCall(address caller);
    error VestingTeam__ZeroAddress(string variableName);
    error VestingTeam__NothingToRelease();

    modifier onlyRevoker() {
        if (msg.sender != i_revoker)
            revert VestingTeam__OnlyRevokerCanCall(msg.sender);
        _;
    }

    constructor(
        uint256 _amount,
        address _beneficiary,
        address _revoker,
        address _token,
        uint48 _startTimestamp,
        uint32 _cliffDuration,
        uint32 _vestingDuration,
        address _owner,
        address _pendingOwner
    )
        VestingLib(
            _startTimestamp,
            _cliffDuration,
            _vestingDuration,
            _owner,
            _pendingOwner
        )
    {
        if (_beneficiary == address(0))
            revert VestingTeam__ZeroAddress("_beneficiary");
        if (_revoker == address(0)) revert VestingTeam__ZeroAddress("_revoker");
        if (_token == address(0)) revert VestingTeam__ZeroAddress("_token");

        i_beneficiary = _beneficiary;
        i_revoker = _revoker;
        i_token = _token;

        VestingLib.vestingPositions[_beneficiary].totalVestedAmount = _amount;
    }

    /**
     * @notice Release vested tokens
     *
     * No return, reverts on error
     */
    function release() external onlyRevoker nonReentrant {
        uint256 unreleased = VestingLib.releasableAmount(i_revoker);
        if (unreleased == 0) revert VestingTeam__NothingToRelease();

        unchecked {
            VestingLib
                .vestingPositions[i_beneficiary]
                .releasedAmount += unreleased;
        }

        IERC20(i_token).safeTransfer(i_beneficiary, unreleased);

        emit Release(i_beneficiary, unreleased);
    }
}
