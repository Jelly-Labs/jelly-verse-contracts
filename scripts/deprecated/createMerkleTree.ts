import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import fs from 'fs';

async function main() {
	type Beneficiary = {
		address: string;
		amount: string;
	};
	// (1)
	// const valuess = [
	// 	['0x1111111111111111111111111111111111111111', '5000000000000000000'],
	// 	['0x2222222222222222222222222222222222222222', '2500000000000000000'],
	// ];

	const inputs = JSON.parse(fs.readFileSync('input.json', 'utf8'));

	const values = inputs.beneficiaries.map((beneficiary: Beneficiary) => [
		beneficiary.address,
		beneficiary.amount,
	]);

	const tree = StandardMerkleTree.of(values, ['address', 'uint256']);

	console.log('Merkle Root:', tree.root);

	fs.writeFileSync('tree.json', JSON.stringify(tree.dump()));
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
