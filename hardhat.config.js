require("dotenv").config();
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-ethers");

const { MAINNET_RPC, DEPLOYER_PK, ETHERSCAN_API_KEY, SEPOLIA_RPC, SEPOLIA_DEPLOYER_PK, SOLC_VIA_IR } = process.env;

const boolFromEnv = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return ["true", "1", true].includes(value?.toString().toLowerCase());
};

const useViaIR = boolFromEnv(SOLC_VIA_IR, true);

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 5
      },
      // Enable the IR pipeline to avoid stack-too-deep errors in complex
      // identity/alias verification flows.
      // Can be disabled for faster local/CI builds by setting SOLC_VIA_IR=false.
      viaIR: useViaIR,
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
