// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import {ERC721} from "./vendor/openzeppelin/v4.9.0/token/ERC721/ERC721.sol";
import {Ownable} from "./utils/Ownable.sol";

/**
 * @title DragonBall contract
 * @notice Contract for DragonBall nfts
 */
contract DragonBall is ERC721, Ownable {
    uint256 public index;
    mapping(uint256 => uint8) public numberOfBall;
    address public lotteryContract;

    event NewBall(uint256 index, uint8 numberOfBall,address beneficiary);
    event BallBurned(uint256 tokenId);
    event LotteryContractSet(address lotteryContract);

    error DragonBall_NotAllowed();
    constructor(
        address _owner,
        address _pendingOwner
    ) Ownable(_owner, _pendingOwner) ERC721("DragonBall", "DBL") {}

    /**
     * @notice Mint new ball
     *
     * @param _numberOfBall - number of ball
     * @param _beneficiary - address of beneficiary
     *
     * No return only Owner can call
     */
    function mint(uint8 _numberOfBall, address _beneficiary) public onlyOwner {
        _safeMint(_beneficiary, index);
        numberOfBall[index] = _numberOfBall;
        index++;

        emit NewBall(index-1, _numberOfBall, _beneficiary);
    }

    /**
     * @notice Burn ball
     *
     * @param _tokenId - id of token
     *
     * No return only Lottery contract can call
     */
    function burn(uint256 _tokenId) public {
        if (msg.sender != lotteryContract) revert DragonBall_NotAllowed();
        _burn(_tokenId);

        emit BallBurned(_tokenId);
    }

    /**
     * @notice Get ball number
     *
     * @param _tokenId - id of token
     *
     * @return number of ball
     */
    function getBallNumber(uint256 _tokenId) public view returns (uint8) {
        return numberOfBall[_tokenId];
    }

    /**
     * @notice Set lottery contract
     *
     * @param _lotteryContract - address of lottery contract
     *
     * No return only Owner can call
     */
    function setLotteryContract(address _lotteryContract) public onlyOwner {
        lotteryContract = _lotteryContract;

        emit LotteryContractSet(_lotteryContract);
    }

   
}
