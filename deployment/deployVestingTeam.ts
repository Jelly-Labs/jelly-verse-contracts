import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import { VestingTeam__factory } from '../typechain-types';

task(`deploy-vesting-team`, `Deploys the VestingTeam smart contract`)
	.addParam(`amount`, `The total vested amount`)
	.addParam(
		`beneficiary`,
		`The beneficiary address where released tokens will be sent to`
	)
	.addParam(`revoker`, `The address that can revoke vested tokens`)
	.addParam(`token`, `The Jelly token address`)
	.addParam(
		`startTimestamp`,
		`The UNIX timestamp where the vesting period starts`
	)
	.addParam(`cliffDuration`, `The duration of the cliff period`)
	.addParam(`vestingDuration`, `The duration of the linear vesting period`)
	.addParam(`owner`, `The multisig owner address`)
	.addParam(`pendingOwner`, `The pending owner address if needed`)
	.setAction(
		async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
			const {
				amount,
				beneficiary,
				revoker,
				token,
				startTimestamp,
				cliffDuration,
				vestingDuration,
				owner,
				pendingOwner,
			} = taskArguments;

			const [deployer] = await hre.ethers.getSigners();

			console.log(
				`ℹ️  Attempting to deploy the VestingTeam smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${amount} as total vested amount, ${beneficiary} as beneficiary address where released tokens will be sent to, ${revoker} as the address that can revoke vested tokens, ${token} as the Jelly token address, ${startTimestamp} as the UNIX timestamp where the vesting period starts, ${cliffDuration} as the duration of the cliff period, ${vestingDuration} as the duration of the linear vesting period, ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
			);

			const VestingTeamFactory: VestingTeam__factory =
				await hre.ethers.getContractFactory('VestingTeam');

			const vestingTeam = await VestingTeamFactory.deploy(
				amount,
				beneficiary,
				revoker,
				token,
				startTimestamp,
				cliffDuration,
				vestingDuration,
				owner,
				pendingOwner
			);

			await vestingTeam.deployed();

			console.log(`✅ VestingTeam deployed to: ${vestingTeam.address}`);

			// Verify the contract on Etherscan

			console.log(
				`ℹ️  Attempting to verify the VestingTeam smart contract on Etherscan...`
			);

			try {
				await hre.run(`verify:verify`, {
					address: vestingTeam.address,
					constructorArguments: [
						amount,
						beneficiary,
						revoker,
						token,
						startTimestamp,
						cliffDuration,
						vestingDuration,
						owner,
						pendingOwner,
					],
				});
			} catch (error) {
				console.log(
					`❌ Failed to verify the VestingTeam smart contract on Etherscan: ${error}`
				);

				console.log(
					`📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${vestingTeam.address} ${amount} ${beneficiary} ${revoker} ${token} ${startTimestamp} ${cliffDuration} ${vestingDuration} ${owner} ${pendingOwner}`
				);
			}
		}
	);
