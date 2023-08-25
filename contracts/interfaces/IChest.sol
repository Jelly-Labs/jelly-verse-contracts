// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IChest {
    function freeze(
        uint256 _amount,
        uint32 _freezingPeriod,
        address _to
    ) external;

    function fee() external view returns (uint256);
}
