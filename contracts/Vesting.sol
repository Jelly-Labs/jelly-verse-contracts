// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

/**
 * @title Vesting
 * @notice Simple Vesting Contract
 *
 *  token amount
 *       ^
 *       |                           __________________
 *       |                          /
 *       |                         /
 *       |                        /
 *       |                       /
 *       |                      /
 *       | <----- cliff ----->
 *       |
 *       |
 *        --------------------.-------------------------> time
 *                                  vesting duration
 *
 */

contract Vesting {
    uint256 constant PREMINT = 133_000_000 * 10 ** 18;

    address public immutable beneficiary; // or Merkle tree root for manual claiming if there are more addresses
    uint256 public immutable cliff;
    uint256 public immutable start;
    uint256 public immutable duration;
    uint256 public immutable amount;

    uint256 public released;

    constructor(
        address _beneficiary,
        uint256 _amount,
        uint256 _cliffDuration,
        uint256 _duration
    ) {
        require(_beneficiary != address(0));
        require(_duration > 0);

        beneficiary = _beneficiary;
        amount = _amount;
        duration = _duration; // 18 months
        start = block.timestamp;
        cliff = block.timestamp + _cliffDuration; // 6 months
    }

    function vest() external {}

    /**
     * @notice Transfers vested tokens to beneficiary.
     * @dev Alternatively, one can implement a scenario where beneficaries claim their tokens via a Merkle tree.
     */
    function release() external {
        uint256 unreleased = releasableAmount();
        require(unreleased > 0, "Vesting: no tokens are due");

        released += unreleased;

        // Either from token constuctor the amount will be minted to this contract
        // Or this contract can have a Minter role to call mint() on the token contract from here

        // IJelly(jlyAddress).transfer(beneficiary, unreleased);
        // or
        // IJelly(jlyAddress).mint(beneficiary, unreleased);
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     */
    function releasableAmount() public view returns (uint256) {
        return vestedAmount() - released;
    }

    /**
     * @dev Calculates the amount that has already vested.
     */
    function vestedAmount() public view returns (uint256) {
        // Here one should implement the actual business logic for vesting
        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= start + duration) {
            return PREMINT;
        } else {
            return (PREMINT * (block.timestamp - start)) / duration;
        }
    }
}
