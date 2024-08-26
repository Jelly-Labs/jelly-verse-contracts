import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import { RewardDistribution, RewardDistribution__factory } from '../typechain-types';


task(`deploy-reward-distribution`, `Deploys the RewardDistribution contract`)
	.setAction(
		async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
		const owner = "0x0000000000000000000000000000000000000000";
		const pendingowner = "0x0000000000000000000000000000000000000000";
			const [deployer] = await hre.ethers.getSigners();

			console.log(
				`ℹ️  Attempting to deploy the RewardDistribution contract to the ${hre.network.name} blockchain using ${deployer.address} address by passing the ${owner} as the multisig owner address, ${pendingowner} as the pending owner address if needed...`
			);

			const RewardDistributionFactory: RewardDistribution__factory =
				await hre.ethers.getContractFactory('RewardDistribution');
			const RewardDistribution: RewardDistribution= await RewardDistributionFactory.deploy( owner, pendingowner);

			await RewardDistribution.deployed();

			console.log(`✅ RewardDistributiondeployed to: ${RewardDistribution.address}`);

			console.log(
				`ℹ️  Attempting to verify the RewardDistribution contract on Etherscan...`
			);

			try {
				await hre.run(`verify:verify`, {
					address: RewardDistribution.address,
					constructorArguments: [owner, pendingowner],
				});
			} catch (error) {
				console.log(
					`❌ Failed to verify the RewardDistribution contract on Etherscan: ${error}`
				);

				console.log(
					`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${RewardDistribution.address} ${owner} ${pendingowner}`
				);
			}
		}
	);
	