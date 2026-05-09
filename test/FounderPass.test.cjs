const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FounderPass", function () {
  async function deployFounderPass() {
    const [owner, buyer, treasury] = await ethers.getSigners();
    const FounderPass = await ethers.getContractFactory("FounderPass");
    const mintPrice = ethers.parseEther("0.03");
    const pass = await FounderPass.deploy("Founder Pass", "FPASS", 5, mintPrice, "ipfs://metadata/");
    return { pass, owner, buyer, treasury, mintPrice };
  }

  it("allows minting while the sale is active", async function () {
    const { pass, buyer, mintPrice } = await deployFounderPass();

    await pass.setSaleActive(true);
    await expect(pass.connect(buyer).mint(2, { value: mintPrice * 2n }))
      .to.emit(pass, "Transfer")
      .withArgs(ethers.ZeroAddress, buyer.address, 1);

    expect(await pass.balanceOf(buyer.address)).to.equal(2);
    expect(await pass.totalSupply()).to.equal(2);
  });

  it("blocks minting when sale is closed", async function () {
    const { pass, buyer, mintPrice } = await deployFounderPass();

    await expect(pass.connect(buyer).mint(1, { value: mintPrice })).to.be.revertedWithCustomError(pass, "SaleClosed");
  });

  it("enforces the per-wallet mint limit", async function () {
    const { pass, buyer, mintPrice } = await deployFounderPass();

    await pass.setSaleActive(true);
    await pass.connect(buyer).mint(3, { value: mintPrice * 3n });
    await expect(pass.connect(buyer).mint(1, { value: mintPrice })).to.be.revertedWithCustomError(pass, "MintLimitReached");
  });

  it("lets the owner withdraw funds", async function () {
    const { pass, buyer, treasury, mintPrice } = await deployFounderPass();

    await pass.setSaleActive(true);
    await pass.connect(buyer).mint(1, { value: mintPrice });

    await expect(await pass.withdraw(treasury.address)).to.changeEtherBalance(treasury, mintPrice);
  });
});
