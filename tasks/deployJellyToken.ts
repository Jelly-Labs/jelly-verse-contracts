import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import { JellyToken, JellyToken__factory } from '../typechain-types';

task(`deploy-jelly-token`, `Deploys the JellyToken contract`)
	.addParam(`admin`, `The admin multisig address`)
	.setAction(
		async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
			const { admin } = taskArguments;
			const [deployer] = await hre.ethers.getSigners();

			console.log(
				`ℹ️  Attempting to deploy the JellyToken smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${admin} address as the admin multisig address...`
			);

			const JellyTokenFactory: JellyToken__factory =
				await hre.ethers.getContractFactory('JellyToken');
			const jellyToken: JellyToken = await JellyTokenFactory.deploy(admin);

			await jellyToken.deployed();

			console.log(`✅ JellyToken deployed to: ${jellyToken.address}`);

			// Verify the contract on Etherscan
			console.log(
				`ℹ️  Attempting to verify the JellyToken smart contract on Etherscan...`
			);

			try {
				await hre.run(`verify:verify`, {
					address: jellyToken.address,
					constructorArguments: [admin],
				});
			} catch (error) {
				console.log(
					`❌ Failed to verify the JellyToken smart contract on Etherscan: ${error}`
				);

				console.log(
					`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${jellyToken.address} ${admin}`
				);
			}
		}
	);
