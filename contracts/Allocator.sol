// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

// import {IERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";
import {IJellyToken} from "./interfaces/IJellyToken.sol";
import {SafeERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/utils/SafeERC20.sol";
import {IVault, IAsset, IERC20} from "./vendor/balancer-labs/v2-interfaces/v0.4.0/vault/IVault.sol";
import {WeightedPoolUserData} from "./vendor/balancer-labs/v2-interfaces/v0.4.0/pool-weighted/WeightedPoolUserData.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title The Allocator contract
 * @notice Contract for swapping dusd tokens for jelly tokens
 */
contract Allocator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address internal jellyToken;
    IERC20 public dusd;
    uint256 public dusdJellyRatio;

    address internal WDFI;
    uint256 internal wdfiToJellyRatio;
    address internal jellySwapVault;
    bytes32 internal jellySwapPoolId;

    event BuyWithDusd(uint256 dusdAmount, uint256 jellyAmount);

    constructor(
        IERC20 _dusd,
        uint256 _dusdJellyRatio,
        address _WDFI,
        uint256 _wdfiToJellyRatio,
        address _jellySwapVault,
        bytes32 _jellySwapPoolId
    ) {
        dusd = _dusd;
        dusdJellyRatio = _dusdJellyRatio;
        WDFI = _WDFI;
        wdfiToJellyRatio = _wdfiToJellyRatio;
        jellySwapVault = _jellySwapVault;
        jellySwapPoolId = _jellySwapPoolId;
    }

    modifier jellyTokenSet() {
        require(jellyToken != address(0), "JellyToken not set");
        _;
    }

    /**
     * @notice Buys jelly tokens with dusd.
     *
     * @param amount - amount of dusd tokens deposited.
     *
     * No return, reverts on error.
     */
    function buyWithDusd(uint256 amount) external jellyTokenSet nonReentrant {
        // VESTING
        dusd.transferFrom(msg.sender, address(0), amount);

        uint256 jellyAmount = amount * dusdJellyRatio;
        IERC20(jellyToken).transfer(msg.sender, jellyAmount);
        emit BuyWithDusd(amount, jellyAmount);
    }

    function buyWithDfi(uint256 amount) external jellyTokenSet nonReentrant {
        IERC20(WDFI).transferFrom(msg.sender, address(this), amount);

        uint256 jellyAmount = amount * wdfiToJellyRatio;

        (IERC20[] memory tokens /*uint256[] balances*/, , ) = IVault(
            jellySwapVault
        ).getPoolTokens(jellySwapPoolId);

        // uint256[] memory maxAmountsIn = _calculateProportionalAmounts(
        //     tokens,
        //     balances,
        //     amount
        // );

        // uint256 minBptAmountOut;

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

        IJellyToken(jellyToken).mint(msg.sender, jellyAmount);

        // emit
    }

    // function _calculateProportionalAmounts(
    //     IERC20[] memory tokens, uint256[] balances
    // ) internal returns (uint256[] memory maxAmountsIn) {
    //     uint256 length = tokens.length;
    //     for (uint i = 0; i < length; ) {
    //         // if(tokens[i] != IERC20(BPT)) {
    //             uint256 proportionalAmount = balances[i] * amount / balances[DFIIndex]
    //         // }

    //         unchecked {
    //             ++i;
    //         }
    //     }
    // }

    function _convertERC20sToAssets(
        IERC20[] memory tokens
    ) internal pure returns (IAsset[] memory assets) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            assets := tokens
        }
    }

    function getRatios() external view returns (uint256, uint256) {
        return (dusdJellyRatio, wdfiToJellyRatio);
    }

    /**
     * @notice .
     *
     * @dev Only owner can call.
     *
     * @param _jellyToken - address of a Jelly token.
     *
     * No return, reverts on error.
     */
    function setJellyToken(address _jellyToken) external onlyOwner {
        jellyToken = _jellyToken;
    }

    function exitPool() external onlyOwner {}
}
