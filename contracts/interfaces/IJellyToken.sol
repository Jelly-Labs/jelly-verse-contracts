// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {IERC20} from "../vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";

interface IJellyToken is IERC20 {
    function mint(address to, uint256 amount) external;

    function decimals() external view returns (uint8);
}
