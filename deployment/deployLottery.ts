import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import {  Lottery,  Lottery__factory } from '../typechain-types';


task(`deploy-lotttery`, `Deploys the  Lottery contract`)
	.setAction(
		async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
		const owner = "0xe34D487E8683A1Dcbc959b5b31de20e2772A882A";
		const pendingowner = "0x0000000000000000000000000000000000000000";
		const chest = "0x1EF1715603171504C01a029Ce12aCc493cd7687a"
		const jelly = "0xfDCEd108BDcBCd02E5C3B5795c06F831Fe681064"
		const dragon = "0x3bF056EE03fD080768365e13c9F8baC353396041"
			const [deployer] = await hre.ethers.getSigners();

			console.log(
				`ℹ️  Attempting to deploy the  Lottery contract to the ${hre.network.name} blockchain using ${deployer.address} address by passing the ${owner} as the multisig owner address, ${pendingowner} as the pending owner address if needed...`
			);

			const  LotteryFactory: Lottery__factory =
				await hre.ethers.getContractFactory('Lottery');
			const  Lottery:  Lottery= await LotteryFactory.deploy( owner, pendingowner,dragon,chest,jelly);

			await  Lottery.deployed();

			console.log(`✅  Lottery to: ${ Lottery.address}`);

			console.log(
				`ℹ️  Attempting to verify the  Lottery contract on Etherscan...`
			);

			console.log(
				`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${Lottery.address} ${owner} ${pendingowner}`
			);
			try {
				await hre.run(`verify:verify`, {
					address:  Lottery.address,
					constructorArguments: [owner, pendingowner,dragon,chest,jelly],
				});
			} catch (error) {
				console.log(
					`❌ Failed to verify the  Lottery contract on Etherscan: ${error}`
				);

				console.log(
					`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${Lottery.address} ${owner} ${pendingowner}`
				);
			}
		}
	);
	