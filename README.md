# Jelly Verse contracts
## Getting Started
This project combines Hardhat and Foundry.

### Prerequisites
Be sure to have installed the following
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Current LTS Node.js version](https://nodejs.org/en/about/releases/)

### Build & Compile
1. Clone the repo
```shell
git clone git@github.com:MVPWorkshop/jelly-verse-contracts.git && cd jelly-verse-contracts
```
2. Install packages
```shell
npm install
```
3. Install [Foundry](https://book.getfoundry.sh/getting-started/installation)
```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```
4. Compile contracts
```shell
npx hardhat compile
```
[Optionally]
```shell
forge build
```
5. Run tests
```shell
npx hardhat test
```
6. Run invariant tests
```shell
forge test
```

