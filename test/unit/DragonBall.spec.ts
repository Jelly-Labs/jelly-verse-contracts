import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer, constants } from "ethers";
import { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

describe("DragonBall", function () {
  async function deployUnitFixture() {
    const [deployer, user, ...otherSigners] = await ethers.getSigners();

    const DragonballFactory = await ethers.getContractFactory("DragonBall");
    const Dragonball = await DragonballFactory.deploy(
      deployer.address,
      constants.AddressZero
    );

    return { Dragonball, deployer, user, otherSigners };
  }

  let Dragonball: any;
  let owner: any;
  let pendingOwner: Signer;
  let otherSigners: any[];
  let erc20: any;

  beforeEach(async function () {
    const fixture = await loadFixture(deployUnitFixture);
    Dragonball = fixture.Dragonball;
    owner = fixture.deployer;
    pendingOwner = fixture.user;
    otherSigners = fixture.otherSigners;
  });

  describe("Mint", async function () {
    describe("success", async () => {
      it("should mint an nft", async () => {
        await expect(Dragonball.mint(constants.One, owner.address))
          .to.emit(Dragonball, "NewBall")
          .withArgs(0, 1, owner.address);

        expect(await Dragonball.getBallNumber(0)).eq(constants.One);
        expect(await Dragonball.ownerOf(constants.Zero)).eq(owner.address);
      });
    });

    describe("failure", async () => {
      it("should not allow other users to create a drop", async () => {
        await expect(
          Dragonball.connect(otherSigners[0]).mint(constants.One, owner.address)
        ).to.be.revertedWithCustomError(
          Dragonball,
          "Ownable__CallerIsNotOwner"
        );
      });
    });
  });

  describe("Burn", async function () {
    beforeEach(async function () {
      await Dragonball.mint(constants.One, owner.address);
      await Dragonball.setLotteryContract(owner.address);
    });
    describe("success", async () => {
      it("should burn an nft", async () => {
        expect(await Dragonball.ownerOf(constants.Zero)).eq(owner.address);
        await expect(Dragonball.burn(0))
          .to.emit(Dragonball, "BallBurned")
          .withArgs(0);

        expect(await Dragonball.balanceOf(owner.address)).eq(constants.Zero);
      });
    });

    describe("failure", async () => {
      it("should not allow other addresses to burn", async () => {
        await expect(
          Dragonball.connect(otherSigners[0]).burn(constants.Zero)
        ).to.be.revertedWithCustomError(
          Dragonball,
          "DragonBall_NotAllowed"
        );
      });
    });
  });

  describe("Set Lottery Contract", async function () {
    describe("success", async () => {
      it("should set contract", async () => {
        await expect(Dragonball.setLotteryContract(owner.address))
          .to.emit(Dragonball, "LotteryContractSet")
          .withArgs(owner.address);

        expect(await Dragonball.lotteryContract()).eq(owner.address);
      });
    });

    describe("failure", async () => {
      it("should not allow other users to set contract", async () => {
        await expect(
          Dragonball.connect(otherSigners[0]).setLotteryContract(owner.address)
        ).to.be.revertedWithCustomError(
          Dragonball,
          "Ownable__CallerIsNotOwner"
        );
      });
    });
  });
});
