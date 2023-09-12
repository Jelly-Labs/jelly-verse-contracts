import { assert, expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployJellyTokenFixture } from '../fixtures/unit_jellyToken';

export function shouldBehaveLikeJellyToken(): void {
	describe('JellyToken', () => {
		const MINTER_ROLE = ethers.utils.keccak256(
			ethers.utils.toUtf8Bytes('MINTER_ROLE')
		);

		const cap = ethers.utils.parseEther('1000000000');

		beforeEach(async function () {
			const { jellyToken } = await loadFixture(deployJellyTokenFixture);

			this.jellyToken = jellyToken;
		});

		describe(`Deployment`, async function () {
			it(`should set token name to Jelly Token`, async function () {
				assert(
					(await this.jellyToken.name()) === 'Jelly Token',
					'Token name is not Jelly Token'
				);
			});

			it(`should set token ticker to JLY`, async function () {
				assert(
					(await this.jellyToken.symbol()) === 'JLY',
					'Token ticker is not JLY'
				);
			});

			it(`should set the cap to 1_000_000_000 tokens`, async function () {
				assert(
					(await this.jellyToken.cap()).eq(cap),
					'Token cap is not 1_000_000_000'
				);
			});

			it(`should set the number of decimals to 18`, async function () {
				assert(
					(await this.jellyToken.decimals()) === 18,
					'Token decimals are not 18'
				);
			});

			it(`should set the default admin role`, async function () {
				assert(
					await this.jellyToken.hasRole(
						this.jellyToken.DEFAULT_ADMIN_ROLE(),
						this.signers.ownerMultiSig.address
					),
					'Default admin role is not the multisig address'
				);
			});

			it(`should grant the minter role to the default admin role address`, async function () {
				assert(
					await this.jellyToken.hasRole(
						MINTER_ROLE,
						this.signers.ownerMultiSig.address
					),
					'Minter role is not the multisig address'
				);
			});
		});

		describe(`#premint`, async function () {
			describe(`on success`, async function () {
				beforeEach(async function () {
					if (
						this.currentTest &&
						this.currentTest.title === `should emit a Preminted event`
					) {
						return;
					}

					await this.jellyToken
						.connect(this.signers.ownerMultiSig)
						.premint(
							this.mocks.mockVestingTeam.address,
							this.mocks.mockVestingInvestor.address,
							this.mocks.mockAllocator.address,
							this.mocks.mockMinterContract.address
						);
				});

				it(`should have the totalSupply of 399_000_000 tokens`, async function () {
					assert(
						(await this.jellyToken.totalSupply()).eq(
							ethers.utils.parseEther('399000000')
						),
						'Total supply is not 399_000_000'
					);
				});

				it(`should mint 133_000_000 tokens to the VestingTeam contract`, async function () {
					assert(
						(
							await this.jellyToken.balanceOf(
								this.mocks.mockVestingTeam.address
							)
						).eq(ethers.utils.parseEther('133000000')),
						'VestingTeam contract balance is not 133_000_000'
					);
				});

				it(`should mint 133_000_000 tokens to the VestingInvestor contract`, async function () {
					assert(
						(
							await this.jellyToken.balanceOf(
								this.mocks.mockVestingInvestor.address
							)
						).eq(ethers.utils.parseEther('133000000')),
						'VestingInvestor contract balance is not 133_000_000'
					);
				});

				it(`should mint 133_000_000 tokens to the Allocator contract`, async function () {
					assert(
						(
							await this.jellyToken.balanceOf(this.mocks.mockAllocator.address)
						).eq(ethers.utils.parseEther('133000000')),
						'Allocator contract balance is not 133_000_000'
					);
				});

				it(`should grant the minter role to the Allocator smart contract`, async function () {
					assert(
						await this.jellyToken.hasRole(
							MINTER_ROLE,
							this.mocks.mockAllocator.address
						),
						'Minter role is not the Allocator contract address'
					);
				});

				it(`should grant the minter role to the Minter smart contract`, async function () {
					assert(
						await this.jellyToken.hasRole(
							MINTER_ROLE,
							this.mocks.mockMinterContract.address
						),
						'Minter role is not the Minter contract address'
					);
				});

				it(`should emit a Preminted event`, async function () {
					await expect(
						this.jellyToken
							.connect(this.signers.ownerMultiSig)
							.premint(
								this.mocks.mockVestingTeam.address,
								this.mocks.mockVestingInvestor.address,
								this.mocks.mockAllocator.address,
								this.mocks.mockMinterContract.address
							)
					)
						.to.emit(this.jellyToken, 'Preminted')
						.withArgs(
							this.mocks.mockVestingTeam.address,
							this.mocks.mockVestingInvestor.address,
							this.mocks.mockAllocator.address
						);
				});
			});

			describe(`on failure`, async function () {
				it(`should revert if the caller is not the owner`, async function () {
					await expect(
						this.jellyToken
							.connect(this.signers.alice)
							.premint(
								this.mocks.mockVestingTeam.address,
								this.mocks.mockVestingInvestor.address,
								this.mocks.mockAllocator.address,
								this.mocks.mockMinterContract.address
							)
					).to.be.revertedWith(
						`AccessControl: account ${this.signers.alice.address.toLowerCase()} is missing role ${MINTER_ROLE}`
					);
				});

				it(`should revert if called more than once`, async function () {
					await this.jellyToken
						.connect(this.signers.ownerMultiSig)
						.premint(
							this.mocks.mockVestingTeam.address,
							this.mocks.mockVestingInvestor.address,
							this.mocks.mockAllocator.address,
							this.mocks.mockMinterContract.address
						);

					await expect(
						this.jellyToken
							.connect(this.signers.ownerMultiSig)
							.premint(
								this.mocks.mockVestingTeam.address,
								this.mocks.mockVestingInvestor.address,
								this.mocks.mockAllocator.address,
								this.mocks.mockMinterContract.address
							)
					).to.be.revertedWithCustomError(
						this.jellyToken,
						'JellyToken__AlreadyPreminted'
					);
				});
			});
		});

		describe(`#mint`, async function () {
			const amountToMint = ethers.utils.parseEther('100');
			describe(`on success`, async function () {
				it(`should mint new tokens`, async function () {
					await this.jellyToken
						.connect(this.signers.ownerMultiSig)
						.mint(this.signers.alice.address, amountToMint);

					assert(
						(await this.jellyToken.balanceOf(this.signers.alice.address)).eq(
							amountToMint
						),
						'Balance is not correct'
					);
				});

				it(`should increase the total supply`, async function () {
					const totalSupplyBefore = await this.jellyToken.totalSupply();

					await this.jellyToken
						.connect(this.signers.ownerMultiSig)
						.mint(this.signers.alice.address, amountToMint);

					assert(
						(await this.jellyToken.totalSupply()).eq(
							totalSupplyBefore.add(amountToMint)
						),
						'Total supply is not correct'
					);
				});
			});

			describe(`on failure`, async function () {
				it(`should revert if the caller does not have the minter role`, async function () {
					await expect(
						this.jellyToken
							.connect(this.signers.alice)
							.mint(this.signers.alice.address, amountToMint)
					).to.be.revertedWith(
						`AccessControl: account ${this.signers.alice.address.toLocaleLowerCase()} is missing role ${MINTER_ROLE}`
					);
				});
			});
		});
	});
}
