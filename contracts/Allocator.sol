// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import {IJellyToken} from "./interfaces/IJellyToken.sol";
import {IChest} from "./interfaces/IChest.sol";
import {IVault, IAsset, IERC20} from "./vendor/balancer-labs/v2-interfaces/v0.4.0/vault/IVault.sol";
import {WeightedPoolUserData} from "./vendor/balancer-labs/v2-interfaces/v0.4.0/pool-weighted/WeightedPoolUserData.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";
import {Ownable} from "./utils/Ownable.sol";

/**
 * @title The Allocator contract
 * @notice Contract for swapping dusd tokens for jelly tokens
 */
contract Allocator is ReentrancyGuard, Ownable {
    address internal immutable i_jellyToken;
    address internal immutable i_chest;
    address internal immutable i_dusd;
    address internal immutable i_wdfi;

    uint256 internal dusdToJellyRatio;
    uint256 internal wdfiToJellyRatio;
    bytes32 internal jellySwapPoolId;
    address internal jellySwapVault; // ───╮
    bool internal isOver; // ──────────────╯

    event BuyWithDusd(uint256 dusdAmount, uint256 jellyAmount);
    event BuyWithDfi(uint256 wdfiAmount, uint256 jellyAmount);
    event EndBuyingPeriod();
    event DusdToJellyRatioSet(uint256 dusdToJellyRatio);
    event WdfiToJellyRatioSet(uint256 wdfiToJellyRatio);

    error Allocator__CannotBuy();
    error Allocator__NothingToRelease();
    error Allocator__InsufficientFunds();

    modifier canBuy() {
        if (isOver) {
            revert Allocator__CannotBuy();
        }
        _;
    }

    constructor(
        address _jellyToken,
        address _chest,
        address _dusd,
        address _wdfi,
        uint256 _dusdToJellyRatio,
        uint256 _wdfiToJellyRatio,
        address _jellySwapVault,
        bytes32 _jellySwapPoolId,
        address _owner,
        address _pendingOwner
    ) Ownable(_owner, _pendingOwner) {
        i_jellyToken = _jellyToken;
        i_chest = _chest;
        i_dusd = _dusd;
        i_wdfi = _wdfi;

        dusdToJellyRatio = _dusdToJellyRatio;
        wdfiToJellyRatio = _wdfiToJellyRatio;
        jellySwapVault = _jellySwapVault;
        jellySwapPoolId = _jellySwapPoolId;
    }

    /**
     * @notice Buys jelly tokens with dusd.
     *
     * @param amount - amount of dusd tokens deposited.
     * @param freezingPeriod - duration of freezing period in seconds.
     *
     * No return, reverts on error.
     */
    function buyWithDusd(
        uint256 amount,
        uint32 freezingPeriod
    ) external nonReentrant canBuy {
        IERC20(i_dusd).transferFrom(msg.sender, address(0), amount);

        uint256 jellyAmount = amount * dusdToJellyRatio;

        uint256 mintingFee = IChest(i_chest).fee();
        IJellyToken(i_jellyToken).approve(i_chest, jellyAmount);

        IChest(i_chest).freeze(
            jellyAmount - mintingFee,
            freezingPeriod,
            msg.sender
        );

        emit BuyWithDusd(amount, jellyAmount - mintingFee);
    }

    /**
     * @notice Buys jelly tokens with wdfi.
     *
     * @param amount - amount of wdfi tokens deposited.
     *
     * No return, reverts on error.
     */
    function buyWithDfi(uint256 amount) external nonReentrant canBuy {
        IERC20(i_wdfi).transferFrom(msg.sender, address(this), amount);

        uint256 jellyAmount = amount * wdfiToJellyRatio;

        (IERC20[] memory tokens, , ) = IVault(jellySwapVault).getPoolTokens(
            jellySwapPoolId
        );

        uint256 length = tokens.length;
        uint256[] memory maxAmountsIn = new uint256[](length);

        for (uint256 i; i < length; ) {
            maxAmountsIn[i] = amount;

            unchecked {
                ++i;
            }
        }

        bytes memory userData = abi.encode(
            WeightedPoolUserData.JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT,
            maxAmountsIn,
            0
        );

        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest({
            assets: _convertERC20sToAssets(tokens),
            maxAmountsIn: maxAmountsIn,
            userData: userData,
            fromInternalBalance: false // False if sending ERC20
        });

        address sender = address(this);
        address recipient = address(0); // burning LP tokens

        IVault(jellySwapVault).joinPool(
            jellySwapPoolId,
            sender,
            recipient,
            request
        );

        IJellyToken(i_jellyToken).mint(msg.sender, jellyAmount);

        emit BuyWithDfi(amount, jellyAmount);
    }

    /**
     * @notice Ends buying period.
     * @dev Only owner can call.
     *
     * No return, reverts on error.
     */
    function endBuyingPeriod() external onlyOwner {
        isOver = true;

        emit EndBuyingPeriod();
    }

    /**
     * @notice Sets dusd to jelly ratio.
     * @dev Only owner can call.
     *
     * @param _dusdToJellyRatio - ratio of dusd to jelly tokens.
     *
     * No return, reverts on error.
     */
    function setDusdToJellyRatio(uint256 _dusdToJellyRatio) external onlyOwner {
        dusdToJellyRatio = _dusdToJellyRatio;

        emit DusdToJellyRatioSet(_dusdToJellyRatio);
    }

    /**
     * @notice Sets wdfi to jelly ratio.
     * @dev Only owner can call.
     *
     * @param _wdfiToJellyRatio - ratio of wdfi to jelly tokens.
     *
     * No return, reverts on error.
     */
    function setWdfiToJellyRatio(uint256 _wdfiToJellyRatio) external onlyOwner {
        wdfiToJellyRatio = _wdfiToJellyRatio;

        emit WdfiToJellyRatioSet(_wdfiToJellyRatio);
    }

    /**
     * @notice Gets To Jelly Ratios.
     *
     * @return dusdToJellyRatio - ratio of dusd to jelly tokens.
     * @return wdfiToJellyRatio - ratio of wdfi to jelly tokens.
     */
    function getRatios() external view returns (uint256, uint256) {
        return (dusdToJellyRatio, wdfiToJellyRatio);
    }

    function _convertERC20sToAssets(
        IERC20[] memory tokens
    ) internal pure returns (IAsset[] memory assets) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            assets := tokens
        }
    }

    // function exitPool() external onlyOwner {} // videcemo da li ovo treba, verovatno ne, jer ako moze da kreira van ovog contracta trebalo bi da moze i da izadje van njega...provericemo kroz testove
}
