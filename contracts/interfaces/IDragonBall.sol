// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IDragonBall {
    /**
     * @dev mints a DragonBall NFT
     */
    function mint(uint8 _numberOfBall, address _benefciary) external;
    /**
     * @dev burns a DragonBall NFT
     */
    function burn(uint256 _tokenId) external;
    /**
     * @dev get the ball number of a DragonBall NFT
     */
    function getBallNumber(uint256 _tokenId) external view returns (uint8);
}
