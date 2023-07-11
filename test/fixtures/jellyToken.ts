import { ethers } from "hardhat";

export async function deployJellyToken() {
  const cap = 1000000000;

  const [owner, otherAccount, vesting, vestingJelly, allocator] = await ethers.getSigners();

  const JellyTokenFactory = await ethers.getContractFactory("JellyToken");
  const jellyToken = await JellyTokenFactory.deploy(
    cap,
    vesting.address,
    vestingJelly.address,
    allocator.address
  );

  return {jellyToken, cap, owner, otherAccount, vesting, vestingJelly, allocator};
}
