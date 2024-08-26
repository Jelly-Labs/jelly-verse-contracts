import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import {  DragonBall,  DragonBall__factory } from '../typechain-types';


task(`deploy-dragon-ball`, `Deploys the  DragonBall contract`)
	.setAction(
		async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
		const owner = "0xe34D487E8683A1Dcbc959b5b31de20e2772A882A";
		const pendingowner = "0x0000000000000000000000000000000000000000";
			const [deployer] = await hre.ethers.getSigners();

			console.log(
				`ℹ️  Attempting to deploy the  DragonBall contract to the ${hre.network.name} blockchain using ${deployer.address} address by passing the ${owner} as the multisig owner address, ${pendingowner} as the pending owner address if needed...`
			);

			const  DragonBallFactory: DragonBall__factory =
				await hre.ethers.getContractFactory('DragonBall');
			const  DragonBall:  DragonBall= await DragonBallFactory.deploy( owner, pendingowner);

			await  DragonBall.deployed();

			console.log(`✅  DragonBall to: ${ DragonBall.address}`);

			console.log(
				`ℹ️  Attempting to verify the  DragonBall contract on Etherscan...`
			);

			console.log(
				`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${DragonBall.address} ${owner} ${pendingowner}`
			);
			try {
				await hre.run(`verify:verify`, {
					address:  DragonBall.address,
					constructorArguments: [owner, pendingowner],
				});
			} catch (error) {
				console.log(
					`❌ Failed to verify the  DragonBall contract on Etherscan: ${error}`
				);

				console.log(
					`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${DragonBall.address} ${owner} ${pendingowner}`
				);
			}
		}
	);
	