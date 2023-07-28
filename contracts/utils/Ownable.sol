// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
 * @title The Ownable contract
 * @notice An abstract contract for ownership managment
 */
abstract contract Ownable {
    address private _owner;
    address private _pendingOwner;

    event OwnershipTransferRequested(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);
    event OwnershipTransferCanceled(address indexed from, address indexed to);

    error Ownable__CannotSetOwnerToZeroAddress();
    error Ownable__MustBeProposedOwner();
    error Ownable__CallerIsNotOwner();
    error Ownable__CannotTransferToSelf();

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    constructor(address newOwner, address pendingOwner) {
        if (newOwner == address(0))
            revert Ownable__CannotSetOwnerToZeroAddress();

        _owner = newOwner;

        if (pendingOwner != address(0)) _transferOwnership(pendingOwner);
    }

    /**
     * @notice Requests ownership transfer to the new address which needs to accept it.
     *
     * @dev Only owner can call.
     *
     * @param newOwner - address of proposed new owner
     *
     * No return, reverts on error.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @notice Accepts pending ownership transfer request.
     *
     * @dev Only proposed new owner can call.
     *
     * No return, revets on error.
     */
    function acceptOwnership() external {
        if (msg.sender != _pendingOwner) revert Ownable__MustBeProposedOwner();

        address oldOwner = _owner;
        _owner = msg.sender;
        _pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    /**
     * @notice Cancels ownership request transfer.
     *
     * @dev Only owner can call.
     *
     * No return, reverts on error.
     */
    function cancelOwnershipTransfer() external onlyOwner {
        address oldPendingOwner = _pendingOwner;
        _pendingOwner = address(0);

        emit OwnershipTransferCanceled(msg.sender, oldPendingOwner);
    }

    /**
     * @notice Gets current owner address.
     *
     * @return owner
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @notice Gets pending owner address.
     *
     * @return pendingOwner
     */
    function getPendingOwner() public view returns (address) {
        return _pendingOwner;
    }

    function _checkOwner() internal view {
        if (msg.sender != owner()) revert Ownable__CallerIsNotOwner();
    }

    function _transferOwnership(address newOwner) private {
        if (newOwner == address(0))
            revert Ownable__CannotSetOwnerToZeroAddress();
        if (newOwner == msg.sender) revert Ownable__CannotTransferToSelf();

        _pendingOwner = newOwner;

        emit OwnershipTransferRequested(msg.sender, newOwner);
    }
}
