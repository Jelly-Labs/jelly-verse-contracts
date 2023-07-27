import { BigNumber, constants } from 'ethers';

export function calculateVestedAmountJs(
	blockTimestamp: BigNumber,
	cliffTimestamp: BigNumber,
	startTimestamp: BigNumber,
	totalDuration: BigNumber,
	amount: BigNumber
): BigNumber {
	if (blockTimestamp < cliffTimestamp) {
		return constants.Zero;
	} else if (blockTimestamp >= startTimestamp.add(totalDuration)) {
		return amount;
	} else {
		return amount.mul(blockTimestamp.sub(startTimestamp)).div(totalDuration);
	}
}
