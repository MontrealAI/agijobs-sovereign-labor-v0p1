# ADR 0002: Deterministic $AGIALPHA Token Discipline

- Status: Accepted
- Date: 2024-07-05
- Deciders: Sovereign Labor Core Team

## Context
The economic spine of the ecosystem must be immutable: every staking, payout, fee, and dispute flow relies on a single ERC-20 token. Divergent token addresses, decimals, or metadata create governance risk, tax ambiguity, and accounting drift. Tests, migrations, and modules already assume a canonical `$AGIALPHA` contract deployed at `0xa61a3b3a130a9c20768eebf97e21515a6046a1fa` with 18 decimals.

## Decision
We hard-code the `$AGIALPHA` address, decimals, symbol, and scaling factor inside [`contracts/Constants.sol`](../contracts/Constants.sol) and propagate those constants to every module and script. `StakeManager`, `FeePool`, and other constructors validate `IERC20Metadata.decimals() == 18` and revert if a non-canonical token is provided. Deployment scripts, migrations, governance checks, and tests enforce the same address. CI pipelines abort if any module, config file, or manifest diverges from the canonical constants.

## Consequences
- ✅ **Deterministic accounting.** All math assumes `TOKEN_SCALE = 1e18`, ensuring composability across modules.
- ✅ **Governance certainty.** Any attempt to swap tokens is caught in CI and at runtime, preventing malicious or accidental asset substitution.
- ⚠️ **Upgrade friction.** Migrating to a new token would require redeploying contracts or extending them with upgrade hooks; this is intentional to force deliberate process.
- ❌ **Mainnet-only address.** Deployments on non-mainnet chains must still respect the canonical address by deploying a mock ERC-20 to that slot (tests already do this). Operators must ensure the address is unused before mirroring.

## Alternatives Considered
1. **Configurable token address.** Rejected: increases attack surface; governance surface audit would have to track more state, and runtime misconfiguration becomes likelier.
2. **Upgradeable token reference.** Rejected: requires storage writes and introduces the risk of partial rewiring.
3. **Multi-token registry.** Rejected: adds unnecessary complexity for the initial release; single-token focus keeps stake economics predictable.

## Verification
- Truffle, Hardhat, and Foundry tests deploy a mock `$AGIALPHA` at the canonical address and verify decimals.
- `scripts/check-governance-matrix.mjs` cross-checks `Constants.sol`, deployment configs, and on-chain storage for mismatches.
- CI security scans inspect `FeePool` and `StakeManager` bytecode for the canonical address, ensuring instrumentation remains intact.
