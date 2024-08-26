// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {Ownable} from "./utils/Ownable.sol";
import {IERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";
import {SafeERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "./vendor/openzeppelin/v4.9.0/utils/cryptography/MerkleProof.sol";

/**
 * @title RewardDistribution
 * @notice Contract for distributing thrid party rewards
 */

contract RewardDistribution is Ownable {
    using SafeERC20 for IERC20;

    mapping(uint256 => bytes32) public merkleRoots;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(uint256 => uint256) public tokensDeposited;
    mapping(uint256 => IERC20) public dropToken;

    uint96 public dropId;

    event Claimed(address claimant, uint256 balance, uint96 dropId);
    event DropAdded(
        IERC20 token,
        uint256 amount,
        uint96 dropId,
        bytes32 merkleRoot,
        string ipfs
    );

    error Claim_LenMissmatch();
    error Claim_ZeroAmount();
    error Claim_WrongDropID();
    error Claim_AlreadyClaimed();
    error Claim_WrongProof();

    constructor(
        address _owner,
        address _pendingOwner
    ) Ownable(_owner, _pendingOwner) {}

    /**
     * @notice Creates drop for distribution
     *
     * @param _amount - amount of tokens to deposit
     * @param _token - token to deposit
     *
     * @dev not using this function to deposit funds will lock the tokens
     *
     * No return only Owner can call
     */
    function createDrop(
        IERC20 _token,
        uint256 _amount,
        bytes32 _merkleRoot,
        string memory _ipfs
    ) public onlyOwner returns (uint96) {
        uint96 _dropId = dropId;

        merkleRoots[_dropId] = _merkleRoot;
        dropId = _dropId + 1;

        _token.safeTransferFrom(msg.sender, address(this), _amount);

        tokensDeposited[_dropId] = _amount;
        dropToken[_dropId] = _token;

        emit DropAdded(_token, _amount, dropId, _merkleRoot, _ipfs);

        return _dropId;
    }

    /**
     * @notice Claims a single drop
     *
     * @param _dropId - id of drop to be claimed
     * @param _amount - amount of tokens to be claimed
     * @param _merkleProof - merkle proof of claim
     *
     * No return reverts an error
     */

    function claimDrop(
        uint96 _dropId,
        uint256 _amount,
        bytes32[] memory _merkleProof
    ) public {
        if (_amount == 0) revert Claim_ZeroAmount();

        _claimWeek(_dropId, _amount, _merkleProof);
        dropToken[_dropId].safeTransfer(msg.sender, _amount);
    }

    /**
     * @notice Claims multiple drops
     *
     * @param _dropIds - ids of drops to be claimed
     * @param _amounts - amounts of tokens to be claimed
     * @param _merkleProofs - merkle proofs of claim
     *
     * No return reverts an error
     */

    function claimDrops(
        uint96[] memory _dropIds,
        uint256[] memory _amounts,
        bytes32[][] memory _merkleProofs
    ) public {
        uint256 len = _dropIds.length;

        if (len != _amounts.length || len != _merkleProofs.length)
            revert Claim_LenMissmatch();

        for (uint256 i = 0; i < len; i++) {
            if (_amounts[i] == 0) revert Claim_ZeroAmount();

            uint96 _dropId = _dropIds[i];
            _claimWeek(_dropId, _amounts[i], _merkleProofs[i]);

            dropToken[_dropId].safeTransfer(msg.sender, _amounts[i]);
        }
    }

    /**
     * @notice Verifies claim
     *
     * @param _reciver - address of user to claim
     * @param _dropId - id of drop to be claimed
     * @param _amount - amount of tokens to be claimed
     * @param _merkleProof - merkle proof of claim
     *
     * No return reverts an error
     */

    function verifyClaim(
        address _reciver,
        uint256 _dropId,
        uint256 _amount,
        bytes32[] memory _merkleProof
    ) public view returns (bool valid) {
        return _verifyClaim(_reciver, _dropId, _amount, _merkleProof);
    }

    function _claimWeek(
        uint96 _dropId,
        uint256 _amount,
        bytes32[] memory _merkleProof
    ) private {
        if (_dropId >= dropId) revert Claim_WrongDropID();

        if (claimed[_dropId][msg.sender]) revert Claim_AlreadyClaimed();

        if (!_verifyClaim(msg.sender, _dropId, _amount, _merkleProof))
            revert Claim_WrongProof();

        claimed[_dropId][msg.sender] = true;

        emit Claimed(msg.sender, _amount, _dropId);
    }

    function _verifyClaim(
        address _receiver,
        uint256 _dropId,
        uint256 _amount,
        bytes32[] memory _merkleProof
    ) private view returns (bool valid) {
        bytes32 encodedData = keccak256(abi.encode(_receiver, _amount));
        bytes32 leaf = keccak256(abi.encodePacked(encodedData));

        return MerkleProof.verify(_merkleProof, merkleRoots[_dropId], leaf);
    }
}
