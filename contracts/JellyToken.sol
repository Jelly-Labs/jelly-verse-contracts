// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title The Jelly ERC20 contract
 */
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

  /**
   * @notice Mints specified amount of tokens to address.
   *
   * @dev Only addresses with MINTER_ROLE can call.
   *
   * @param address - address to mint tokens for.
   *
   * @param amount - amount of tokens to mint.
   *
   * No return, reverts on error.
   */
  function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    _mint(to, amount);
  }

  /**
   * @notice Burns tokens for sender.
   *
   * @param amount - amount of tokens to burn.
   *
   * No return, reverts on error.
   */
  function burn(uint256 amount) external {
    _burn(msg.sender, amount);
  }
}
