import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { unitVestingFixture } from '../fixtures/unit__Vesting';
import { expect, assert } from 'chai';
import { BigNumber, constants } from 'ethers';
import { calculateVestedAmountJs } from '../shared/helpers';

export function shouldBehaveLikeVesting(): void {
	describe(`Vesting`, () => {
		const ONE_DAY = 86400;
		const ONE_MONTH = 2629743;

		let _cliffDuration: number;
		let _startTimestamp: BigNumber;
		let _cliffTimestamp: BigNumber;
		let _totalDuration: number;
		let _amount: BigNumber;

		beforeEach(async function () {
			const {
				vesting,
				mockJelly,
				cliffDuration,
				startTimestamp,
				vestingDuration,
				amount,
			} = await loadFixture(unitVestingFixture);

			this.vesting = vesting;
			this.mocks.mockJelly = mockJelly;
			_cliffDuration = cliffDuration;
			_startTimestamp = startTimestamp;
			_amount = amount;

			_cliffTimestamp = _startTimestamp.add(_cliffDuration);
			_totalDuration = _cliffDuration + vestingDuration;

			await time.increaseTo(startTimestamp);
		});

		describe(`Deployment`, async function () {});

		describe(`#release`, async function () {
			describe(`on success`, async function () {
				beforeEach(async function () {
					await time.increase(_cliffDuration);
				});

				it(`should release if called by revoker`, async function () {
					// TODO: integracioni test treba da proveri da su tokeni poslati beneficiary-ju
					await expect(this.vesting.connect(this.signers.revoker).release()).to
						.not.be.reverted;
				});

				it(`should release if called by owner`, async function () {
					// ovaj napisi kad merge-ujes Ownable
				});

				it(`should update the released amount`, async function () {
					await this.vesting.connect(this.signers.revoker).release();
					const releasableAmount = await this.vesting.releasableAmount();
					assert(releasableAmount.eq(constants.Zero));
				});

				it(`should emit the Release event`, async function () {
					await expect(
						this.vesting.connect(this.signers.revoker).release()
					).to.emit(this.vesting, `Release`);
				});
			});

			describe(`on failure`, async function () {
				it(`should revert if the caller is not revoker or owner`, async function () {
					await expect(this.vesting.connect(this.signers.alice).release())
						.to.be.revertedWithCustomError(
							this.vesting,
							`Vesting__OnlyRevokerOrOwnerCanCall`
						)
						.withArgs(this.signers.alice.address);
				});

				it(`should revert if there is nothing to release`, async function () {
					await expect(
						this.vesting.connect(this.signers.revoker).release()
					).to.be.revertedWithCustomError(
						this.vesting,
						`Vesting__NothingToRelease`
					);
				});
			});
		});

		describe(`#vestedAmount`, async function () {
			context(
				`should calculate the vested amount in different moments of time. The cliff duration is 6 months. The vesting duration is 18 months, resulting in 2 years in total`,
				async function () {
					let compareVestedAmountCalculations: () => Promise<BigNumber>;
					let numberOfMonths: number;

					before(async function () {
						numberOfMonths = (_totalDuration - _cliffDuration) / ONE_MONTH;

						compareVestedAmountCalculations = async () => {
							const blockTimestamp = await time.latest();

							const vestedAmountSol = await this.vesting.vestedAmount();
							const vestedAmountJs = calculateVestedAmountJs(
								BigNumber.from(blockTimestamp),
								_cliffTimestamp,
								_startTimestamp,
								BigNumber.from(_totalDuration),
								_amount
							);

							assert(
								vestedAmountSol.eq(vestedAmountJs),
								`vestedAmountSol: ${vestedAmountSol} != vestedAmountJs: ${vestedAmountJs}`
							);

							return vestedAmountSol;
						};
					});

					it(`At start timestamp`, async function () {
						await compareVestedAmountCalculations();
					});

					it(`Slightly before cliff timestamp`, async function () {
						const beforeCliffTimestamp = _cliffDuration - ONE_DAY;
						await time.increase(beforeCliffTimestamp);

						await compareVestedAmountCalculations();

						const vestedAmount = await this.vesting.vestedAmount();
						assert(
							vestedAmount.eq(constants.Zero),
							`vestedAmount: ${vestedAmount} != 0`
						);
					});

					it(`At cliff timestamp`, async function () {
						await time.increase(_cliffDuration);

						await compareVestedAmountCalculations();
						const vestedAmount = await this.vesting.vestedAmount();
						assert(
							vestedAmount.gt(constants.Zero),
							`vestedAmount: ${vestedAmount} == 0`
						);
					});

					let previousVestedAmount = constants.Zero;

					for (let i = 1; i <= 18; i++) {
						it(`Month ${i} after cliff timestamp`, async () => {
							await time.increase(_cliffDuration + i * ONE_MONTH);
							const currentVestedAmount =
								await compareVestedAmountCalculations();
							assert(
								currentVestedAmount.gte(previousVestedAmount),
								`currentVestedAmount: ${currentVestedAmount} < previousVestedAmount: ${previousVestedAmount}`
							);
							previousVestedAmount = currentVestedAmount;
						});
					}

					it(`Slightly before the end of vesting duration`, async function () {
						const beforeEndOfVestingDuration = _totalDuration - ONE_DAY;

						await time.increase(beforeEndOfVestingDuration);

						await compareVestedAmountCalculations();

						const vestedAmount = await this.vesting.vestedAmount();
						assert(
							vestedAmount.lt(_amount),
							`vestedAmount: ${vestedAmount} == ${_amount}`
						);
					});

					it(`At the end of vesting duration`, async function () {
						await time.increase(_totalDuration);

						await compareVestedAmountCalculations();

						const vestedAmount = await this.vesting.vestedAmount();
						assert(
							vestedAmount.eq(_amount),
							`vestedAmount: ${vestedAmount} != ${_amount}`
						);
					});

					it(`Slightly after the end of vesting duration`, async function () {
						const afterEndOfVestingDuration = _totalDuration + ONE_DAY;
						await time.increase(afterEndOfVestingDuration);

						await compareVestedAmountCalculations();

						const vestedAmount = await this.vesting.vestedAmount();
						assert(
							vestedAmount.eq(_amount),
							`vestedAmount: ${vestedAmount} != ${_amount}`
						);
					});

					// it(`01 January 2024`, async function () {
					// 	console.log(await time.latest());
					// 	compareVestedAmountCalculations();
					// });

					// it(`01 June 2024: 1717200000`, async function () {
					// 	console.log(await time.latest());
					// 	const testTimestamp = 1717200000;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`25 June 2024: 1719273600`, async function () {
					// 	console.log(await time.latest());
					// 	const testTimestamp = 1719273600;
					// 	await time.increaseTo(testTimestamp);

					// 	await compareVestedAmountCalculations();
					// });

					// it(`07 July 2024: 1720310400`, async function () {
					// 	const testTimestamp = 1720310400;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`08 August 2024: 1723075200`, async function () {
					// 	const testTimestamp = 1723075200;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`08 September 2024: 1725753600`, async function () {
					// 	const testTimestamp = 1725753600;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`09 October 2024: 1728432000`, async function () {
					// 	const testTimestamp = 1728432000;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`09 November 2024: 1731110400`, async function () {
					// 	const testTimestamp = 1731110400;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`10 December 2024: 1733788800`, async function () {
					// 	const testTimestamp = 1733788800;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`10 January 2025: 1736467200`, async function () {
					// 	const testTimestamp = 1736467200;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`10 February 2025: 1739145600`, async function () {
					// 	const testTimestamp = 1739145600;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`12 March 2025: 1741737600`, async function () {
					// 	const testTimestamp = 1741737600;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`12 April 2025: 1744416000`, async function () {
					// 	const testTimestamp = 1744416000;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`13 May 2025: 1747094400`, async function () {
					// 	const testTimestamp = 1747094400;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`13 June 2025: 1749772800`, async function () {
					// 	const testTimestamp = 1749772800;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });

					// it(`14 July 2025: 1752451200`, async function () {
					// 	const testTimestamp = 1752451200;
					// 	await time.increaseTo(testTimestamp);

					// 	compareVestedAmountCalculations();
					// });
				}
			);
		});
	});
}
