// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import {Ownable} from "./Ownable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Vesting
 * @notice Simple Vesting Contract
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

abstract contract VestingLib is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 immutable i_amount;
    address immutable i_beneficiary; // or Merkle tree root for manual claiming if there are more addresses
    uint48 immutable i_cliffTimestamp;
    uint48 immutable i_startTimestamp;
    address immutable i_revoker;
    uint32 immutable i_totalDuration;
    address immutable i_token;
    uint256 s_released;

    event Release(address beneficiary, uint256 amount);

    error Vesting__ZeroAddress();
    error Vesting__InvalidDuration();
    error Vesting__OnlyRevokerOrOwnerCanCall(address caller);
    error Vesting__NothingToRelease();

    modifier onlyRevokerOrOwner() {
        if (msg.sender != i_revoker && msg.sender != owner())
            revert Vesting__OnlyRevokerOrOwnerCanCall(msg.sender);
        _;
    }

    constructor(
        uint256 _amount,
        address _beneficiary,
        address _revoker,
        uint256 _startTimestamp,
        uint32 _cliffDuration,
        uint32 _vestingDuration,
        address _token
    ) {
        if (_beneficiary == address(0)) revert Vesting__ZeroAddress();
        if (_revoker == address(0)) revert Vesting__ZeroAddress();
        if (_cliffDuration <= 0) revert Vesting__InvalidDuration();

        i_amount = _amount;
        i_beneficiary = _beneficiary;
        i_revoker = _revoker;
        i_startTimestamp = SafeCast.toUint48(_startTimestamp);
        i_cliffTimestamp = i_startTimestamp + SafeCast.toUint48(_cliffDuration);
        i_totalDuration = _cliffDuration + _vestingDuration;
        i_token = _token;
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() external onlyRevokerOrOwner nonReentrant {
        uint256 unreleased = releasableAmount();
        if (unreleased == 0) revert Vesting__NothingToRelease();

        unchecked {
            s_released += unreleased;
        }

        // Helper method for interacting with ERC20 tokens that do not consistently return true/false
        // This will revert if ERC20 transfer reverts or returns false
        // Unlike solmate it checks if token is a cotnract exactly like Uniswap V3 does: https://github.com/Uniswap/v3-core/blob/main/contracts/libraries/TransferHelper.sol
        // What makes it safer is that the boolean return value is automatically asserted.
        // If a token returns false on transfer or any other operation, a contract using safeTransfer will revert.
        // Otherwise, it’s easy to forget to check the return value.
        //
        // Note that this piece of code has an issue because it doesn’t assert that token is a contract,
        // and if the account doesn’t have bytecode it will assume that transfers are going through successfully.
        IERC20(i_token).safeTransfer(i_beneficiary, unreleased);

        emit Release(i_beneficiary, unreleased);
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet
     *
     * @return uint256 The amount that has vested but hasn't been released yet
     */
    function releasableAmount() public view returns (uint256) {
        return vestedAmount() - s_released;
    }

    /**
     * @notice Calculates the amount that has already vested
     *
     * @return vestedAmount_ The amount that has vested
     */
    function vestedAmount() public view returns (uint256 vestedAmount_) {
        if (block.timestamp < i_cliffTimestamp) {
            vestedAmount_ = 0; // @dev reassiging to zero for clarity & better code readability
        } else if (block.timestamp >= i_startTimestamp + i_totalDuration) {
            vestedAmount_ = i_amount;
        } else {
            unchecked {
                vestedAmount_ =
                    (i_amount * (block.timestamp - i_startTimestamp)) /
                    i_totalDuration;
            }
        }
    }
}
