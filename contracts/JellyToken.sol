// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import {ERC20, ERC20Capped} from "./vendor/openzeppelin/v4.9.0/token/ERC20/extensions/ERC20Capped.sol";
import {AccessControl} from "./vendor/openzeppelin/v4.9.0/access/AccessControl.sol";
import {Ownable} from "./utils/Ownable.sol";

/**
 * @title The Jelly ERC20 contract
 */
contract JellyToken is ERC20Capped, AccessControl, Ownable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        address _vesting,
        address _vestingJelly,
        address _allocator,
        address _owner,
        address _pendingOwner
    )
        ERC20("Jelly Token", "JLY")
        ERC20Capped(1_000_000_000 * 10 ** 18)
        Ownable(_owner, _pendingOwner)
    {
        _mint(_vesting, 133_000_000 * 10 ** 18);
        _mint(_vestingJelly, 133_000_000 * 10 ** 18);
        _mint(_allocator, 133_000_000 * 10 ** 18);

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(MINTER_ROLE, _owner);

        _grantRole(MINTER_ROLE, _allocator);
    }

    /**
     * @notice Mints specified amount of tokens to address.
     *
     * @dev Only addresses with MINTER_ROLE can call.
     *
     * @param to - address to mint tokens for.
     *
     * @param amount - amount of tokens to mint.
     *
     * No return, reverts on error.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount); // VIDI DA LI TREBA SAFE MINT
    }
}
