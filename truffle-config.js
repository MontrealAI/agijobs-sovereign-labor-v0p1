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

let useViaIR = boolFromEnv(SOLC_VIA_IR, true);
if (!useViaIR) {
  console.warn("SOLC_VIA_IR=false is not supported; forcing viaIR to avoid stack depth errors.");
  useViaIR = true;
}
// Default to enabling the optimizer even when the IR pipeline is disabled so
// local builds don't hit stack-too-deep errors when developers try
// `SOLC_VIA_IR=false` for faster iterations.
const optimizerEnabled = boolFromEnv(SOLC_OPTIMIZER, true);
const optimizerRuns = Number(SOLC_OPTIMIZER_RUNS || (useViaIR ? 5 : 200));

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
