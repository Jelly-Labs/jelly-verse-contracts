// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import {VestingLib} from "./utils/VestingLib.sol";
import {IJellyToken} from "./interfaces/IJellyToken.sol";
import {IChest} from "./interfaces/IChest.sol";
import {IERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";
import {SafeERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";

/**
 * @title The VestingInvestor contract
 * @notice Contract for vesting jelly tokens for investors
 */
contract VestingInvestor is VestingLib, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Beneficiary {
        address _address; // ─╮
        uint32 _amount; // ───╯
    }

    address internal immutable i_jellyToken;
    address internal immutable i_chest;

    event Release(address indexed beneficiary, uint256 amount);
    event ConvertToChest(address indexed beneficiary);

    error VestingInvestor__ZeroAddress();
    error VestingInvestor__NothingToRelease();
    error VestingInvestor__InsufficientFunds();
    error VestingInvestor__OnlyOwnerOrBeneficiaryCanCall(address caller);

    modifier onlyOwnerOrBeneficiary(address beneficiary) {
        if (msg.sender != owner() && msg.sender != beneficiary)
            revert VestingInvestor__OnlyOwnerOrBeneficiaryCanCall(msg.sender);
        _;
    }

    constructor(
        address _jellyToken,
        address _chest,
        Beneficiary[] memory _beneficiaries,
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
        if (_jellyToken == address(0)) revert VestingInvestor__ZeroAddress();
        if (_chest == address(0)) revert VestingInvestor__ZeroAddress();

        i_jellyToken = _jellyToken;
        i_chest = _chest;

        uint8 decimals = IJellyToken(_jellyToken).decimals();

        for (uint256 i = 0; i < _beneficiaries.length; ++i) {
            VestingLib
                .vestingPositions[_beneficiaries[i]._address]
                .totalVestedAmount = _beneficiaries[i]._amount * 10 ** decimals;
        }
    }

    /**
     * @notice Releases vested tokens to the beneficiary.
     *
     * No return, reverts on error.
     */
    function release() external nonReentrant {
        uint256 unreleased = VestingLib.releasableAmount(msg.sender);
        if (unreleased == 0) revert VestingInvestor__NothingToRelease();

        unchecked {
            VestingLib
                .vestingPositions[msg.sender]
                .releasedAmount += unreleased;
        }

        IERC20(i_jellyToken).safeTransfer(msg.sender, unreleased);

        emit Release(msg.sender, unreleased);
    }

    /**
     * @notice Converts vested tokens to chest NFT.
     *
     * @param beneficiary - address of beneficiary
     * @param amount - amount of vested tokens to convert
     * @param freezingPeriod - duration of freezing period in seconds
     *
     * No return, reverts on error.
     */
    function convertToChest(
        address beneficiary,
        uint256 amount,
        uint32 freezingPeriod
    ) external onlyOwnerOrBeneficiary(beneficiary) {
        if (amount > VestingLib.vestingPositions[beneficiary].totalVestedAmount)
            revert VestingInvestor__InsufficientFunds();

        uint256 mintingFee = IChest(i_chest).fee();

        unchecked {
            VestingLib.vestingPositions[msg.sender].releasedAmount += (amount +
                mintingFee);
        }

        IJellyToken(i_jellyToken).approve(i_chest, amount + mintingFee);

        IChest(i_chest).freeze(amount, freezingPeriod, beneficiary);

        emit ConvertToChest(beneficiary);
    }
}
