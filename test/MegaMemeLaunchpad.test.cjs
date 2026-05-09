const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MegaMemeLaunchpad", function () {
  async function deployLaunchpad() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Launchpad = await ethers.getContractFactory("MemeLaunchpadDemo");
    const launchpad = await Launchpad.deploy();
    const token = await ethers.getContractAt("MemeToken", await launchpad.token());
    const nft = await ethers.getContractAt("MemeNFT", await launchpad.nft());
    const hook = await ethers.getContractAt("MemeV4HookMock", await launchpad.hook());
    return { launchpad, token, nft, hook, owner, alice, bob };
  }

  it("creates a 70,000 KETTY supply with 50,000 for sale and 20,000 for liquidity", async function () {
    const { launchpad, token, alice } = await deployLaunchpad();

    expect(await token.totalSupply()).to.equal(ethers.parseEther("70000"));
    expect(await launchpad.remainingForSale()).to.equal(ethers.parseEther("50000"));
    expect(await launchpad.quoteBuy(25)).to.equal(ethers.parseEther("0.025"));

    await launchpad.connect(alice).buy(25, { value: await launchpad.quoteBuy(25) });
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("25"));
    expect(await launchpad.remainingForSale()).to.equal(ethers.parseEther("49975"));
  });

  it("requires 10 KETTY to mint a KETTY NFT", async function () {
    const { launchpad, token, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(10, { value: await launchpad.quoteBuy(10) });

    await expect(launchpad.connect(alice).mintKettyNft())
      .to.emit(nft, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, 1);

    expect(await token.balanceOf(alice.address)).to.equal(0);
    expect(await nft.balanceOf(alice.address)).to.equal(1);
    expect(await nft.powerOf(1)).to.equal(ethers.parseEther("10"));
    expect(await nft.accessoryCountOf(1)).to.equal(0);
  });

  it("lets a wallet mint multiple NFTs and choose which one to upgrade", async function () {
    const { launchpad, token, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(30, { value: await launchpad.quoteBuy(30) });
    await launchpad.connect(alice).mintKettyNft();
    await launchpad.connect(alice).mintKettyNft();

    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));
    expect(await nft.balanceOf(alice.address)).to.equal(2);
    expect(await nft.primaryTokenOf(alice.address)).to.equal(2);
    expect(await nft.tokensOfOwner(alice.address)).to.deep.equal([1n, 2n]);

    await launchpad.connect(alice).addAccessory(1);
    expect(await nft.accessoryCountOf(1)).to.equal(1);
    expect(await nft.accessoryCountOf(2)).to.equal(0);
  });

  it("adds one ranked accessory per extra 10 KETTY, capped at 5", async function () {
    const { launchpad, token, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(60, { value: await launchpad.quoteBuy(60) });
    await launchpad.connect(alice).mintKettyNft();

    for (let i = 1; i <= 5; i++) {
      await expect(launchpad.connect(alice).addAccessory(1)).to.emit(nft, "AccessorySeeded");
      expect(await nft.accessoryCountOf(1)).to.equal(i);
    }

    await expect(launchpad.connect(alice).addAccessory(1)).to.be.revertedWith("max accessories");
    expect(await token.balanceOf(alice.address)).to.equal(0);
    expect(await nft.powerOf(1)).to.equal(ethers.parseEther("60"));
  });

  it("keeps unsent KETTY sellable after NFT and accessory spending", async function () {
    const { launchpad, token, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(30, { value: await launchpad.quoteBuy(30) });
    await launchpad.connect(alice).mintKettyNft();
    await launchpad.connect(alice).addAccessory(1);

    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));
    expect(await nft.accessoryCountOf(1)).to.equal(1);

    await token.connect(alice).approve(await launchpad.getAddress(), ethers.parseEther("10"));
    await launchpad.connect(alice).sell(10);

    expect(await token.balanceOf(alice.address)).to.equal(0);
    expect(await nft.isActive(1)).to.equal(true);
    expect(await nft.accessoryCountOf(1)).to.equal(1);
  });

  it("splits buys 30% to dev and 70% to the contract, then refunds sells at 70%", async function () {
    const { launchpad, token, owner, alice } = await deployLaunchpad();
    const launchpadAddress = await launchpad.getAddress();

    await expect(launchpad.connect(alice).buy(100, { value: await launchpad.quoteBuy(100) }))
      .to.changeEtherBalances(
        [alice, owner, launchpad],
        [ethers.parseEther("-0.1"), ethers.parseEther("0.03"), ethers.parseEther("0.07")]
      );

    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    expect(await launchpad.devEthCollected()).to.equal(ethers.parseEther("0.03"));
    expect(await launchpad.quoteSell(100)).to.equal(ethers.parseEther("0.07"));

    await token.connect(alice).approve(launchpadAddress, ethers.parseEther("100"));
    await expect(launchpad.connect(alice).sell(100))
      .to.changeEtherBalances([alice, launchpad], [ethers.parseEther("0.07"), ethers.parseEther("-0.07")]);
  });

  it("seeds the mock v4 liquidity bucket after all 50,000 sale KETTY are sold", async function () {
    const { launchpad, token, hook, owner, alice } = await deployLaunchpad();

    await expect(launchpad.connect(alice).buy(50000, { value: await launchpad.quoteBuy(50000) }))
      .to.changeEtherBalances(
        [alice, owner, launchpad],
        [ethers.parseEther("-50"), ethers.parseEther("15"), ethers.parseEther("35")]
      );

    expect(await launchpad.remainingForSale()).to.equal(0);
    expect(await launchpad.liquiditySeeded()).to.equal(true);
    expect(await launchpad.liquidityEthSeeded()).to.equal(ethers.parseEther("35"));
    expect(await launchpad.liquidityTokenSeeded()).to.equal(ethers.parseEther("20000"));
    expect(await hook.liquidityEthSeeded()).to.equal(ethers.parseEther("35"));
    expect(await hook.liquidityTokenSeeded()).to.equal(ethers.parseEther("20000"));
    expect(await token.balanceOf(await launchpad.getAddress())).to.equal(ethers.parseEther("20000"));
  });

  it("records 3% pool tax with half to dev and half claimable by accessory holders", async function () {
    const { launchpad, token, nft, owner, alice, bob } = await deployLaunchpad();

    await launchpad.connect(alice).buy(60, { value: await launchpad.quoteBuy(60) });
    await launchpad.connect(bob).buy(30, { value: await launchpad.quoteBuy(30) });
    await launchpad.connect(alice).mintKettyNft();
    await launchpad.connect(bob).mintKettyNft();

    for (let i = 0; i < 5; i++) {
      await launchpad.connect(alice).addAccessory(1);
    }
    for (let i = 0; i < 2; i++) {
      await launchpad.connect(bob).addAccessory(2);
    }

    await expect(launchpad.connect(bob).mockRecordPoolTax(ethers.parseEther("1"), { value: ethers.parseEther("0.03") }))
      .to.changeEtherBalances(
        [bob, owner, launchpad],
        [ethers.parseEther("-0.03"), ethers.parseEther("0.015"), ethers.parseEther("0.015")]
      );

    expect(await launchpad.taxEthToDev()).to.equal(ethers.parseEther("0.015"));
    expect(await launchpad.taxEthToHolders()).to.equal(ethers.parseEther("0.015"));
    expect(await launchpad.claimableTaxReward(1)).to.equal(ethers.parseEther("0.010714285714285714"));
    expect(await launchpad.claimableTaxReward(2)).to.equal(ethers.parseEther("0.004285714285714285"));

    await expect(launchpad.connect(alice).claimTaxReward(1))
      .to.changeEtherBalances([alice, launchpad], [ethers.parseEther("0.010714285714285714"), ethers.parseEther("-0.010714285714285714")]);
    expect(await launchpad.claimableTaxReward(1)).to.equal(0);
    expect(await nft.accessoryCountOf(1)).to.equal(5);
  });

  it("serves fully on-chain cat metadata with ranked accessory traits", async function () {
    const { launchpad, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(30, { value: await launchpad.quoteBuy(30) });
    await launchpad.connect(alice).mintKettyNft();
    await launchpad.connect(alice).addAccessory(1);
    await launchpad.connect(alice).addAccessory(1);

    const tokenUri = await nft.tokenURI(1);
    expect(tokenUri).to.match(/^data:application\/json;base64,/);

    const json = JSON.parse(Buffer.from(tokenUri.replace("data:application/json;base64,", ""), "base64").toString("utf8"));
    expect(json.name).to.equal("KETTY Cat #1");
    expect(json.image).to.match(/^data:image\/svg\+xml;base64,/);
    expect(json.attributes.find((trait) => trait.trait_type === "Accessory Count").value).to.equal("2");

    const svg = Buffer.from(json.image.replace("data:image/svg+xml;base64,", ""), "base64").toString("utf8");
    expect(svg).to.include("KETTY CAT #1");
    expect(svg).to.include("30 KETTY USED");
  });

  it("can mint a testnet dynamic preview cat with animated rainbow SVG", async function () {
    const { launchpad, token, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(60, { value: await launchpad.quoteBuy(60) });
    await expect(launchpad.connect(alice).mintDynamicPreviewNft())
      .to.emit(launchpad, "DynamicPreviewMinted");

    expect(await token.balanceOf(alice.address)).to.equal(0);
    expect(await nft.accessoryCountOf(1)).to.equal(5);
    expect(await nft.isDynamic(1)).to.equal(true);

    const tokenUri = await nft.tokenURI(1);
    const json = JSON.parse(Buffer.from(tokenUri.replace("data:application/json;base64,", ""), "base64").toString("utf8"));
    expect(json.attributes.find((trait) => trait.trait_type === "Dynamic NFT").value).to.equal("Yes");
    expect(json.attributes.find((trait) => trait.trait_type === "Dynamic Background").value).to.be.oneOf([
      "Rainbow Rush",
      "Pixel Rain",
      "Thunderstorm",
      "Meteor Night",
      "Aurora Pulse"
    ]);

    const svg = Buffer.from(json.image.replace("data:image/svg+xml;base64,", ""), "base64").toString("utf8");
    expect(svg).to.include("animateTransform");
    expect(svg).to.include("DYNAMIC");
  });

  it("caps dynamic NFTs at 50 and drops dynamic chance to zero after that", async function () {
    const { launchpad, nft, alice } = await deployLaunchpad();

    await launchpad.connect(alice).buy(3060, { value: await launchpad.quoteBuy(3060) });

    for (let i = 1; i <= 50; i++) {
      await launchpad.connect(alice).mintDynamicPreviewNft();
      expect(await nft.isDynamic(i)).to.equal(true);
      expect(await nft.dynamicMinted()).to.equal(i);
    }

    expect(await nft.dynamicRemaining()).to.equal(0);
    await launchpad.connect(alice).mintDynamicPreviewNft();
    expect(await nft.accessoryCountOf(51)).to.equal(5);
    expect(await nft.isDynamic(51)).to.equal(false);
    expect(await nft.dynamicMinted()).to.equal(50);
  });

  it("lists, cancels, and sells NFTs on the market", async function () {
    const { launchpad, nft, alice, bob } = await deployLaunchpad();

    await launchpad.connect(alice).buy(30, { value: await launchpad.quoteBuy(30) });
    await launchpad.connect(alice).mintKettyNft();
    await launchpad.connect(alice).addAccessory(1);

    await expect(launchpad.connect(alice).listNft(1, ethers.parseEther("0.2")))
      .to.emit(launchpad, "NftListed")
      .withArgs(alice.address, 1, ethers.parseEther("0.2"));

    expect((await launchpad.listings(1)).active).to.equal(true);
    expect(await launchpad.marketTokenIds()).to.deep.equal([1n]);

    await launchpad.connect(alice).cancelListing(1);
    expect((await launchpad.listings(1)).active).to.equal(false);

    await launchpad.connect(alice).listNft(1, ethers.parseEther("0.2"));
    await expect(launchpad.connect(bob).buyListedNft(1, { value: ethers.parseEther("0.2") }))
      .to.emit(launchpad, "NftSold")
      .withArgs(alice.address, bob.address, 1, ethers.parseEther("0.2"));

    expect(await nft.ownerOf(1)).to.equal(bob.address);
    expect(await nft.balanceOf(alice.address)).to.equal(0);
    expect(await nft.balanceOf(bob.address)).to.equal(1);
    expect((await launchpad.listings(1)).active).to.equal(false);
  });
});
