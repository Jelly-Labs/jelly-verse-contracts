import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer, constants } from "ethers";
import { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

describe.only("RewardDistribution", function () {
  async function deployUnitFixture() {
    const [deployer, user, ...otherSigners] = await ethers.getSigners();

    const ERC20Factory = await ethers.getContractFactory("JellyToken");
    const erc20 = await ERC20Factory.deploy(deployer.address);
    erc20.mint(deployer.address, "100000");

    const RewardDistributionFactory = await ethers.getContractFactory(
      "RewardDistribution"
    );
    const RewardDistribution = await RewardDistributionFactory.deploy(
      deployer.address,
      constants.AddressZero
    );

    await erc20.approve(RewardDistribution.address, "100000");

    return { RewardDistribution, deployer, user, otherSigners, erc20 };
  }

  let RewardDistribution: any;
  let owner: any;
  let pendingOwner: Signer;
  let otherSigners: any[];
  let erc20: any;

  beforeEach(async function () {
    const fixture = await loadFixture(deployUnitFixture);
    RewardDistribution = fixture.RewardDistribution;
    owner = fixture.deployer;
    pendingOwner = fixture.user;
    otherSigners = fixture.otherSigners;
    erc20 = fixture.erc20;
  });

  describe("Create Drop", async function () {
    describe("success", async () => {
      it("should create a drop", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        await expect(
          RewardDistribution.createDrop(erc20.address, "100000", tree.root, "")
        )
          .to.emit(RewardDistribution, "DropAdded")
          .withArgs(erc20.address, "100000", constants.One, tree.root, "");

        expect(await RewardDistribution.dropId()).eq(constants.One);
        expect(await RewardDistribution.merkleRoots(constants.Zero)).eq(
          tree.root
        );
        expect(await erc20.balanceOf(RewardDistribution.address)).eq("100000");
      });
    });

    describe("failure", async () => {
      it("should not allow other users to create a drop", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        await expect(
          RewardDistribution.connect(otherSigners[0]).createDrop(
            erc20.address,
            "100000",
            tree.root,
            ""
          )
        ).to.be.revertedWithCustomError(
          RewardDistribution,
          "Ownable__CallerIsNotOwner"
        );
      });
    });
  });

  describe("Claim drop", async function () {
    beforeEach(async function () {
      const values = [[owner.address, "100000"]];
      const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
      await RewardDistribution.createDrop(
        erc20.address,
        "100000",
        tree.root,
        ""
      );
    });
    describe("success", async () => {
      it("should claim the amount", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        await expect(
          RewardDistribution.claimDrop(constants.Zero, "100000", proof)
        )
          .to.emit(RewardDistribution, "Claimed")
          .withArgs(owner.address, "100000", constants.Zero);

        expect(await erc20.balanceOf(owner.address)).eq("100000");
        expect(
          await RewardDistribution.claimed(constants.Zero, owner.address)
        ).eq(true);
      });
    });

    describe("failure", async () => {
      it("should not allow to claim with wrong amount", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await expect(
          RewardDistribution.claimDrop(constants.Zero, "1000000", proof)
        ).to.be.revertedWithCustomError(RewardDistribution, "Claim_WrongProof");
      });

      it("should not allow to claim with wrong address", async () => {
        const values = [[otherSigners[0].address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await expect(
          RewardDistribution.connect(otherSigners[0]).claimDrop(
            constants.Zero,
            "100000",
            proof
          )
        ).to.be.revertedWithCustomError(RewardDistribution, "Claim_WrongProof");
      });

      it("should not allow to claim zero amount", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);
        await expect(
          RewardDistribution.claimDrop(constants.Zero, "0", proof)
        ).to.be.revertedWithCustomError(RewardDistribution, "Claim_ZeroAmount");
      });
      it("should not allow to claim twice", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        await RewardDistribution.claimDrop(constants.Zero, "100000", proof);
        await expect(
          RewardDistribution.claimDrop(constants.Zero, "100000", proof)
        ).to.be.revertedWithCustomError(
          RewardDistribution,
          "Claim_AlreadyClaimed"
        );
      });
      it("should not allow to claim future epoch", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        await expect(
          RewardDistribution.claimDrop(constants.One, "100000", proof)
        ).to.be.revertedWithCustomError(
          RewardDistribution,
          "Claim_WrongDropID"
        );
      });
    });
  });

  describe("Claim drops", async function () {
    beforeEach(async function () {
      const values = [[owner.address, "50000"]];
      const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
      await RewardDistribution.createDrop(
        erc20.address,
        "50000",
        tree.root,
        ""
      );
      await RewardDistribution.createDrop(
        erc20.address,
        "50000",
        tree.root,
        ""
      );
    });
    describe("success", async () => {
      it("should claim the amounts", async () => {
        const values = [[owner.address, "50000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = [tree.getProof(0), tree.getProof(0)];

        await expect(
          RewardDistribution.claimDrops(
            [constants.Zero, constants.One],
            ["50000", "50000"],
            proof
          )
        )
          .to.emit(RewardDistribution, "Claimed")
          .withArgs(owner.address, "50000", constants.Zero);

        expect(await erc20.balanceOf(owner.address)).eq("100000");
        expect(
          await RewardDistribution.claimed(constants.Zero, owner.address)
        ).eq(true);
        expect(
          await RewardDistribution.claimed(constants.One, owner.address)
        ).eq(true);
      });
    });

    describe("failure", async () => {
      it("should not allow to claim with mismatching lengths", async () => {
        const values = [[owner.address, "50000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = [tree.getProof(0)];

        await expect(
          RewardDistribution.claimDrops(
            [constants.Zero, constants.One],
            ["50000", "50000"],
            proof
          )
        ).to.be.revertedWithCustomError(
          RewardDistribution,
          "Claim_LenMissmatch"
        );
      });
    });
  });
  describe("Verify claim", async function () {
    beforeEach(async function () {
      const values = [[owner.address, "100000"]];
      const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
      await RewardDistribution.createDrop(
        erc20.address,
        "100000",
        tree.root,
        ""
      );
    });
    describe("success", async () => {
      it("should return true", async () => {
        const values = [[owner.address, "1000000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        expect(
          await RewardDistribution.verifyClaim(
            owner.address,
            constants.Zero,
            "100000",
            proof
          )
        ).eq(true);
      });
    });
    describe("failure", async () => {
      it("should return false with wrong amount", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        expect(
          await RewardDistribution.verifyClaim(
            owner.address,
            constants.Zero,
            "1000",
            proof
          )
        ).eq(false);
      });
      it("should return false with wrong address", async () => {
        const values = [[owner.address, "100000"]];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        const proof = tree.getProof(0);

        expect(
          await RewardDistribution.verifyClaim(
            otherSigners[0].address,
            constants.Zero,
            "100000",
            proof
          )
        ).eq(false);
      });
    });
  });
});
