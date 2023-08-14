// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import {IERC20} from "../vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";

interface IJellyToken is IERC20 {
    function mint(address to, uint256 amount) external;

    /**
     *   "DEFAULT_ADMIN_ROLE()": "a217fddf",
  "MINTER_ROLE()": "d5391393",
  "allowance(address,address)": "dd62ed3e",
  "approve(address,uint256)": "095ea7b3",
  "balanceOf(address)": "70a08231",
  "burn(uint256)": "42966c68",
  "cap()": "355274ea",
  "decimals()": "313ce567",
  "decreaseAllowance(address,uint256)": "a457c2d7",
  "getRoleAdmin(bytes32)": "248a9ca3",
  "grantRole(bytes32,address)": "2f2ff15d",
  "hasRole(bytes32,address)": "91d14854",
  "increaseAllowance(address,uint256)": "39509351",
  "mint(address,uint256)": "40c10f19",
  "name()": "06fdde03",
  "renounceRole(bytes32,address)": "36568abe",
  "revokeRole(bytes32,address)": "d547741f",
  "supportsInterface(bytes4)": "01ffc9a7",
  "symbol()": "95d89b41",
  "totalSupply()": "18160ddd",
  "transfer(address,uint256)": "a9059cbb",
  "transferFrom(address,address,uint256)": "23b872dd"
     */
}
