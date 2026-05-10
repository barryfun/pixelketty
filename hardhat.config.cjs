require("@nomicfoundation/hardhat-toolbox");

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const mainnetRpcUrl = process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    sepolia: {
      url: sepoliaRpcUrl,
      chainId: 11155111,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    },
    mainnet: {
      url: mainnetRpcUrl,
      chainId: 1,
      accounts: mainnetPrivateKey ? [mainnetPrivateKey] : []
    }
  }
};
