import { ethers } from 'hardhat';
import { Signers } from './types';

export async function getSigners(): Promise<Signers> {
	const [deployer, ownerMultiSig, pendingOwner, beneficiary, revoker, alice] =
		await ethers.getSigners();

	return {
		deployer,
		ownerMultiSig,
		pendingOwner,
		beneficiary,
		revoker,
		alice,
	};
}
