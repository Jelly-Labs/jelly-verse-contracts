import { assert, expect } from 'chai';
import { utils, constants, BigNumber } from 'ethers';
import { time, mine } from '@nomicfoundation/hardhat-network-helpers';
import { JellyGovernor__factory, JellyGovernor } from '../../../typechain-types';
import { ethers } from 'hardhat';
import { deployMockJellyTimelock } from '../../shared/mocks';

export function shouldExecuteProposals(): void {
	describe('#execute', async function () {
		const amountToMint = utils.parseEther('100');
		const proposalDescription = 'Test Proposal #1: Mint 100 JLY tokens to Alice';
		const proposalReason = 'I like this proposal.';
		const voteAgainst = 0;
		const voteFor = 1;
		const voteAbstain = 2;
		let proposalAddresses: string[];
		let proposalValues: BigNumber[];
		let proposalCalldata: string[];
		let mintFunctionCalldata: string;
		let proposalParams: string;
		let proposalId: BigNumber;
		let chestIDs: number[];

		beforeEach(async function () {
			mintFunctionCalldata =
				this.mocks.mockJellyToken.interface.encodeFunctionData('mint', [
					this.signers.alice.address,
					amountToMint,
				]);
			proposalAddresses = [this.mocks.mockJellyToken.address];
			proposalValues = [amountToMint];
			proposalCalldata = [mintFunctionCalldata];

			proposalId = await this.jellyGovernor.callStatic.propose(
				proposalAddresses,
				proposalValues,
				proposalCalldata,
				proposalDescription
			);

			await this.jellyGovernor.propose(
				proposalAddresses,
				proposalValues,
				proposalCalldata,
				proposalDescription
			);
			
			chestIDs = [1, 2, 3];

			proposalParams = utils.defaultAbiCoder.encode(
			['uint256[]'],
			[chestIDs]     
			);
			await mine(this.params.votingDelay);
			await this.jellyGovernor.connect(this.signers.alice).castVoteWithReasonAndParams(proposalId, voteFor, proposalReason, proposalParams);
		});

		describe('failure', async function () {
			it('should revert if proposal passed is invalid', async function () {
				await expect(
					this.jellyGovernor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						constants.HashZero
					)
				).to.be.revertedWith('Governor: unknown proposal id');
			});

			it('should revert if proposal voting hasn\'t ended', async function () {
				await this.jellyGovernor.connect(this.signers.bob).castVoteWithReasonAndParams(proposalId, voteFor, proposalReason, proposalParams);
				const descriptionBytes = utils.toUtf8Bytes(proposalDescription);
				const hashedDescription = utils.keccak256(descriptionBytes);
				await expect(
					this.jellyGovernor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						hashedDescription
					)
				).to.be.revertedWith('Governor: proposal not queued');
			});

			it('should revert if proposal is not queued (successfull state)', async function () {
				await this.jellyGovernor.connect(this.signers.bob).castVoteWithReasonAndParams(proposalId, voteFor, proposalReason, proposalParams);
				await mine(this.params.votingPeriod.add(constants.One));
				const descriptionBytes = utils.toUtf8Bytes(proposalDescription);
				const hashedDescription = utils.keccak256(descriptionBytes);
				await expect(
					this.jellyGovernor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						hashedDescription
					)
				).to.be.revertedWith('Governor: proposal not queued');
			});

			it('should revert if proposal is not queued (unsuccessfull state)', async function () {
				await this.jellyGovernor.connect(this.signers.bob).castVoteWithReasonAndParams(proposalId, voteAgainst, proposalReason, proposalParams);
				await mine(this.params.votingPeriod.add(constants.One));
				const descriptionBytes = utils.toUtf8Bytes(proposalDescription);
				const hashedDescription = utils.keccak256(descriptionBytes);
				await expect(
					this.jellyGovernor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						hashedDescription
					)
				).to.be.revertedWith('Governor: proposal not queued');
			});

			it('should revert if proposal already executed', async function () {
				const mockJellyTimelock = await deployMockJellyTimelock(
					this.signers.deployer, 
					this.mocks.mockJellyToken, 
					this.signers.alice.address, 
					true, // is executed
					false // is pending
				);
				const jellyGovernorFactory: JellyGovernor__factory =
					await ethers.getContractFactory('JellyGovernor') as JellyGovernor__factory;

				const jellyGovernor: JellyGovernor = await jellyGovernorFactory.deploy(
					this.mocks.mockChest.address,
					mockJellyTimelock.address
				);
				const governor = await jellyGovernor.deployed();

				await governor.propose(
					proposalAddresses,
					proposalValues,
					proposalCalldata,
					proposalDescription
				);
				await mine(this.params.votingDelay);
				await governor.connect(this.signers.alice).castVoteWithReasonAndParams(proposalId, voteFor, proposalReason, proposalParams);
				await governor.connect(this.signers.deployer).castVoteWithReasonAndParams(proposalId, voteAbstain, proposalReason, proposalParams);
				await mine(this.params.votingPeriod);

				const descriptionBytes = utils.toUtf8Bytes(proposalDescription);
				const hashedDescription = utils.keccak256(descriptionBytes);

				await governor.queue(
					proposalAddresses,
					proposalValues,
					proposalCalldata,
					hashedDescription
				);
				await expect(
					governor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						hashedDescription
					)
				).to.be.revertedWith('Governor: proposal not queued');
			});

			it('should revert if proposal already canceled', async function () {
				const mockJellyTimelock = await deployMockJellyTimelock(
					this.signers.deployer, 
					this.mocks.mockJellyToken, 
					this.signers.alice.address, 
					false, // is executed
					false  // is pending
				);
				const jellyGovernorFactory: JellyGovernor__factory =
					await ethers.getContractFactory('JellyGovernor') as JellyGovernor__factory;

				const jellyGovernor: JellyGovernor = await jellyGovernorFactory.deploy(
					this.mocks.mockChest.address,
					mockJellyTimelock.address
				);
				const governor = await jellyGovernor.deployed();

				await governor.propose(
					proposalAddresses,
					proposalValues,
					proposalCalldata,
					proposalDescription
				);
				await mine(this.params.votingDelay);
				await governor.connect(this.signers.alice).castVoteWithReasonAndParams(proposalId, voteFor, proposalReason, proposalParams);
				await governor.connect(this.signers.deployer).castVoteWithReasonAndParams(proposalId, voteAbstain, proposalReason, proposalParams);
				await mine(this.params.votingPeriod);

				const descriptionBytes = utils.toUtf8Bytes(proposalDescription);
				const hashedDescription = utils.keccak256(descriptionBytes);

				await governor.queue(
					proposalAddresses,
					proposalValues,
					proposalCalldata,
					hashedDescription
				);
				await expect(
					governor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						hashedDescription
					)
				).to.be.revertedWith('Governor: proposal not queued');
			});
		});

		describe('success', async function () {
			let hashedDescription: string;

			beforeEach(async function () {
				await this.jellyGovernor.connect(this.signers.deployer).castVoteWithReasonAndParams(proposalId, voteAbstain, proposalReason, proposalParams);
				await mine(this.params.votingPeriod);
				const descriptionBytes = utils.toUtf8Bytes(proposalDescription);
				hashedDescription = utils.keccak256(descriptionBytes);

				await this.jellyGovernor.queue(
					proposalAddresses,
					proposalValues,
					proposalCalldata,
					hashedDescription
				);

				if (this.currentTest) {
					if (this.currentTest.title === 'should emit ProposalExecuted event')
						return;
				}

				await this.jellyGovernor.execute(
					proposalAddresses,
					proposalValues,
					proposalCalldata,
					hashedDescription
				);
			});

			it('should set proposal as executed', async function () {
				const executedState = 7;
				const state = await this.jellyGovernor.state(
					proposalId
				);

				assert(state == executedState, 'Incorrect state');
			});

			it('should emit ProposalExecuted event', async function () {
				await expect(
					this.jellyGovernor.execute(
						proposalAddresses,
						proposalValues,
						proposalCalldata,
						hashedDescription
					)
				)
					.to.emit(this.jellyGovernor, 'ProposalExecuted')
					.withArgs(
						proposalId
					);
			});
		});
	});
}