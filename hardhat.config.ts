import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-foundry';
import '@nomicfoundation/hardhat-network-helpers';

const config: HardhatUserConfig = {
	solidity: '0.8.19',
};

export default config;
