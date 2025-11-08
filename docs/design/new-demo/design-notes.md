# Demo Migration Design Notes

## Original Demo Audit

### Owner CLI Surface
- `scripts/owner-set-treasury.js` is the operator entry point; it loads deployed `OwnerConfigurator`, `StakeManager`, and `SystemPause` instances, then relays a `SystemPause.executeGovernanceCall` that retargets the staking treasury while emitting `ParameterUpdated` telemetry for the owner console.
- `package.json` exposes the owner guardrails as npm scripts (`ci:governance`, multi-runtime tests, targeted deploy commands) so the CLI stays aligned with CI enforcement.
- Runtime configuration for CLI-connected toolchains is centralized in `hardhat.config.js`, `truffle-config.js`, and `foundry.toml`, each pinning `solc 0.8.30`, enabling via-IR, and wiring Safe-controlled network accounts through environment variables.

### Job Lifecycle Pipeline
- `migrations/1_deploy_kernel.js` composes the kernel: deploying Job/Stake/Validation/Dispute modules, wiring identity + treasury pointers, and enforcing `$AGIALPHA` metadata before Safe ownership is accepted. Follow-on scripts (`2_register_pause.js`, `3_mainnet_finalize.js`) snapshot guardianship and validate final wiring.
- `deploy/config.mainnet.json` drives the lifecycle scripts with declarative parameters (Safe addresses, staking thresholds, fee splits, ENS anchors, and tax metadata) that the loader validates before any broadcast.
- The Job Registry contract exposes the lifecycle primitives (`createJob*`, acknowledgement, application, and dispute hooks) that the demo scripts exercise, with reward escrow routed through the Stake Manager and fee accounting locked to `$AGIALPHA` economics.

### Telemetry & Governance Glue
- `scripts/check-governance-matrix.mjs` parses Truffle artifacts to assert that every privileged setter/pauser/event remains reachable through `SystemPause` and the module surface area, blocking drift before owners sign payloads.
- `scripts/verify-artifacts.js` guarantees compile artifacts exist, match `solc 0.8.30`, and remain fresher than their Solidity sources while emitting Markdown summaries for evidence archives.
- `scripts/write-compile-summary.js` captures Node/npm/Truffle/Solidity fingerprints into `$GITHUB_STEP_SUMMARY`, ensuring telemetry parity between local runs and CI.

## v0p1 Kernel Cross-Reference
- **Configuration plane:** `contracts/admin/OwnerConfigurator.sol` batches owner-authorized mutations and tags each change with module/parameter identifiers for downstream analytics.
- **Governance router:** `contracts/SystemPause.sol` centralizes module ownership, exposes `executeGovernanceCall`, and performs cascade `pauseAll` / `unpauseAll` operations guarded by the owner Safe.
- **Labor core:** `contracts/JobRegistry.sol`, `StakeManager.sol`, `ValidationModule.sol`, `DisputeModule.sol`, and `FeePool.sol` coordinate job creation, staking, validation, dispute resolution, and treasury routing with reward escrow locked to `$AGIALPHA` and owner-tunable parameters.
- **Identity & reputation:** `IdentityRegistry.sol`, `AttestationRegistry.sol`, `ReputationEngine.sol`, and `CertificateNFT.sol` connect ENS proofs, Merkle roots, scoring, and credential issuance for agent onboarding.
- **Policy shell:** `TaxPolicy.sol` and `Thermostat.sol` encapsulate compliance metadata and incentive tuning that the owner can retarget via the governance surface.

## Migration Matrix
| Original component | Responsibilities | New kernel interface |
| --- | --- | --- |
| Owner CLI (`scripts/owner-set-treasury.js`) | Safe-friendly helper to rotate treasuries and emit operator telemetry. | `OwnerConfigurator.configure` → `SystemPause.executeGovernanceCall` → `StakeManager.setTreasury` with `ParameterUpdated` events for auditing. |
| Governance guard (`scripts/check-governance-matrix.mjs`) | Ensures privileged setters, pausers, and events stay exposed before signing. | Compare ABI of `SystemPause`, `JobRegistry`, `StakeManager`, `ValidationModule`, `DisputeModule`, `PlatformRegistry`, `FeePool`, `ReputationEngine`, and `ArbitratorCommittee` against expected selectors/events. |
| Artifact verifier (`scripts/verify-artifacts.js`) | Validates Truffle build outputs and surfaces size telemetry. | Truffle artifacts generated from `contracts/` canon; enforcement keeps `solc 0.8.30` parity and feeds evidence vaults. |
| Compile telemetry (`scripts/write-compile-summary.js`) | Captures toolchain fingerprints for CI + operator parity. | Step summary appended to governance workflows consuming `package.json` npm scripts. |
| Lifecycle migrations (`migrations/*.js`) | Deploy kernel, register pause lattice, finalize ownership & `$AGIALPHA` invariants. | Module constructors + governance hand-off in `SystemPause`, `OwnerConfigurator`, `StakeManager`, `JobRegistry`, `ValidationModule`, `DisputeModule`, `FeePool`, `ReputationEngine`, `PlatformRegistry`, `IdentityRegistry`, `AttestationRegistry`, `CertificateNFT`, `TaxPolicy`, `ArbitratorCommittee`. |
| Config manifest (`deploy/config.mainnet.json`) | Declarative Safe, treasury, ENS, staking, and tax configuration. | Parsed by `scripts/deploy/load-config.js`, feeding deployments and ensuring `$AGIALPHA` address/decimals correctness. |
| Job lifecycle flows (demo expectations) | Open jobs, acknowledge tax policy, stake rewards, route disputes. | `JobRegistry.createJob*`, `_applyForJob`, staking escrow via `StakeManager.lockReward`, and dispute escalation through `ValidationModule`/`DisputeModule`. |
| Telemetry docs (`docs/operations/*.md`) | Operator-facing instructions for pause, treasury rotation, identity refresh. | Map to `SystemPause.pauseAll/unpauseAll`, `StakeManager.setTreasury`, `FeePool.setTreasury`, `IdentityRegistry` setters, and supporting CI guardrails. |
