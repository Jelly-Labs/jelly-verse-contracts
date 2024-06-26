// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./utils/Ownable.sol";

/**
 * @title Official Pool Register
 *
 * @notice Store & sretrieve pools
 */
contract OfficialPoolsRegister is Ownable {
  struct Pool {
    bytes32 poolId;
    uint32 weight;
  }

  bytes32[] private poolIds;
  
  event OfficialPoolRegistered(bytes32 indexed poolId, uint32 weight);
  event OfficialPoolDeregistered(bytes32 indexed  poolId);
  
  error OfficialPoolsRegister_MaxPools50();

  constructor(address newOwner_, address pendingOwner_) Ownable(newOwner_, pendingOwner_) {}

  /**
  * @notice Store array of poolId in official pools array
  *
  * @dev Only owner can call.
  * 
  * @param pools_ to store
  */
  function registerOfficialPool(Pool[] memory pools_) external onlyOwner {
    for(uint256 i;i<poolIds.length;++i) {
      emit OfficialPoolDeregistered(poolIds[i]);
    }
    delete poolIds;

    uint256 size = pools_.length;
    if(size > 50) {
      revert OfficialPoolsRegister_MaxPools50();
    }

    for(uint256 i=0;i<size;++i) {
      Pool memory pool = pools_[i];
      bytes32 poolId = pool.poolId;  
      poolIds.push(poolId);
      emit OfficialPoolRegistered(poolId, pool.weight);
    }
  }

  /**
  /**
  * @notice Return all official pools ids
  * 
  * @return all 'poolIds'
  */
  function getAllOfficialPools() public view returns(bytes32[] memory) {
    return poolIds;
  }
}
