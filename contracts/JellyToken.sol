// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract JellyToken is ERC20Capped, AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor(
    address _vesting,
    address _vestingJelly,
    address _allocator
  )
  ERC20("Jelly Token", "JLY")
  ERC20Capped(1_000_000_000 * 10 ** 18) {
    _mint(_vesting, 133_000_000 * 10 ** 18);
    _mint(_vestingJelly, 133_000_000 * 10 ** 18);
    _mint(_allocator, 133_000_000 * 10 ** 18);

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
  }

  function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    _mint(to, amount);
  }

  function burn(uint256 amount) external {
    _burn(msg.sender, amount);
  }
}
