import { ethers } from "hardhat";
import { JellyToken, JellyToken__factory } from "../../typechain-types";

export async function deployJellyToken() {
  const [owner, otherAccount, vesting, vestingJelly, allocator] = await ethers.getSigners();

  const JellyTokenFactory: JellyToken__factory = await ethers.getContractFactory("JellyToken");
  const jellyToken: JellyToken = await JellyTokenFactory.deploy(
    vesting.address,
    vestingJelly.address,
    allocator.address
  );

  return {
    jellyToken,
    owner,
    otherAccount,
    vestingAddress: vesting.address,
    vestingJellyAddress: vestingJelly.address,
    allocatorAddress: allocator.address
  };
}
