import { BigNumber, constants } from "ethers";
import {
  JellyTokenDeployer__factory,
  JellyTokenDeployer,
  JellyToken,
  JellyToken__factory,
  PoolParty__factory,
  JellyTimelock__factory,
  JellyTimelock,
  JellyGovernor__factory,
  JellyGovernor,
  LiquidityRewardDistribution__factory,
  LiquidityRewardDistribution,
  StakingRewardDistribution__factory,
  StakingRewardDistribution,
  OfficialPoolsRegister__factory,
  OfficialPoolsRegister,
  DailySnapshot__factory,
  DailySnapshot,
  Minter__factory,
  Minter,
  Chest__factory,
  Chest,
  RewardVesting__factory,
  RewardVesting,
  TeamDistribution__factory,
  TeamDistribution,
  InvestorDistribution__factory,
  InvestorDistribution,
} from "../typechain-types";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task(`deploy-protocol`, `Deploys the Jelly Swap Protocol`).setAction(
  async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();
    const MINTER_ROLE =hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('MINTER_ROLE'));
    const DEFAULT_ADMIN_ROLE =hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('DEFAULT_ADMIN_ROLE'));

    //Governance.sol
    const timelockAdminAddress = deployer.address;

    //Alocator.sol
    const weth = "0xb16F35c0Ae2912430DAc15764477E179D9B9EbEa";
    const nativeToJellyRatio = 2;
    const vault = "0xb16F35c0Ae2912430DAc15764477E179D9B9EbEa";
    const poolId =
      "0xd37b5b84caf44f5f446ea03c265e3fceb14ea6ec00020000000000000000002f";

    const pendingOwner = constants.AddressZero;
    //Chest.sol
    const fee = 0;

    //Jelly Timelock

    console.log(
      `ℹ️  Attempting to deploy the Jelly TimeLock smart contracts to the ${hre.network.name} blockchain using ${deployer.address} address, by passing  ${timelockAdminAddress} as the timelock admin address if needed...`
    );

    const timelockProposerAddress = `0x0000000000000000000000000000000000000000`; // everyone can propose
    const timelockExecutorAddress = `0x0000000000000000000000000000000000000000`; // everyone can execute

    const ONE_DAYS_IN_SOLIDITY = BigNumber.from("86400");
    const minTimelockDelay = ONE_DAYS_IN_SOLIDITY;

    const proposers = [timelockProposerAddress];
    const executors = [timelockExecutorAddress];

    const jellyTimelockFactory: JellyTimelock__factory =
      await hre.ethers.getContractFactory("JellyTimelock");
    const jellyTimelock: JellyTimelock = await jellyTimelockFactory.deploy(
      minTimelockDelay,
      proposers,
      executors,
      timelockAdminAddress
    );
    await jellyTimelock.deployed();

    console.log(`✅ JellyTimelock deployed to: ${jellyTimelock.address}`);

    console.log(
      `ℹ️  Attempting to verify the JellyTimeLock smart contracts on Etherscan...`
    );

    try {
      await hre.run("verify:verify", {
        address: jellyTimelock.address,
        constructorArguments: [
          minTimelockDelay,
          proposers,
          executors,
          timelockAdminAddress,
        ],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the JellyTimeLock smart contracts on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with:\n
                       npx hardhat verify --network ${hre.network.name} ${jellyTimelock.address} ${minTimelockDelay} ${proposers} ${executors} ${timelockAdminAddress} &&
                      `
      );
    }

    const owner = jellyTimelock.address;
    //Jely Token
    console.log(
      `ℹ️  Attempting to deploy the Jelly Token smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${deployer} as the Jelly Governace contract address (Timelock)`
    );

    const jellyTokenDeployerFactory: JellyTokenDeployer__factory =
      (await hre.ethers.getContractFactory(
        "JellyTokenDeployer"
      )) as JellyTokenDeployer__factory;

    const jellyTokenDeployer: JellyTokenDeployer =
      await jellyTokenDeployerFactory.connect(deployer).deploy();

    await jellyTokenDeployer.deployed();

    const salt = hre.ethers.utils.keccak256("0x01");

    const jellyToken = await jellyTokenDeployer.callStatic.deployJellyToken(
      salt,
      deployer.address
    );

    const deploymentTx = await jellyTokenDeployer
      .connect(deployer)
      .deployJellyToken(salt, deployer.address);

    await deploymentTx.wait();

    console.log("✅ JellyToken deployed to:", jellyToken);

    console.log(
      `ℹ️  Attempting to verify the Jelly Token smart contracts on Etherscan...`
    );

    try {
      await hre.run("verify:verify", {
        address: jellyTokenDeployer.address,
        constructorArguments: [],
      });

      await hre.run("verify:verify", {
        address: jellyToken,
        constructorArguments: [owner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the Jelly Token smart contracts on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with:\n
                       npx hardhat verify --network ${hre.network.name} ${jellyTokenDeployer.address} &&
                       npx hardhat verify --network ${hre.network.name} ${jellyToken} ${owner}`
      );
    }

    //Chest
    console.log(
      `ℹ️  Attempting to deploy the Chest smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${jellyToken} as the Jelly token address, ${fee} as the minting fee, ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    const ChestFactory: Chest__factory = await hre.ethers.getContractFactory(
      "Chest"
    );

    const chest: Chest = await ChestFactory.deploy(
      jellyToken,
      fee,
      owner,
      pendingOwner
    );

    await chest.deployed();

    console.log(`✅ Chest deployed to: ${chest.address}`);

    console.log(
      `ℹ️  Attempting to verify the Chest smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: chest.address,
        constructorArguments: [
          jellyToken,
          fee,
          owner,
          pendingOwner,
        ],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the Chest smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${chest.address} ${jellyToken} ${fee} ${owner} ${pendingOwner}`
      );
    }

    const chestAddress = chest.address;

    //Governance
    console.log(
      `ℹ️  Attempting to deploy the Jelly Governance smart contracts to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${chestAddress} as the chest contract address, ${timelockAdminAddress} as the timelock admin address if needed...`
    );

    const jellyGovernorFactory: JellyGovernor__factory =
      (await hre.ethers.getContractFactory(
        "JellyGovernor"
      )) as JellyGovernor__factory;

    const jellyGovernance: JellyGovernor = await jellyGovernorFactory.deploy(
      chestAddress,
      jellyTimelock.address
    );
    await jellyGovernance.deployed();

    console.log(`✅ JellyGovernor deployed to: ${jellyGovernance.address}`);

    console.log(
      `ℹ️  Attempting to verify the Jelly Governance smart contracts on Etherscan...`
    );

    try {
      await hre.run("verify:verify", {
        address: jellyGovernance.address,
        constructorArguments: [chestAddress, jellyTimelock.address],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the Jelly Governance smart contracts on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with:\n
					 npx hardhat verify --network ${hre.network.name} ${jellyGovernance.address} ${chestAddress} ${jellyTimelock.address}`
      );
    }

    //Alocator
    console.log(
      `ℹ️  Attempting to deploy the PoolParty smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${jellyToken} as the Jelly token address, the ${weth} as the WETH token address, ${nativeToJellyRatio} as the ratio of Native Tokens To Jelly, ${vault} as the vault contract address, ${poolId} as the poolID which will be joined, ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    const PoolPartyFactory: PoolParty__factory =
      await hre.ethers.getContractFactory("PoolParty");

    const poolParty = await PoolPartyFactory.deploy(
      jellyToken,
      weth,
      nativeToJellyRatio,
      vault,
      poolId,
      owner,
      pendingOwner
    );

    await poolParty.deployed();

    console.log(`✅ Allocator deployed to: ${poolParty.address}`);

    console.log(
      `ℹ️  Attempting to verify the poolParty smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: poolParty.address,
        constructorArguments: [
          jellyToken,
          weth,
          nativeToJellyRatio,
          vault,
          poolId,
          owner,
          pendingOwner,
        ],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the poolParty smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${poolParty.address} ${jellyToken} ${weth} ${nativeToJellyRatio} ${vault} ${poolId} ${owner} ${pendingOwner}`
      );
    }

    console.log(
      `ℹ️  Attempting to deploy the LiquidityRewardDistributionsmart contract to the ${hre.network.name} blockchain using ${deployer.address} address, with ${jellyToken} as the token address, by passing the ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    //Liquidity Reward Distribution
    const LiquidityRewardDistributionFactory: LiquidityRewardDistribution__factory =
      await hre.ethers.getContractFactory("LiquidityRewardDistribution");
    const LiquidityRewardDistribution: LiquidityRewardDistribution =
      await LiquidityRewardDistributionFactory.deploy(
        jellyToken,
        owner,
        pendingOwner
      );

    await LiquidityRewardDistribution.deployed();

    console.log(
      `✅ LiquidityRewardDistributiondeployed to: ${LiquidityRewardDistribution.address}`
    );

    console.log(
      `ℹ️  Attempting to verify the LiquidityRewardDistributionsmart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: LiquidityRewardDistribution.address,
        constructorArguments: [jellyToken, owner, pendingOwner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the LiquidityRewardDistributionsmart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${LiquidityRewardDistribution.address} ${jellyToken} ${owner} ${pendingOwner}`
      );
    }

    console.log(
      `ℹ️  Attempting to deploy the StakingRewardDistribution smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${owner} as the multisig owner address,  with ${jellyToken} as the token address, ${pendingOwner} as the pending owner address if needed...`
    );

    //Staking Reward Distribution
    const StakingRewardDistributionFactory: StakingRewardDistribution__factory =
      await hre.ethers.getContractFactory("StakingRewardDistribution");
    const StakingRewardDistribution: StakingRewardDistribution =
      await StakingRewardDistributionFactory.deploy(
        jellyToken,
        owner,
        pendingOwner
      );

    await StakingRewardDistribution.deployed();

    console.log(
      `✅ StakingRewardDistribution deployed to: ${StakingRewardDistribution.address}`
    );

    console.log(
      `ℹ️  Attempting to verify the StakingRewardDistribution smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: StakingRewardDistribution.address,
        constructorArguments: [jellyToken, owner, pendingOwner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the StakingRewardDistribution smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${StakingRewardDistribution.address} ${jellyToken} ${owner} ${pendingOwner}`
      );
    }

    console.log(
      `ℹ️  Attempting to deploy the OfficialPoolsRegister smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    //Official Pools Register
    const OfficialPoolsRegisterFactory: OfficialPoolsRegister__factory =
      await hre.ethers.getContractFactory("OfficialPoolsRegister");
    const officialPoolsRegister: OfficialPoolsRegister =
      await OfficialPoolsRegisterFactory.deploy(owner, pendingOwner);

    await officialPoolsRegister.deployed();

    console.log(
      `✅ OfficialPoolsRegister deployed to: ${officialPoolsRegister.address}`
    );

    console.log(
      `ℹ️  Attempting to verify the OfficialPoolsRegister smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: officialPoolsRegister.address,
        constructorArguments: [owner, pendingOwner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the OfficialPoolsRegister smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${officialPoolsRegister.address} ${owner} ${pendingOwner}`
      );
    }

    console.log(
      `ℹ️  Attempting to deploy the DailySnapshot smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    //Daily Snapshot
    const DailySnapshotFactory: DailySnapshot__factory =
      await hre.ethers.getContractFactory("DailySnapshot");
    const dailySnapshot: DailySnapshot = await DailySnapshotFactory.deploy(
      owner,
      pendingOwner
    );

    await dailySnapshot.deployed();

    console.log(`✅ DailySnapshot deployed to: ${dailySnapshot.address}`);

    console.log(
      `ℹ️  Attempting to verify the DailySnapshot smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: dailySnapshot.address,
        constructorArguments: [owner, pendingOwner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the DailySnapshot smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${dailySnapshot.address} ${owner} ${pendingOwner}`
      );
    }

    //Minter
    console.log(
      `ℹ️  Attempting to deploy the Minter smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing\n ${jellyToken} as the jelly token address,\n ${StakingRewardDistribution.address} as the Staking Rewards Contract address,\n ${owner} as the owner address,\n ${pendingOwner} as the pending owner address if needed...`
    );

    const minterFactory: Minter__factory = await hre.ethers.getContractFactory(
      "Minter"
    );
    const minter: Minter = await minterFactory.deploy(
      jellyToken,
      StakingRewardDistribution.address,
      owner,
      pendingOwner
    );

    await minter.deployed();

    console.log(`✅ Minter deployed to: ${minter.address}`);

    console.log(
      `ℹ️  Attempting to verify the Minter smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: minter.address,
        constructorArguments: [
          jellyToken,
          StakingRewardDistribution.address,
          owner,
          pendingOwner,
        ],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the minter smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${minter.address} ${jellyToken} ${StakingRewardDistribution.address} ${owner} ${pendingOwner}`
      );
    }

    //seting the minter role and switch admin to timelock
    const jellyTokenFactory: JellyToken__factory =
      (await hre.ethers.getContractFactory(
        "JellyToken"
      )) as JellyToken__factory;
    const jellyTokenContract: JellyToken = jellyTokenFactory.attach(jellyToken);
    await jellyTokenContract.grantRole(DEFAULT_ADMIN_ROLE, owner);
    await jellyTokenContract.grantRole(MINTER_ROLE, minter.address);
    await jellyTokenContract.renounceRole(MINTER_ROLE, deployer.address);
    await jellyTokenContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);

    //Reward Vesting
    console.log(
      `ℹ️  Attempting to deploy the RewardVesting smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, by passing the ${owner} as the multisig owner address, ${LiquidityRewardDistribution.address} as the liquidity contract, ${StakingRewardDistribution.address} as the staking contract, ${jellyToken} as the token address, li ${pendingOwner} as the pending owner address if needed...`
    );

    const RewardVestingFactory: RewardVesting__factory =
      await hre.ethers.getContractFactory("RewardVesting");
    const RewardVesting: RewardVesting = await RewardVestingFactory.deploy(
      owner,
      pendingOwner,
      LiquidityRewardDistribution.address,
      StakingRewardDistribution.address,
      jellyToken
    );

    await RewardVesting.deployed();

    console.log(`✅ RewardVesting deployed to: ${RewardVesting.address}`);

    console.log(
      `ℹ️  Attempting to verify the RewardVesting smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: RewardVesting.address,
        constructorArguments: [
          owner,
          pendingOwner,
          LiquidityRewardDistribution.address,
          StakingRewardDistribution.address,
          jellyToken,
        ],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the RewardVesting smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${owner} ${pendingOwner} ${RewardVesting.address} ${LiquidityRewardDistribution.address} ${StakingRewardDistribution.address} ${jellyToken} `
      );
    }

    console.log(
      `ℹ️  Attempting to deploy the TeamDistribution smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, with ${jellyToken} as the token address, by passing the ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    //Team Distribtuion
    const TeamDistributionFactory: TeamDistribution__factory =
      await hre.ethers.getContractFactory("TeamDistribution");
    const TeamDistribution: TeamDistribution =
      await TeamDistributionFactory.deploy(jellyToken, owner, pendingOwner);

    await TeamDistribution.deployed();

    console.log(`✅ TeamDistribution deployed to: ${TeamDistribution.address}`);

    console.log(
      `ℹ️  Attempting to verify the TeamDistribution smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: TeamDistribution.address,
        constructorArguments: [jellyToken, owner, pendingOwner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the TeamDistribution smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${TeamDistribution.address} ${jellyToken} ${owner} ${pendingOwner}`
      );
    }

    //Investor Distribution
    console.log(
      `ℹ️  Attempting to deploy the InvestorDistribution smart contract to the ${hre.network.name} blockchain using ${deployer.address} address, with ${jellyToken} as the jelly token address, by passing the ${owner} as the multisig owner address, ${pendingOwner} as the pending owner address if needed...`
    );

    const InvestorDistributionFactory: InvestorDistribution__factory =
      await hre.ethers.getContractFactory("InvestorDistribution");
    const InvestorDistribution: InvestorDistribution =
      await InvestorDistributionFactory.deploy(jellyToken, owner, pendingOwner);

    await InvestorDistribution.deployed();

    console.log(
      `✅ InvestorDistribution deployed to: ${InvestorDistribution.address}`
    );

    console.log(
      `ℹ️  Attempting to verify the InvestorDistribution smart contract on Etherscan...`
    );

    try {
      await hre.run(`verify:verify`, {
        address: InvestorDistribution.address,
        constructorArguments: [jellyToken, owner, pendingOwner],
      });
    } catch (error) {
      console.log(
        `❌ Failed to verify the InvestorDistribution smart contract on Etherscan: ${error}`
      );

      console.log(
        `📝 Try to verify it manually with: npx hardhat verify --network ${hre.network.name} ${InvestorDistribution.address} ${jellyToken} ${owner} ${pendingOwner}`
      );
    }
  }
);
