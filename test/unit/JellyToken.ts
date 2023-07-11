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
  const initialBalance = ethers.parseEther("133000000");
  const initialSupply = initialBalance * BigInt(3);
  let jellyToken: JellyToken;
  let cap: number;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;
  let vesting: SignerWithAddress;
  let vestingJelly: SignerWithAddress;
  let allocator: SignerWithAddress;

  beforeEach(async () => {
    ({
      jellyToken,
      cap,
      owner,
      otherAccount,
      vesting,
      vestingJelly,
      allocator
    } = await loadFixture(deployJellyToken));
  });

  describe("Deployment", () => {
    it("Sets the appropriate cap", async () => {
      const capInWei = ethers.parseEther(cap.toString());
      const supplyCap = await jellyToken.cap();
      expect(supplyCap).to.eq(capInWei);
    });

    it("Mints approporiate amount in total", async () => {
      const supply = await jellyToken.totalSupply();
      expect(supply).to.eq(initialSupply);
    });

    it("Mints appropriate amount to the vesting address", async () => {
      const balance = await jellyToken.balanceOf(vesting.address);
      expect(balance).to.eq(initialBalance);
    });

    it("Mints appropriate amount to the vestingJelly address", async () => {
      const balance = await jellyToken.balanceOf(vestingJelly.address);
      expect(balance).to.eq(initialBalance);
    });

    it("Mints appropriate amount to the allocator address", async () => {
      const balance = await jellyToken.balanceOf(allocator.address);
      expect(balance).to.eq(initialBalance);
    });
  });

  describe("Mint", () => {
    it("Mints tokens for an address when the sender has MINTER_ROLE", async () => {
      const balanceBeforeMint = await jellyToken.balanceOf(otherAccount.address);
      expect(balanceBeforeMint).to.eq(BigInt(0));

      await jellyToken.mint(otherAccount.address, 100);

      const balanceAfterMint = await jellyToken.balanceOf(otherAccount.address);
      expect(balanceAfterMint).to.eq(BigInt(100));
    });

    it("Reverts when the sender doesn't have MINTER_ROLE", async () => {
      await expect(
        jellyToken.connect(otherAccount).mint(otherAccount.address, 100)
      ).to.be.reverted;
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
