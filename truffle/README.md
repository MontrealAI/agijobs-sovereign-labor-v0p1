# Truffle Environment Guide

## Network Profiles
```mermaid
flowchart TD
    Dev[Development (in-memory)] --> Uses[Ganache / truffle develop]
    Sepolia[Sapolia Testnet] --> RPC[SEPOLIA_RPC]
    Mainnet[Mainnet] --> RPC2[MAINNET_RPC]
    Sepolia --> Secrets[DEPLOYER_PK, ETHERSCAN_API_KEY]
    Mainnet --> Secrets
```

Profiles are configured in [`truffle-config.js`](../truffle-config.js). Update environment variables before invoking `truffle migrate --network <profile>`.

## Useful Commands
- `npx truffle develop` — launch an isolated VM with funded accounts.
- `truffle console --network <profile>` — interact with deployed contracts.
- `truffle test --network <profile>` — execute tests against a specific network.
- `truffle exec <script.js> --network <profile>` — run custom scripts.

## Artifacts
Compiled artifacts land in `build/contracts/`. Clean the directory when switching compiler settings to avoid stale ABIs:

```bash
rm -rf build/contracts
npm run compile
```

## Debugging Tips
- Enable verbose logging with `truffle develop --log`.
- Use `truffle debug <tx-hash>` to step through failed transactions.
- Confirm compiler version parity with `truffle version` (should report Solidity 0.8.30).

## Integration with Other Tooling
- Hardhat & Foundry can consume Truffle artifacts by pointing to `build/contracts/*.json`.
- Use `@truffle/hdwallet-provider` with environment secrets for deterministic signing.
- Keep `.env` files out of version control; prefer environment managers or encrypted secrets.
