import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Vesting, Vesting__factory } from '../../typechain-types';
import { getSigners } from '../shared/utils';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { MockContract } from '@ethereum-waffle/mock-contract';
import { deployMockJelly } from '../shared/mocks';

type UnitVestingFixtureType = {
	vesting: Vesting;
	mockJelly: MockContract;
	amount: BigNumber;
	beneficiary: SignerWithAddress;
	revoker: SignerWithAddress;
	startTimestamp: BigNumber;
	cliffDuration: number;
	vestingDuration: number;
};

export async function unitVestingFixture(): Promise<UnitVestingFixtureType> {
	const { deployer, beneficiary, revoker } = await getSigners();

	const amount: BigNumber = ethers.utils.parseEther(`133000000`);
	const cliffDuration: number = 15778458; // 6 months
	const vestingDuration: number = 47335374; // 18 months
	const startTimestamp: BigNumber = BigNumber.from(1704067200); // 01 January 2024

	const mockJelly: MockContract = await deployMockJelly(deployer);

	const vestingFactory: Vesting__factory = await ethers.getContractFactory(
		`Vesting`
	);
	const vesting: Vesting = await vestingFactory.deploy(
		amount,
		beneficiary.address,
		revoker.address,
		startTimestamp,
		cliffDuration,
		vestingDuration,
		mockJelly.address
	);

	return {
		vesting,
		mockJelly,
		amount,
		beneficiary,
		revoker,
		startTimestamp,
		cliffDuration,
		vestingDuration,
	};
}
