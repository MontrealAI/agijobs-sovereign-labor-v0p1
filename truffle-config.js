require('dotenv').config();
const ganache = require('ganache');
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

const useViaIR = boolFromEnv(SOLC_VIA_IR, true);
const optimizerEnabled = boolFromEnv(SOLC_OPTIMIZER, useViaIR);
const optimizerRuns = Number(SOLC_OPTIMIZER_RUNS || 5);

module.exports = {
  contracts_build_directory: "./build/contracts",
  test_directory: "./truffle/test",
  networks: {
    development: {
      provider: () => ganache.provider({
        logging: { quiet: true },
        chain: { chainId: 1337, networkId: 1337 },
        wallet: {
          mnemonic: "test test test test test test test test test test test junk",
          totalAccounts: 10,
          defaultBalance: 1000
        }
      }),
      network_id: 1337,
      from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    },
    test: {
      provider: () => ganache.provider({
        logging: { quiet: true },
        chain: { chainId: 1337, networkId: 1337 },
        wallet: {
          mnemonic: "test test test test test test test test test test test junk",
          totalAccounts: 10,
          defaultBalance: 1000
        }
      }),
      network_id: 1337,
      from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
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
