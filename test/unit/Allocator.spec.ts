import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { JellyToken, Allocator, ERC20Token } from "../../typechain-types";
import { deployAllocator } from "../fixtures/allocator";

describe("Allocator", () => {
  let allocator: Allocator;
  let jellyToken: JellyToken;
  let dusdToken: ERC20Token;

  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  let dusdJellyRatio: number;

  beforeEach(async () => {
    ({
      allocator,
      jellyToken,
      dusdToken,
      dusdJellyRatio,
      owner,
      otherAccount
    } = await loadFixture(deployAllocator));
  });

  describe("Deployment", () => {
    it("Sets the correct dusd address", async () => {
      const address = await allocator.dusd();
      expect(address).to.eq(dusdToken.target);
    });

    it("Sets the correct dusd to jelly ratio", async () => {
      const ratio = await allocator.dusdJellyRatio();
      expect(ratio).to.eq(dusdJellyRatio);
    });
  });

  describe("setJellyToken", () => {
    it("Sets the jelly token address when called by the owner", async () => {
      await allocator.connect(owner).setJellyToken(jellyToken.target);
      const address = await allocator.jellyToken();
      expect(address).to.eq(jellyToken.target);
    });

    it("Reverts when called by the non owner", async () => {
      await expect(
        allocator.connect(otherAccount).setJellyToken(jellyToken.target)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    });
  });

  describe("buyWithDusd", () => {
    const depositValue = 500;

    describe("Jelly token is set", () => {
      beforeEach(async () => {
        await allocator.connect(owner).setJellyToken(jellyToken.target);
        await dusdToken.connect(otherAccount).mint(depositValue);
        await dusdToken.connect(otherAccount).approve(allocator.target, depositValue);
      });

      it("Transfers dusd from sender to contract address", async () => {
        await allocator.connect(otherAccount).buyWithDusd(depositValue);
        const balance = await dusdToken.balanceOf(allocator.target);
        expect(balance).to.eq(depositValue);
      });

      it("Transfers jellyTokens to the sender", async () => {
        await allocator.connect(otherAccount).buyWithDusd(depositValue);
        const balance = await jellyToken.balanceOf(otherAccount.address);
        expect(balance).to.eq(depositValue * dusdJellyRatio);
      });
    });

    it("Reverts when jellyToken is not set", async () => {
      await expect(
        allocator.connect(otherAccount).buyWithDusd(depositValue)
      ).to.be.revertedWith("JellyToken not set");
    });
  });
});
