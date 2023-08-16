// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title The Allocator contract
 * @notice Contract for swapping dusd tokens for jelly tokens
 */
contract Allocator is Ownable {
  IERC20 public jellyToken;
  IERC20 public dusd;
  uint256 public dusdJellyRatio;

  event BuyWithDusd(uint256 dusdAmount, uint256 jellyAmount);

  constructor(IERC20 _dusd, uint256 _dusdJellyRatio) {
    dusd = _dusd;
    dusdJellyRatio = _dusdJellyRatio;
  }

  modifier jellyTokenSet() {
      require(address(jellyToken) != address(0), "JellyToken not set");
      _;
  }

  /**
   * @notice Buys jelly tokens with dusd.
   *
   * @param amount - amount of dusd tokens deposited.
   *
   * No return, reverts on error.
   */
  function buyWithDusd(uint256 amount) external jellyTokenSet {
    dusd.transferFrom(msg.sender, address(this), amount);

    uint256 jellyAmount = amount * dusdJellyRatio;
    IERC20(jellyToken).transfer(msg.sender, jellyAmount);
    emit BuyWithDusd(amount, jellyAmount);
  }

  /**
   * @notice Buys jelly tokens with dusd.
   *
   * @dev Only owner can call.
   *
   * @param _jellyToken - address of the erc20 token
   *
   * No return, reverts on error.
   */
  function setJellyToken(IERC20 _jellyToken) external onlyOwner {
    jellyToken = _jellyToken;
  }
}
