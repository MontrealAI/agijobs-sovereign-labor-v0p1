# Deployment Runbook

![Mainnet Ready](https://img.shields.io/badge/Mainnet-Ready-29a3ff?style=for-the-badge)
![Truffle Migrations](https://img.shields.io/badge/Truffle-Migrations-5e464d?logo=truffle&style=for-the-badge)
![Safe Friendly](https://img.shields.io/badge/Execution-Safe%20Friendly-7f5af0?style=for-the-badge)

> This runbook turns a non-technical operator into a mainnet pilot: configure, validate, migrate, and accept ownership using the exact sequence enforced by CI.

---

## End-to-End Flight Plan

```mermaid
flowchart TD
    prep[Prepare config.mainnet.json]\nCopy Safe, guardian, treasury, parameters.
    secrets[Load secrets]\nExport MAINNET_RPC, DEPLOYER_PK, ETHERSCAN_API_KEY.
    install[Install toolchain]\n`npm ci --omit=optional --no-audit --no-fund`
    lint[Lint]\n`npm run lint:sol`
    compile[Compile]\n`npm run compile`
    artifacts[Verify artifacts]\n`node scripts/verify-artifacts.js`
    governance[Governance audit]\n`npm run ci:governance`
    migrate[Migrate]\n`DEPLOY_CONFIG=... npx truffle migrate --network mainnet --f 1 --to 3`
    finalize[Safe acceptOwnership]\nExecute queued Safe transactions.
    verify[Etherscan verify]\n`npm run verify:mainnet`
    archive[Archive manifest]\nStore manifests/addresses.mainnet.json.

    prep --> secrets --> install --> lint --> compile --> artifacts --> governance --> migrate --> finalize --> verify --> archive
```

Every command mirrors the automated checks in `.github/workflows/ci.yml`, ensuring the operator follows the same deterministic path.

## Configuration Checklist (`deploy/config.mainnet.json`)
| Field | Description |
| --- | --- |
| `chainId` | Must equal the broadcast network (1 for mainnet). |
| `ownerSafe` | Safe or timelock that will ultimately govern `SystemPause`. |
| `guardianSafe` | Optional Safe with emergency pause authority (defaults to `ownerSafe`). |
| `treasury` | Address receiving slashed stakes and FeePool residuals. |
| `tokens.agi` | `$AGIALPHA` token address (defaults to canonical 0xa61a3b3a130a9c20768eebf97e21515a6046a1fa). |
| `params.platformFeeBps` | Multiple of 100 controlling platform fee percentage. |
| `params.burnBpsOfFee` | Multiple of 100 describing FeePool burn percentage. |
| `params.slashBps` | Stake slash percentage (basis points). |
| `params.minStakeWei`, `jobStakeWei` | Minimum stake thresholds (wei). |
| `params.validatorQuorum`, `maxValidators` | Validator committee sizing. |
| `params.disputeFeeWei`, `disputeWindow` | Dispute economics. |
| `identity.*` | ENS registry/name wrapper addresses, ENS names for agent/club roots, optional Merkle roots. |
| `tax.*` | Optional policy metadata (URI, acknowledgement text). |

### Quick validation tips
- Keep Safe addresses checksum-formatted.
- Use ENS names (`agent.agi.eth`) in config; migrations hash them automatically.
- If treasury is omitted the migration skips allowlisting and treasury wiring.

## Secrets & Environment
Export environment variables before running migrations:
```bash
export MAINNET_RPC="https://mainnet.infura.io/v3/<project>"
export DEPLOYER_PK="<hex-private-key-without-0x>"
export ETHERSCAN_API_KEY="<token>"
export DEPLOY_CONFIG="$(pwd)/deploy/config.mainnet.json"
```
Use a throwaway shell session or dedicated deployment workstation so secrets are not persisted.

## Migration Command
```bash
DEPLOY_CONFIG=$(pwd)/deploy/config.mainnet.json \
  npx truffle migrate --network mainnet --f 1 --to 3 --skip-dry-run --compile-all
```
- `--f 1 --to 3` runs the full kernel deployment, SystemPause registration, and finalization audit.
- `--skip-dry-run` bypasses the simulated migration so the chain state remains clean.
- `--compile-all` ensures Truffle compiles with the same settings as CI even if build artifacts are stale.

## What the Scripts Do
1. **`1_deploy_kernel.js`** – deploys every module (`OwnerConfigurator`, `TaxPolicy`, `StakeManager`, `FeePool`, `ReputationEngine`, `PlatformRegistry`, `AttestationRegistry`, `IdentityRegistry`, `CertificateNFT`, `ValidationModule`, `DisputeModule`, `JobRegistry`, `ArbitratorCommittee`, `SystemPause`), wires them, sets pausers, and transfers ownership to `SystemPause` or the owner Safe.
2. **`2_register_pause.js`** – sanity-checks wiring, ownership, guardian pauser, and prints a table of module owners.
3. **`3_mainnet_finalize.js`** – revalidates owners, pointer integrity, guardian pauser, and `$AGIALPHA` configuration against `deploy/config.mainnet.json`.

A manifest is written to `manifests/addresses.<network>.json` with module addresses, owner Safe, guardian Safe, treasury, and token metadata.

## Safe Acceptance Flow
After migration, the Safe queue contains `acceptOwnership` calls for:
- `IdentityRegistry`
- `AttestationRegistry`
- (Optional) `OwnerConfigurator` if you plan to operate via the configurator UI

Execute them in the Safe UI so full control is returned to the owner.

## Verification & Post-Checks
1. Wait for transaction confirmations (recommend ≥12 blocks on mainnet).
2. Run `npm run verify:mainnet` to push bytecode/ABIs to Etherscan.
3. Record the manifest and Safe transaction hashes in your ops logbook.
4. Optionally re-run `npm run ci:governance` against mainnet artifacts for final assurance.

## Emergency Procedures
- **Global pause:** Guardian Safe → `SystemPause.pauseAll()`; unpause once incident resolved.
- **Rollback/upgrade:** Deploy new module, transfer ownership to `SystemPause`, run `SystemPause.setModules` with the replacement.
- **Parameter correction:** Encode setter calldata and execute via `SystemPause.executeGovernanceCall` or batch through `OwnerConfigurator`.

The runbook keeps the deployment path deterministic, observable, and reversible, empowering a non-technical operator to ship the `$AGIALPHA` labor lattice with full owner control intact.
