import { MockContract } from '@ethereum-waffle/mock-contract';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JellyToken, Vesting } from '../../typechain-types';

declare module 'mocha' {
	export interface Context {
		jellyToken: JellyToken;
		vesting: Vesting;
		signers: Signers;
		mocks: Mocks;
	}
}

export interface Signers {
	deployer: SignerWithAddress;
	ownerMultiSig: SignerWithAddress;
	pendingOwner: SignerWithAddress;
	beneficiary: SignerWithAddress;
	revoker: SignerWithAddress;
	alice: SignerWithAddress;
}

export interface Mocks {
	mockJelly: MockContract;
}
