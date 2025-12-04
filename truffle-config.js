require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const ganache = require('ganache');
const ganacheOptions = require('./scripts/ganache-options');

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

const useViaIR = boolFromEnv(SOLC_VIA_IR, true);
// Default to enabling the optimizer even when the IR pipeline is disabled so
// local builds don't hit stack-too-deep errors when developers try
// `SOLC_VIA_IR=false` for faster iterations.
const optimizerEnabled = boolFromEnv(SOLC_OPTIMIZER, true);
const optimizerRuns = Number(SOLC_OPTIMIZER_RUNS || (useViaIR ? 5 : 200));

module.exports = {
  contracts_build_directory: "./build/contracts",
  test_directory: "./truffle/test",
  networks: {
    development: {
      provider: () => ganache.provider(ganacheOptions),
      network_id: ganacheOptions.chain.networkId,
      gas: Number(ganacheOptions.miner.blockGasLimit - 1n),
      gasPrice: 0,
      networkCheckTimeout: 100000,
      skipDryRun: true
    },
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
      version: "0.8.25",
      settings: {
        optimizer: {
          enabled: optimizerEnabled,
          runs: optimizerRuns,
          details: {
            // Disable the Yul optimizer when the IR pipeline is turned off to
            // reduce stack pressure on large functions.
            yul: useViaIR
          }
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
