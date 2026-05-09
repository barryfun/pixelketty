const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function decodeDataUri(uri, prefix) {
  return Buffer.from(uri.replace(prefix, ""), "base64").toString("utf8");
}

async function main() {
  const signers = await hre.ethers.getSigners();
  const Launchpad = await hre.ethers.getContractFactory("MemeLaunchpadDemo");
  const launchpad = await Launchpad.deploy();
  const nft = await hre.ethers.getContractAt("MemeNFT", await launchpad.nft());

  const samples = [
    { holder: signers[1], amount: 250, name: "sample-01-basic" },
    { holder: signers[2], amount: 1000, name: "sample-02-head-accessory" },
    { holder: signers[3], amount: 5000, name: "sample-03-earrings" },
    { holder: signers[4], amount: 10000, name: "sample-04-visor" },
    { holder: signers[5], amount: 25000, name: "sample-05-max-accessories" }
  ];

  const outputDir = path.join(__dirname, "..", "samples", "contract-cats");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest = [];

  for (const sample of samples) {
    const cost = await launchpad.quoteBuy(sample.amount);
    await launchpad.connect(sample.holder).buy(sample.amount, { value: cost });
    const [, tokenId] = await launchpad.userState(sample.holder.address);
    const tokenUri = await nft.tokenURI(tokenId);
    const metadata = JSON.parse(decodeDataUri(tokenUri, "data:application/json;base64,"));
    const svg = decodeDataUri(metadata.image, "data:image/svg+xml;base64,");

    const svgPath = path.join(outputDir, `${sample.name}.svg`);
    const jsonPath = path.join(outputDir, `${sample.name}.json`);
    fs.writeFileSync(svgPath, svg);
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

    manifest.push({
      name: metadata.name,
      file: svgPath,
      amount: sample.amount,
      traits: metadata.attributes
    });
  }

  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${samples.length} contract-generated cat samples to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
