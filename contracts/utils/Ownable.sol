// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

abstract contract Ownable {
    address _owner;

    function owner() public view virtual returns (address) {
        return _owner;
    }
}
