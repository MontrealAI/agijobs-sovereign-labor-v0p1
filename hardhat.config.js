require("dotenv").config();
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-ethers");

const { MAINNET_RPC, DEPLOYER_PK, ETHERSCAN_API_KEY, SEPOLIA_RPC, SEPOLIA_DEPLOYER_PK } = process.env;

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 5
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "none"
      },
      debug: {
        revertStrings: "strip"
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 30_000_000
    },
    sepolia: {
      url: SEPOLIA_RPC || "",
      accounts: SEPOLIA_DEPLOYER_PK ? [SEPOLIA_DEPLOYER_PK] : [],
      chainId: 11155111
    },
    mainnet: {
      url: MAINNET_RPC || "",
      accounts: DEPLOYER_PK ? [DEPLOYER_PK] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./hardhat/test",
    cache: "./hardhat/cache",
    artifacts: "./hardhat/artifacts"
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || ""
  }
};
