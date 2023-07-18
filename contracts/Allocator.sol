// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Allocator is Ownable {
  IERC20 public jellyToken;
  IERC20 public dusd;
  uint256 public dusdJellyRatio;

  constructor(IERC20 _dusd, uint256 _dusdJellyRatio) {
    dusd = _dusd;
    dusdJellyRatio = _dusdJellyRatio;
  }

  modifier jellyTokenSet() {
      require(address(jellyToken) != address(0), "JellyToken not set");
      _;
  }

  function buyWithDusd(uint256 amount) external jellyTokenSet {
    dusd.transferFrom(msg.sender, address(this), amount);

    uint256 jellyAmount = amount * dusdJellyRatio;
    IERC20(jellyToken).transfer(msg.sender, jellyAmount);
  }

  function setJellyToken(IERC20 _jellyToken) external onlyOwner {
    jellyToken = _jellyToken;
  }
}
