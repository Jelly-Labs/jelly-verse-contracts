// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import {ERC20, ERC20Capped} from "./vendor/openzeppelin/v4.9.0/token/ERC20/extensions/ERC20Capped.sol";
import {AccessControl} from "./vendor/openzeppelin/v4.9.0/access/AccessControl.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";

/**
 * @title The Jelly ERC20 contract
 *
 *         ## ######## ##       ##       ##    ##
 *         ## ##       ##       ##        ##  ##
 *         ## ##       ##       ##         ####
 *         ## ######   ##       ##          ##
 *   ##    ## ##       ##       ##          ##
 *   ##    ## ##       ##       ##          ##
 *    ######  ######## ######## ########    ##
 *
 */
contract JellyToken is ERC20Capped, AccessControl, ReentrancyGuard {
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bool internal preminted;

    event Preminted(
        address indexed vestingTeam,
        address indexed vestingInvestor,
        address indexed allocator
    );

    error JellyToken__AlreadyPreminted();

    modifier onlyOnce() {
        if (preminted) {
            revert JellyToken__AlreadyPreminted();
        }
        _;
    }

    constructor(
        address _defaultAdminRole
    )
        ERC20("Jelly Token", "JLY")
        ERC20Capped(1_000_000_000 * 10 ** decimals())
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdminRole);
        _grantRole(MINTER_ROLE, _defaultAdminRole);
    }

    function premint(
        address _vestingTeam,
        address _vestingInvestor,
        address _allocator,
        address _minterContract
    ) external onlyRole(MINTER_ROLE) onlyOnce nonReentrant {
        preminted = true;

        _mint(_vestingTeam, 133_000_000 * 10 ** decimals());
        _mint(_vestingInvestor, 133_000_000 * 10 ** decimals());
        _mint(_allocator, 133_000_000 * 10 ** decimals());

        _grantRole(MINTER_ROLE, _allocator);
        _grantRole(MINTER_ROLE, _minterContract);

        emit Preminted(_vestingTeam, _vestingInvestor, _allocator);
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
        _mint(to, amount);
    }
}
