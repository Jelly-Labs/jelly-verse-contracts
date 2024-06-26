import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer, constants } from "ethers";
import { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";


describe("StakingRewardDistribution", function () {
  async function deployUnitFixture() {
    const [deployer, user, ...otherSigners] = await ethers.getSigners();

    const ERC20Factory = await ethers.getContractFactory("JellyToken");
    const erc20 = await ERC20Factory.deploy(deployer.address);
    erc20.mint(deployer.address, "100000");
    const StakingRewardDistributionFactory = await ethers.getContractFactory(
      "StakingRewardDistribution"
    );
    const StakingRewardDistribution =
      await StakingRewardDistributionFactory.deploy(
        erc20.address,
        deployer.address,
        constants.AddressZero
      );

    await erc20.approve(StakingRewardDistribution.address, "100000");
    const mockToken = await ERC20Factory.deploy(deployer.address);
    mockToken.mint(deployer.address, "100000");
    await mockToken.approve(StakingRewardDistribution.address, "100000");

    return {
      StakingRewardDistribution,
      deployer,
      user,
      otherSigners,
      erc20,
      mockToken,
    };
  }

  let StakingRewardDistribution: any;
  let owner: any;
  let pendingOwner: Signer;
  let otherSigners: any[];
  let erc20: any;
  let mockToken: any;

  beforeEach(async function () {
    const fixture = await loadFixture(deployUnitFixture);
    StakingRewardDistribution = fixture.StakingRewardDistribution;
    owner = fixture.deployer;
    pendingOwner = fixture.user;
    otherSigners = fixture.otherSigners;
    erc20 = fixture.erc20;
    mockToken = fixture.mockToken;
  });

  describe("Create Epoch", async function () {
    describe("success", async () => {
      it("should create an epoch", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        await expect(StakingRewardDistribution.createEpoch(tree.root, ""))
          .to.emit(StakingRewardDistribution, "EpochAdded")
          .withArgs(constants.Zero, tree.root, "");
        expect(await StakingRewardDistribution.epoch()).eq(constants.One);
        expect(await StakingRewardDistribution.merkleRoots(constants.Zero)).eq(
          tree.root
        );
      });
    });

    describe("failure", async () => {
      it("should not allow other users to create epoch", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        await expect(
          StakingRewardDistribution.connect(otherSigners[0]).createEpoch(
            tree.root,
            ""
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Ownable__CallerIsNotOwner"
        );
      });
    });
  });

  describe("Claim week", async function () {
    beforeEach(async function () {
      await StakingRewardDistribution.deposit(erc20.address, "100000");

      const values = [[owner.address, ethers.utils.parseEther("1")]];
      const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
      await StakingRewardDistribution.createEpoch(tree.root, "");
    });

    describe("success", async () => {
      it("should claim half the amount", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        await expect(
          StakingRewardDistribution.claimWeek(
            constants.Zero,
            [erc20.address],
            ethers.utils.parseEther("1"),
            proof,
            false
          )
        )
          .to.emit(StakingRewardDistribution, "Claimed")
          .withArgs(owner.address, "100000", erc20.address, constants.Zero);

        expect(await erc20.balanceOf(owner.address)).eq("50000");
        expect(
          await StakingRewardDistribution.claimed(
            constants.Zero,
            erc20.address,
            owner.address
          )
        ).eq(true);
      });

      it("should claim the amount", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await StakingRewardDistribution.deposit(mockToken.address, "100000");

  
        await StakingRewardDistribution.createEpoch(tree.root, "");

        await expect(
          StakingRewardDistribution.claimWeek(
            constants.One,
            [mockToken.address],
            ethers.utils.parseEther("1"),
            proof,
            false
          )
        )
          .to.emit(StakingRewardDistribution, "Claimed")
          .withArgs(owner.address, "100000", mockToken.address, constants.One);

        expect(
          await StakingRewardDistribution.claimed(
            constants.One,
            mockToken.address,
            owner.address
          )
        ).eq(true);
      });
    });

    describe("failure", async () => {
      it("should not allow to claim with wrong amount", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await expect(
          StakingRewardDistribution.claimWeek(
            constants.Zero,
            [erc20.address],
            ethers.utils.parseEther("2"),
            proof,
            false
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Claim_WrongProof"
        );
      });

      it("should not allow to claim with wrong address", async () => {
        const values = [
          [otherSigners[0].address, ethers.utils.parseEther("1")],
        ];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await expect(
          StakingRewardDistribution.connect(otherSigners[0]).claimWeek(
            constants.Zero,
            [erc20.address],
            ethers.utils.parseEther("1"),
            proof,
            false
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Claim_WrongProof"
        );
      });

      it("should not allow to claim zero amount", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await expect(
          StakingRewardDistribution.claimWeek(
            constants.Zero,
            [erc20.address],
            ethers.utils.parseEther("0"),
            proof,
            false
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Claim_ZeroAmount"
        );
      });

      it("should not allow to claim twice", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        await StakingRewardDistribution.claimWeek(
          constants.Zero,
          [erc20.address],
          ethers.utils.parseEther("1"),
          proof,
          false
        );

        await expect(
          StakingRewardDistribution.claimWeek(
            constants.Zero,
            [erc20.address],
            ethers.utils.parseEther("1"),
            proof,
            false
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Claim_AlreadyClaimed"
        );
      });

      it("should not allow to claim future epoch", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        await expect(
          StakingRewardDistribution.claimWeek(
            constants.One,
            [erc20.address],
            ethers.utils.parseEther("1"),
            proof,
            false
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Claim_FutureEpoch"
        );
      });
    });
  });

  describe("Claim weeks", async function () {
    beforeEach(async function () {
      const values = [[owner.address, ethers.utils.parseEther("1")]];
      const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
      await StakingRewardDistribution.deposit(erc20.address, "50000");
      await StakingRewardDistribution.createEpoch(tree.root, "");
      await StakingRewardDistribution.deposit(erc20.address, "50000");
      ``;
      await StakingRewardDistribution.createEpoch(tree.root, "");
    });

    describe("success", async () => {
      it("should claim the amounts", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = [tree.getProof(0), tree.getProof(0)];

        await expect(
          StakingRewardDistribution.claimWeeks(
            [constants.Zero, constants.One],
            [erc20.address],
            [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
            proof,
            false
          )
        )
          .to.emit(StakingRewardDistribution, "Claimed")
          .withArgs(owner.address, "50000", erc20.address, constants.Zero);

        expect(await (await erc20).balanceOf(owner.address)).eq("50000");
        expect(
          await StakingRewardDistribution.claimed(
            constants.Zero,
            erc20.address,
            owner.address
          )
        ).eq(true);
      });
    });

    describe("failure", async () => {
      it("should not allow to claim with mismatching lengths", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = [tree.getProof(0)];

        await expect(
          StakingRewardDistribution.claimWeeks(
            [constants.Zero, constants.One],
            [erc20.address],
            [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
            proof,
            false
          )
        ).to.be.revertedWithCustomError(
          StakingRewardDistribution,
          "Claim_LenMissmatch"
        );
      });
    });
  });

  describe("Verify claim", async function () {
    beforeEach(async function () {
      const values = [[owner.address, ethers.utils.parseEther("1")]];
      const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
      await StakingRewardDistribution.createEpoch(tree.root, "");
    });

    describe("success", async () => {
      it("should return true", async () => {
        const values = [[owner.address, "1000000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        expect(
          await StakingRewardDistribution.verifyClaim(
            owner.address,
            constants.Zero,
            ethers.utils.parseEther("1"),
            proof
          )
        ).eq(true);
      });
    });

    describe("failure", async () => {
      it("should return false with wrong amount", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        expect(
          await StakingRewardDistribution.verifyClaim(
            owner.address,
            constants.Zero,
            ethers.utils.parseEther("0.5"),
            proof
          )
        ).eq(false);
      });

      it("should return false with wrong address", async () => {
        const values = [[owner.address, ethers.utils.parseEther("1")]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        expect(
          await StakingRewardDistribution.verifyClaim(
            otherSigners[0].address,
            constants.Zero,
            ethers.utils.parseEther("1"),
            proof
          )
        ).eq(false);
      });
    });
  });


  describe("Set vesting contract", async function () {
    describe("success", async () => {
      it("should create an epoch", async () => {
        await expect(
          StakingRewardDistribution.setVestingContract(erc20.address)//random adress
        )
          .to.emit(StakingRewardDistribution, "ContractChanged")
          .withArgs(erc20.address);
       
      });
    });
  });
});
