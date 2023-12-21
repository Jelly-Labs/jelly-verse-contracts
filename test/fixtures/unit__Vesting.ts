import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { VestingLibTest, VestingLibTest__factory } from '../../typechain-types';
import { getSigners } from '../shared/utils';
import { ethers } from 'hardhat';
import { BigNumber, constants } from 'ethers';
import { MockContract } from '@ethereum-waffle/mock-contract';
import { deployMockJelly } from '../shared/mocks';

type UnitVestingFixtureType = {
	vesting: VestingLibTest;
	amount: BigNumber;
	revoker: SignerWithAddress;
	startTimestamp: BigNumber;
	cliffDuration: number;
	vestingDuration: number;
	freezingPeriod: number;
	booster: BigNumber;
	nerfParameter: number;
};

export async function unitVestingFixture(): Promise<UnitVestingFixtureType> {
	const { deployer, revoker } = await getSigners();

	const amount: BigNumber = ethers.utils.parseEther(`133000000`);
	const cliffDuration: number = 15778458; // 6 months
	const vestingDuration: number = 47335374; // 18 months
	const startTimestamp: BigNumber = BigNumber.from(1704067200); // 01 January 2024
	const booster: BigNumber = ethers.utils.parseEther(`10`);
	const nerfParameter: number = 10; // no nerf

	const vestingFactory: VestingLibTest__factory = await ethers.getContractFactory(
		`VestingLibTest`
	);
	const vesting: VestingLibTest = await vestingFactory.deploy();

	return {
		vesting,
		amount,
		revoker,
		startTimestamp,
		cliffDuration,
		vestingDuration,
		booster,
		nerfParameter
	};
}