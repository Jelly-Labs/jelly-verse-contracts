import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { Mocks, Signers } from '../shared/types';
import { shouldBehaveLikeVesting } from './Vesting.spec';
import { getSigners } from '../shared/utils';

context(`Unit tests`, async function () {
	before(async function () {
		this.signers = {} as Signers;

		const {
			deployer,
			ownerMultiSig,
			pendingOwner,
			beneficiary,
			revoker,
			alice,
		} = await loadFixture(getSigners);

		this.signers.deployer = deployer;
		this.signers.ownerMultiSig = ownerMultiSig;
		this.signers.pendingOwner = pendingOwner;
		this.signers.beneficiary = beneficiary;
		this.signers.revoker = revoker;
		this.signers.alice = alice;

		this.mocks = {} as Mocks;
	});

	shouldBehaveLikeVesting();
});
