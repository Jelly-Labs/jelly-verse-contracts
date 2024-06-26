// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import {Ownable} from "./utils/Ownable.sol";

/**
 * @title Daily Snapshot Contract
 *
 * @notice Store & retrieve daily snapshots blocknumbers per epoch
 */
contract DailySnapshot is Ownable {
    bool public started;
    uint8 public epochDaysIndex;
    uint40 public epoch;
    uint40 public beginningOfTheNewDayTimestamp;
    uint48 public beginningOfTheNewDayBlocknumber;
    uint48 public oneDayBlocks = 192000; // 192000 blocks = 1 day, 0.45s per block
    uint40 constant ONE_DAY_SECONDS = 86400; // one day in seconds
    mapping(uint48 => uint48[7]) public dailySnapshotsPerEpoch;

    event SnapshottingStarted(address sender);
    event DailySnapshotAdded(
        address sender,
        uint48 indexed epoch,
        uint48 indexed randomDayBlocknumber,
        uint8 indexed epochDaysIndex
    );
    event BlockTimeChanged(uint48 newBlockTime);

    error DailySnapshot_AlreadyStarted();
    error DailySnapshot_NotStarted();
    error DailySnapshot_TooEarly();
    error DailySnapshot_ZeroBlockTime();

    modifier onlyStarted() {
        if (!started) {
            revert DailySnapshot_NotStarted();
        }
        _;
    }
    constructor(
        address newOwner_,
        address pendingOwner_
    ) Ownable(newOwner_, pendingOwner_) {}

    /**
     * @notice Signals the contract to start
     *
     * No return only Owner can call
     */
    function startSnapshotting() external onlyOwner {
        if (started) {
            revert DailySnapshot_AlreadyStarted();
        }
        started = true;
        beginningOfTheNewDayTimestamp = uint40(block.timestamp);
        beginningOfTheNewDayBlocknumber = uint48(block.number);

        emit SnapshottingStarted(msg.sender);
    }

    /**
     * @notice Store random daily snapshot block number
     *
     * @dev Only callable when snapshoting has already started
     */
    function dailySnapshot() external onlyStarted {
        if (
            beginningOfTheNewDayTimestamp + ONE_DAY_SECONDS > block.timestamp
        ) {
            revert DailySnapshot_TooEarly();
        }
        uint48 randomBlockOffset = uint48(block.prevrandao) % oneDayBlocks;
        uint48 randomDailyBlock = beginningOfTheNewDayBlocknumber +
            randomBlockOffset;
        dailySnapshotsPerEpoch[epoch][epochDaysIndex] = randomDailyBlock;

        emit DailySnapshotAdded(
            msg.sender,
            epoch,
            randomDailyBlock,
            epochDaysIndex
        );

        unchecked {
            beginningOfTheNewDayTimestamp += ONE_DAY_SECONDS;
            beginningOfTheNewDayBlocknumber += oneDayBlocks;
            ++epochDaysIndex;
        }
        if (epochDaysIndex == 7) {
            unchecked {
                epochDaysIndex = 0;
                ++epoch;
            }
        }
    }

    /**
     * @notice Changes the block time
     *
     * No return only Owner can call
     */
    function setBlockTime(uint48 _oneDayBlocks) external onlyOwner {
        if (_oneDayBlocks == 0) revert DailySnapshot_ZeroBlockTime();
        oneDayBlocks = _oneDayBlocks;

        emit BlockTimeChanged(_oneDayBlocks);
    }
}
