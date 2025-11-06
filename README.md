# agijobs-sovereign-labor-v0p1

[![Compile](https://github.com/AGIJobs/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml/badge.svg)](https://github.com/AGIJobs/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml)

Contracts-only kernel for AGIJobs Sovereign Labor (α 0.1).

## Continuous Integration

The `compile` workflow installs dependencies and runs `truffle compile` using the repository configuration. Running it locally helps keep CI green:

```bash
npm install --no-audit --no-fund
npx truffle compile
```

## Mainnet verification

Set the following environment variables before deploying or verifying:

* `MAINNET_RPC` – HTTPS RPC endpoint for Ethereum mainnet.
* `DEPLOYER_PK` – hex-encoded private key of the deployer (no `0x` prefix required by `@truffle/hdwallet-provider`).
* `ETHERSCAN_API_KEY` – API key with contract verification access.

After deploying, regenerate artifacts with the same compiler settings and use the Truffle verification plugin:

```bash
npx truffle compile
npx truffle run verify IdentityRegistry JobRegistry PlatformRegistry StakeManager SystemPause ValidationModule --network mainnet --force-license MIT
```

The Solidity compiler is configured for `viaIR` with the optimizer enabled so that Etherscan receives bytecode identical to the deployment bytecode.
