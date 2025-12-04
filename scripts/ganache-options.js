module.exports = {
  logging: { quiet: true },
  wallet: {
    mnemonic: 'test test test test test test test test test test test junk',
    totalAccounts: 20,
    defaultBalance: 1_000_000_000_000_000_000_000n // 1,000 ETH
  },
  chain: {
    chainId: 1337,
    networkId: 1337,
    allowUnlimitedContractSize: true,
    hardfork: 'shanghai'
  },
  miner: {
    blockGasLimit: 30_000_000n
  },
};
