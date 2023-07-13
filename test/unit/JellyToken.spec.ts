import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { JellyToken } from "../../typechain-types";
import { deployJellyToken } from "../fixtures/jellyToken";

describe("JellyToken", () => {
  const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

  const initialBalance = ethers.parseEther("133000000");
  const initialSupply = initialBalance * BigInt(3);
  let jellyToken: JellyToken;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;
  let vestingAddress: string;
  let vestingJellyAddress: string;
  let allocatorAddress: string;

  beforeEach(async () => {
    ({
      jellyToken,
      owner,
      otherAccount,
      vestingAddress,
      vestingJellyAddress,
      allocatorAddress
    } = await loadFixture(deployJellyToken));
  });

  describe("Deployment", () => {
    it("Mints approporiate amount in total", async () => {
      const supply = await jellyToken.totalSupply();
      expect(supply).to.eq(initialSupply);
    });

    it("Mints appropriate amount to the vesting address", async () => {
      const balance = await jellyToken.balanceOf(vestingAddress);
      expect(balance).to.eq(initialBalance);
    });

    it("Mints appropriate amount to the vestingJelly address", async () => {
      const balance = await jellyToken.balanceOf(vestingJellyAddress);
      expect(balance).to.eq(initialBalance);
    });

    it("Mints appropriate amount to the allocator address", async () => {
      const balance = await jellyToken.balanceOf(allocatorAddress);
      expect(balance).to.eq(initialBalance);
    });
  });

  describe("Mint", () => {
    it("Mints tokens for an address when the sender has MINTER_ROLE", async () => {
      const balanceBeforeMint = await jellyToken.balanceOf(otherAccount.address);
      expect(balanceBeforeMint).to.eq(BigInt(0));

      await jellyToken.connect(owner).mint(otherAccount.address, 100);

      const balanceAfterMint = await jellyToken.balanceOf(otherAccount.address);
      expect(balanceAfterMint).to.eq(BigInt(100));
    });

    it("Reverts when the sender doesn't have MINTER_ROLE", async () => {
      const address = otherAccount.address.toLowerCase();
      await expect(
        jellyToken.connect(otherAccount).mint(otherAccount.address, 100)
      ).to.be.revertedWith(
        `AccessControl: account ${address} is missing role ${MINTER_ROLE}`
      );
    });
  });

  describe("Burn", () => {
    beforeEach(async () => {
      await jellyToken.mint(otherAccount.address, 100);
    });

    it("Allows users to burn their tokens", async () => {
      const balanceBeforeBurn = await jellyToken.balanceOf(otherAccount.address);
      expect(balanceBeforeBurn).to.eq(BigInt(100));

      await jellyToken.connect(otherAccount).burn(100);

      const balanceAfterBurn = await jellyToken.balanceOf(otherAccount.address);
      expect(balanceAfterBurn).to.eq(BigInt(0));
    });

    it("Decreases total supply", async () => {
      const supplyBeforeBurn = await jellyToken.totalSupply();
      expect(supplyBeforeBurn).to.eq(initialSupply + BigInt(100));

      await jellyToken.connect(otherAccount).burn(100);

      const supplyAfterBurn = await jellyToken.totalSupply();
      expect(supplyAfterBurn).to.eq(initialSupply);
    });
  });
});
