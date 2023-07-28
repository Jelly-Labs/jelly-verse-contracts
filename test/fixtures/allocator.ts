import { ethers } from 'hardhat';
import {
	JellyToken,
	JellyToken__factory,
	Allocator,
	Allocator__factory,
	ERC20Token,
	ERC20Token__factory,
} from '../../typechain-types';

export async function deployAllocator() {
	const dusdJellyRatio = 100;

	const [owner, otherAccount, vesting, vestingJelly] =
		await ethers.getSigners();

	// Deploy DUSD
	const ERC20TokenFactory: ERC20Token__factory =
		await ethers.getContractFactory('ERC20Token');

	const dusdToken: ERC20Token = await ERC20TokenFactory.deploy('DUSD', 'dusd');

	// Deploy Allocator
	const AllocatorFactory: Allocator__factory = await ethers.getContractFactory(
		'Allocator'
	);

	const allocator: Allocator = await AllocatorFactory.deploy(
		dusdToken.address,
		dusdJellyRatio
	);

	// Deploy Jelly Token
	const JellyTokenFactory: JellyToken__factory =
		await ethers.getContractFactory('JellyToken');
	const jellyToken: JellyToken = await JellyTokenFactory.deploy(
		vesting.address,
		vestingJelly.address,
		allocator.address
	);

	return {
		allocator,
		jellyToken,
		dusdToken,
		dusdJellyRatio,
		owner,
		otherAccount,
	};
}
