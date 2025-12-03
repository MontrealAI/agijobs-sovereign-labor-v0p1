require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const {
  MAINNET_RPC,
  SEPOLIA_RPC,
  DEPLOYER_PK,
  ETHERSCAN_API_KEY,
  SOLC_VIA_IR,
  SOLC_OPTIMIZER,
  SOLC_OPTIMIZER_RUNS
} = process.env;

const boolFromEnv = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return ["true", "1", true].includes(value?.toString().toLowerCase());
};

// Truffle compilation was timing out when IR was enabled by default. To keep
// local/CI builds responsive we now default to the standard pipeline with the
// optimizer disabled; teams that need the IR path can opt in via the
// environment.
const useViaIR = boolFromEnv(SOLC_VIA_IR, false);
const optimizerEnabled = boolFromEnv(SOLC_OPTIMIZER, false);
const optimizerRuns = Number(SOLC_OPTIMIZER_RUNS || 200);

module.exports = {
  contracts_build_directory: "./build/contracts",
  test_directory: "./truffle/test",
  networks: {
    mainnet: {
      provider: () => new HDWalletProvider({ privateKeys: [DEPLOYER_PK], providerOrUrl: MAINNET_RPC }),
      network_id: 1, confirmations: 2, timeoutBlocks: 500, skipDryRun: true
    },
    sepolia: {
      provider: () => new HDWalletProvider({ privateKeys: [DEPLOYER_PK], providerOrUrl: SEPOLIA_RPC }),
      network_id: 11155111, confirmations: 2, timeoutBlocks: 500, skipDryRun: false
    }
  },
  compilers: {
    solc: {
      version: "0.8.30",
      settings: {
        optimizer: {
          enabled: optimizerEnabled,
          runs: optimizerRuns
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
    }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: { etherscan: ETHERSCAN_API_KEY }
};
