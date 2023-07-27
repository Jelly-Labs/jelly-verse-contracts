import {
	MockContract,
	deployMockContract,
} from '@ethereum-waffle/mock-contract';
import { Signer } from 'ethers';
import { artifacts, ethers } from 'hardhat';
import { Artifact } from 'hardhat/types';

export async function deployMockJelly(deployer: Signer): Promise<MockContract> {
	const jellyTokenArtifact: Artifact = await artifacts.readArtifact(
		`JellyToken`
	);

	const mockJelly: MockContract = await deployMockContract(
		deployer,
		jellyTokenArtifact.abi
	);

	const premintAmount: number = 3 * 133_000_000;
	await mockJelly.mock.totalSupply.returns(
		ethers.utils.parseEther(premintAmount.toString())
	);
	await mockJelly.mock.cap.returns(ethers.utils.parseEther(`1000000000`));
	await mockJelly.mock.transfer.returns(true);
	await mockJelly.mock.transferFrom.returns(true);

	return mockJelly;
}
