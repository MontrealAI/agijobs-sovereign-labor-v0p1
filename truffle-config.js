require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { MAINNET_RPC, SEPOLIA_RPC, DEPLOYER_PK, ETHERSCAN_API_KEY } = process.env;

module.exports = {
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
    solc: { version: "0.8.25", settings: { optimizer: { enabled: true, runs: 200 } } }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: { etherscan: ETHERSCAN_API_KEY }
};
