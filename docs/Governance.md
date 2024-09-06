# Governance

The governance contract is responsible for managing the voting process for proposals. It is also responsible for executing the proposals once the voting period has ended. Contracts are mostly openzeppelin contracts with some modifications to fit the needs of the Jelly Protocol, like Voting with Chest powers, and open proposals.

## Changes from OpenZeppelin contracts v4.9.0
### GovernorSettings.sol (extensions folder)
Changes to OpenZeppelin's governance/extensions/GovernorSettings.sol
1. Only difference is that we removed 3 functions for setting min voting delay, period and proposal threshold (don't need them there is proposeCustom function in Governor.sol). Removed functions:
```
    /**
     * @dev Update the voting delay. This operation can only be performed through a governance proposal.
     *
     * Emits a {VotingDelaySet} event.
     */
    function setVotingDelay(uint256 newVotingDelay) public virtual onlyGovernance {
        _setVotingDelay(newVotingDelay);
    }

    /**
     * @dev Update the voting period. This operation can only be performed through a governance proposal.
     *
     * Emits a {VotingPeriodSet} event.
     */
    function setVotingPeriod(uint256 newVotingPeriod) public virtual onlyGovernance {
        _setVotingPeriod(newVotingPeriod);
    }

    /**
     * @dev Update the proposal threshold. This operation can only be performed through a governance proposal.
     *
     * Emits a {ProposalThresholdSet} event.
     */
    function setProposalThreshold(uint256 newProposalThreshold) public virtual onlyGovernance {
        _setProposalThreshold(newProposalThreshold);
    }
```

### GovernorTimelockControl.sol (extensions folder)
Changes to OpenZeppelin's governance/extensions/GovernorTimelockControl.sol
1. Only difference is that we modified _cancel function to remove check if proposal should be canceled in timelock as well. It's removed because proposal can't be canceled if already in timelock. Modified functions:
```
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override returns (uint256) {
        uint256 proposalId = super._cancel(targets, values, calldatas, descriptionHash);

        // if (_timelockIds[proposalId] != 0) {
        //     _timelock.cancel(_timelockIds[proposalId]);
        //     delete _timelockIds[proposalId];
        // } Proposal can be canceled only before voting starts (no queued proposal)

        return proposalId;
    }
```

### GovernorCountingSimple.sol (extensions folder)
Same as OpenZeppelin's governance/extensions/GovernorCountingSimple.sol, just our Governor.sol is imported


### Governor.sol
Changes to OpenZeppelin's Governor.sol:
1. Changed ProposalCore struct parameters (added finalChestId)

```diff
struct ProposalCore {
        // --- start retyped from Timers.BlockNumber at offset 0x00 ---
        uint64 voteStart;
        address proposer;
        bytes4 __gap_unused0;
        // --- start retyped from Timers.BlockNumber at offset 0x20 ---
        uint64 voteEnd;
        bytes24 __gap_unused1;
        // --- Remaining fields starting at offset 0x40 ---------------
        bool executed;
        bool canceled;
        uint256 finalChestId; // <---- added parameter
    }
```

2. Added 3 Contract variables
```
    uint48 private _minVotingDelay;
    uint48 private _minVotingPeriod;
    IChest private immutable _chest;
```

3. Added 3 parameters to the constructor
```
    /**
     * @dev Sets the value for {name} and {version}
     */
    constructor(
        string memory name_,
        address chest_,
        uint48 minVotingDelay_,
        uint48 minVotingPeriod_
    ) EIP712(name_, version()) {
        _name = name_;
        _minVotingDelay = minVotingDelay_;
        _minVotingPeriod = minVotingPeriod_;
        _chest = IChest(chest_);
    }
```

4. Getter function for last chest viable for proposal 
```
    /**
     * @dev Returns final chest of passed proposal.
     */
    function proposalFinalChest(
        uint256 proposalId
    ) public view returns (uint256) {
        return _proposals[proposalId].finalChestId;
    }
```

5. Propose Custom Function to create proposal with custom delay and voting period
```
    /**
     * @dev See {IGovernor-propose}. This function has opt-in frontrunning protection, described in {_isValidDescriptionForProposer}.
     */
    function proposeCustom(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        uint256 votingDelay,
        uint256 votingPeriod
    ) public virtual returns (uint256) {
        require(
            votingDelay >= _minVotingDelay,
            "Governor: voting delay must exceed minimum voting delay"
        );
        require(
            votingPeriod >= _minVotingPeriod,
            "Governor: voting period must exceed minimum voting period"
        );
        address proposer = _msgSender();
        require(
            _isValidDescriptionForProposer(proposer, description),
            "Governor: proposer restricted"
        );

        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            keccak256(bytes(description))
        );

        require(
            targets.length == values.length,
            "Governor: invalid proposal length"
        );
        require(
            targets.length == calldatas.length,
            "Governor: invalid proposal length"
        );
        require(targets.length > 0, "Governor: empty proposal");
        require(
            _proposals[proposalId].voteStart == 0,
            "Governor: proposal already exists"
        );

        uint256 snapshot = clock() + votingDelay;
        // @dev avoiding stack too deep error by not using deadline variable

        _proposals[proposalId] = ProposalCore({
            proposer: proposer,
            finalChestId: _chest.totalSupply() - 1,
            voteStart: SafeCast.toUint64(snapshot),
            voteEnd: SafeCast.toUint64(snapshot + votingPeriod),
            executed: false,
            canceled: false,
            __gap_unused0: 0,
            __gap_unused1: 0
        });

        emit ProposalCreated(
            proposalId,
            proposer,
            targets,
            values,
            new string[](targets.length),
            calldatas,
            snapshot,
            snapshot + votingPeriod,
            description
        );

        return proposalId;
    }
```

6. Propose function modifed by removing check for min votes (it's open, threshold is 0), and adding finalChestId to ProposalCore struct
Removed:
```
require(
            getVotes(proposer, currentTimepoint - 1) >= proposalThreshold(),
            "Governor: proposer votes below proposal threshold"
        );
```

7. There are some differences in linter, but not in logic

### GovernorVotes.sol
Changes to OpenZeppelin's GovernorVotes.sol are largest, because we added Chest voting power as a way of weighting votes `_getVotes` function. We also modified clock function to work with timestamps instead of blocknumbers
