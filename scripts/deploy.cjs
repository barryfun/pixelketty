const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Launchpad = await hre.ethers.getContractFactory("MemeLaunchpadDemo");
  const launchpad = await Launchpad.deploy();

  await launchpad.waitForDeployment();

  const network = await hre.ethers.provider.getNetwork();
  const address = await launchpad.getAddress();
  const tokenAddress = await launchpad.token();
  const nftAddress = await launchpad.nft();
  const hookAddress = await launchpad.hook();
  const launchpadArtifact = await hre.artifacts.readArtifact("MemeLaunchpadDemo");
  const tokenArtifact = await hre.artifacts.readArtifact("MemeToken");
  const nftArtifact = await hre.artifacts.readArtifact("MemeNFT");
  const hookArtifact = await hre.artifacts.readArtifact("MemeV4HookMock");
  const outputDir = path.join(__dirname, "..", "src", "contracts");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "MegaMemeLaunchpad.json"),
    JSON.stringify(
      {
        chainId: Number(network.chainId),
        launchpad: { address, abi: launchpadArtifact.abi },
        token: { address: tokenAddress, abi: tokenArtifact.abi },
        nft: { address: nftAddress, abi: nftArtifact.abi },
        hook: { address: hookAddress, abi: hookArtifact.abi }
      },
      null,
      2
    )
  );

  console.log(`KETTY launchpad deployed by ${deployer.address}`);
  console.log(`Launchpad: ${address}`);
  console.log(`MemeToken: ${tokenAddress}`);
  console.log(`MemeNFT: ${nftAddress}`);
  console.log(`V4 Hook Mock: ${hookAddress}`);
  console.log("Frontend config written to src/contracts/MegaMemeLaunchpad.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
