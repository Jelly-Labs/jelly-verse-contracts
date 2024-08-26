import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer, constants } from "ethers";
import { ethers } from "hardhat";

describe.only("Lottery", function () {
  async function deployUnitFixture() {
    const [deployer, user, ...otherSigners] = await ethers.getSigners();

    const DragonballFactory = await ethers.getContractFactory("DragonBall");
    const Dragonball = await DragonballFactory.deploy(
      deployer.address,
      constants.AddressZero
    );

    const ERC20Factory = await ethers.getContractFactory("JellyToken");
    const erc20 = await ERC20Factory.deploy(deployer.address);
  

    const ChestFactory = await ethers.getContractFactory("Chest");
    const Chest = await ChestFactory.deploy(
      erc20.address,
      0,
      deployer.address,
      constants.AddressZero
    );

    const LotteryFactory = await ethers.getContractFactory("Lottery");
    const Lottery = await LotteryFactory.deploy(
      deployer.address,
      constants.AddressZero,
      Dragonball.address,
      Chest.address,
      erc20.address
    );

    await Dragonball.setLotteryContract(Lottery.address);
   
  

    return { Dragonball, deployer, user, otherSigners,erc20, Chest, Lottery };
  }

  let Dragonball: any;
  let owner: any;
  let pendingOwner: Signer;
  let otherSigners: any[];
  let erc20: any;
  let Chest: any;
  let Lottery: any;

  beforeEach(async function () {
    const fixture = await loadFixture(deployUnitFixture);
    Dragonball = fixture.Dragonball;
    owner = fixture.deployer;
    pendingOwner = fixture.user;
    otherSigners = fixture.otherSigners;
    erc20 = fixture.erc20;
    Chest = fixture.Chest;
    Lottery = fixture.Lottery;
  });

  describe("Burn Balls", async function () {
    beforeEach(async function () {
      erc20.mint(Lottery.address, ethers.utils.parseEther("4200000"));
    });
    describe("success", async () => {
      it("should claim a reward", async () => {
        for (let i = 1; i < 8; i++) {
          await Dragonball.mint(i, owner.address);
        }
        await expect(Lottery.burnBalls([ 0, 1, 2, 3, 4, 5, 6]))
          .to.emit(Lottery, "PrizeAwarded");

        expect(await Dragonball.balanceOf(owner.address)).eq(0);
      });

      it("should claim a reward with joker", async () => {
        for (let i = 1; i < 7; i++) {
          await Dragonball.mint(i, owner.address);
        }

        await Dragonball.mint(0, owner.address);  
        await expect(Lottery.burnBalls([ 0, 1, 2, 3, 4, 5, 6]))
          .to.emit(Lottery, "PrizeAwarded");

        expect(await Dragonball.balanceOf(owner.address)).eq(0);
      });

    /*  it("should claim all rewards", async () => {
        const numberOfRewards = await Lottery.numberOfRewards();
        for (let j = 0; j < numberOfRewards; j++) {
          
        for (let i = 1; i < 8; i++) {
          await Dragonball.mint(i, owner.address);
        }
        await expect(Lottery.burnBalls([ j*7,j*7+1, j*7+2, j*7+3, j*7+4, j*7+5, j*7+6]))
          .to.emit(Lottery, "PrizeAwarded");
      }
        expect(await Dragonball.balanceOf(owner.address)).eq(0);
        expect(await erc20.balanceOf(owner.address)).eq(ethers.utils.parseEther("200000"));
        expect(await erc20.balanceOf(Lottery.address)).eq(ethers.utils.parseEther("0"));
        expect(await erc20.balanceOf(Chest.address)).eq(ethers.utils.parseEther("4000000"));
      });*/
    });



    describe("failure", async () => {
      it("should not allow otheer users to burn", async () => {
        for (let i = 1; i < 8; i++) {
          await Dragonball.mint(i, owner.address);
        }
        await expect(Lottery.connect(otherSigners[0]).burnBalls([ 1, 2, 3, 4, 5, 6, 7]))
        .to.be.revertedWithCustomError(
          Lottery,
          "Lottery__NotOwner"
        );
      });

      it("should not allow len missmatch", async () => {
        for (let i = 1; i < 8; i++) {
          await Dragonball.mint(i, owner.address);
        }
        await expect(Lottery.burnBalls([ 0, 1, 2, 3, 4, 5]))
        .to.be.revertedWithCustomError(
          Lottery,
          "Lottery__LenMissmatch"
        );
      });

      it("should not allow to burn with wrong ball numbers", async () => {
        for (let i = 1; i < 7; i++) {
          await Dragonball.mint(i, owner.address);
        }
        await Dragonball.mint(1, owner.address);
        await expect(Lottery.burnBalls([ 0, 1, 2, 3, 4, 5, 6]))
        .to.be.revertedWithCustomError(
          Lottery,
          "Lottery__WrongIDs"
        );
      });

      it("should not allow to burn with two jokers", async () => {
        for (let i = 1; i < 6; i++) {
          await Dragonball.mint(i, owner.address);
        }
        await Dragonball.mint(0, owner.address);
        await Dragonball.mint(0, owner.address);
        await expect(Lottery.burnBalls([ 0, 1, 2, 3, 4, 5, 6]))
        .to.be.revertedWithCustomError(
          Lottery,
          "Lottery__WrongIDs"
        );
      });
      
    });
  });

  describe("Add chests", async function () {
    describe("success", async () => {
      it("should add chests", async () => {

        const numberOfRewards = await Lottery.numberOfRewards();
        const numberOfDragonChests = await Lottery.numberOfDragonChests();
        const numberOfGoldenChests = await Lottery.numberOfGoldenChests();
        const numberOfSilverChests = await Lottery.numberOfSilverChests();
        const numberOfBronzeChests = await Lottery.numberOfBronzeChests();
        const numberOfJellyBits = await Lottery.numberOfJellyBits();
        await expect(Lottery.addChests(1,1,1,1,1))
          .to.emit(Lottery, "ChestsAdded")
          .withArgs(1,1,1,1,1);

        expect(await Lottery.numberOfRewards()).eq(+numberOfRewards+5);
        expect(await Lottery.numberOfDragonChests()).eq(+numberOfDragonChests+1);
        expect(await Lottery.numberOfGoldenChests()).eq(+numberOfGoldenChests+1);
        expect(await Lottery.numberOfSilverChests()).eq(+numberOfSilverChests+1);
        expect(await Lottery.numberOfBronzeChests()).eq(+numberOfBronzeChests+1);
        expect(await Lottery.numberOfJellyBits()).eq(+numberOfJellyBits+1);
});
    });

    describe("failure", async () => {
      it("should not allow other users to add chests", async () => {
        await expect(
          Lottery.connect(otherSigners[0]).addChests(1,1,1,1,1)
        ).to.be.revertedWithCustomError(
          Lottery,
          "Ownable__CallerIsNotOwner"
        );
      });
    });
  });

});
