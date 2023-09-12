import * as dotenv from 'dotenv';

import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-foundry';
import '@nomicfoundation/hardhat-network-helpers';
// import './tasks';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHEREUM_SEPOLIA_RPC_URL = process.env.ETHEREUM_SEPOLIA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
	solidity: '0.8.19',
	networks: {
		hardhat: {
			chainId: 31337,
		},
		sepolia: {
			url:
				ETHEREUM_SEPOLIA_RPC_URL !== undefined ? ETHEREUM_SEPOLIA_RPC_URL : '',
			accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
			chainId: 11155111,
		},
	},
	etherscan: {
		// npx hardhat verify --network rinkeby {contractAddress} [{constructor arguments}]
		apiKey: {
			sepolia: ETHERSCAN_API_KEY !== undefined ? ETHERSCAN_API_KEY : '',
		},
	},
};

export default config;
