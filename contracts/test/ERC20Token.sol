// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Token is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
