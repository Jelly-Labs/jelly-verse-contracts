import { ethers } from 'hardhat';
import { getSigners } from '../shared/utils';
import { JellyToken, JellyToken__factory } from '../../typechain-types';

type UnitJellyTokenFixtureType = {
	jellyToken: JellyToken;
	// mockAllocatorAddress: string;
	// mockVestingTeamAddress: string;
	// mockVestingInvestorAddress: string;
	// mockMinterContractAddress: string;
};

export async function deployJellyTokenFixture(): Promise<UnitJellyTokenFixtureType> {
	const { deployer, ownerMultiSig } = await getSigners();

	const JellyTokenFactory: JellyToken__factory =
		await ethers.getContractFactory('JellyToken');
	const jellyToken: JellyToken = await JellyTokenFactory.connect(
		deployer
	).deploy(ownerMultiSig.address);

	return {
		jellyToken,
	};
}
