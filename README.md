# AGIJobs Sovereign Labor v0.1

[![Sovereign Compile](https://img.shields.io/github/actions/workflow/status/MontrealAI/agijobs-sovereign-labor-v0p1/ci.yml?branch=main&label=Sovereign%20Compile&logo=github&style=for-the-badge)](https://github.com/MontrealAI/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml)
[![Security Scans](https://img.shields.io/github/actions/workflow/status/MontrealAI/agijobs-sovereign-labor-v0p1/security.yml?branch=main&label=Security%20Scans&logo=dependabot&style=for-the-badge)](https://github.com/MontrealAI/agijobs-sovereign-labor-v0p1/actions/workflows/security.yml)
[![Branch Gatekeeper](https://img.shields.io/github/actions/workflow/status/MontrealAI/agijobs-sovereign-labor-v0p1/branch-checks.yml?branch=main&label=Branch%20Gatekeeper&logo=github&style=for-the-badge)](https://github.com/MontrealAI/agijobs-sovereign-labor-v0p1/actions/workflows/branch-checks.yml)
![Branch Protection](https://img.shields.io/badge/Branch%20Protection-enforced-6f2dbd?logo=github&style=for-the-badge)
[![$AGIALPHA Canon](https://img.shields.io/badge/$AGIALPHA-0xa61a3b3a130a9c20768eebf97e21515a6046a1fa-5522aa?style=for-the-badge)](https://etherscan.io/token/0xa61a3b3a130a9c20768eebf97e21515a6046a1fa)
![Node.js 20.x](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white&style=for-the-badge)
![solc 0.8.25](https://img.shields.io/badge/solc-0.8.25-363636?logo=ethereum&style=for-the-badge)
![Truffle 5.11.5](https://img.shields.io/badge/Truffle-5.11.5-5e464d?logo=truffle&style=for-the-badge)
![Hardhat 2.20.1](https://img.shields.io/badge/Hardhat-2.20.1-f2c200?logo=ethereum&style=for-the-badge)
![Foundry stable](https://img.shields.io/badge/Foundry-stable-111111?logo=foundry&style=for-the-badge)
![License MIT](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)

> This repository is the command surface of the labour engine that rewrites global production schedules on demand. Every module, parameter, and pause lever converges so the designated owner can steer, halt, or reconfigure the markets in real time.

---

## Table of Contents
- [Mission Vector](#mission-vector)
- [Constellation Cartography](#constellation-cartography)
- [Owner Dominion](#owner-dominion)
- [$AGIALPHA Canon](#agialpha-canon)
- [Repository Atlas](#repository-atlas)
- [Operational Flight Deck](#operational-flight-deck)
- [Quality and Security Mesh](#quality-and-security-mesh)
- [Deployment Autopilot](#deployment-autopilot)
- [Documentation & Demo Orbits](#documentation--demo-orbits)
- [Support & Contribution Protocol](#support--contribution-protocol)

---

## Mission Vector

- **Total owner primacy.** Governance flows through [`contracts/admin/OwnerConfigurator.sol`](contracts/admin/OwnerConfigurator.sol) and [`contracts/SystemPause.sol`](contracts/SystemPause.sol), letting the owner batch-govern, pause, resume, or retarget any subsystem instantly.
- **Identity truthfulness.** Identity issuance and attestation, orchestrated by [`contracts/IdentityRegistry.sol`](contracts/IdentityRegistry.sol), [`contracts/AttestationRegistry.sol`](contracts/AttestationRegistry.sol), and [`contracts/CertificateNFT.sol`](contracts/CertificateNFT.sol), anchor every validator, employer, and platform to verifiable proofs.
- **Economic steering.** [`contracts/StakeManager.sol`](contracts/StakeManager.sol) and [`contracts/Thermostat.sol`](contracts/Thermostat.sol) channel $AGIALPHA incentives, burn pressure, and staking constraints with Hamiltonian feedback.
- **Global oversight.** [`docs/operations/`](docs/operations) holds non-technical runbooks that mirror the automation surfaces, so operational guardians can execute policies without touching Solidity.

```mermaid
graph TD
    OwnerSafe[[Owner Safe Multisig]] -->|batch directives| OwnerConfigurator
    OwnerConfigurator -->|governance calls| SystemPause
    GuardianSafe[[Guardian Safe]] -->|emergency halt| SystemPause
    SystemPause -->|pause/unpause| ModuleMesh[Labor Modules]
    SystemPause -->|forward| StakeManager
    StakeManager --> Thermostat
    StakeManager --> Hamiltonian[Hamiltonian Feed]
    ModuleMesh --> JobRegistry
    ModuleMesh --> ValidationModule
    ModuleMesh --> DisputeModule
    IdentityHub[[Identity Orbit]] --> IdentityRegistry
    IdentityRegistry --> JobRegistry
    IdentityRegistry --> AttestationRegistry
    CertificateNFT --> JobRegistry
    FeePool --> Treasury
    Treasury -.-> OwnerSafe
    style OwnerConfigurator fill:#03045e,stroke:#4cc9f0,color:#f1faee
    style SystemPause fill:#240046,stroke:#4cc9f0,color:#f1faee
    style ModuleMesh fill:#0b132b,stroke:#3a86ff,color:#f1faee
    style IdentityHub fill:#3a0ca3,stroke:#9d4edd,color:#ffffff
```

---

## Constellation Cartography

```mermaid
mindmap
  root((Sovereign Labor Engine))
    Core Contracts
      Governable(contracts/Governable.sol)
      SystemPause(contracts/SystemPause.sol)
      StakeManager(contracts/StakeManager.sol)
      JobRegistry(contracts/JobRegistry.sol)
      PlatformRegistry(contracts/PlatformRegistry.sol)
    Modules
      Validation(contracts/ValidationModule.sol)
      Dispute(contracts/modules/DisputeModule.sol)
      Reputation(contracts/ReputationEngine.sol)
      Arbitrator(contracts/ArbitratorCommittee.sol)
      TaxPolicy(contracts/TaxPolicy.sol)
    Identity Orbit
      Registry(contracts/IdentityRegistry.sol)
      Attestations(contracts/AttestationRegistry.sol)
      Credentials(contracts/CertificateNFT.sol)
      ENS Verifier(contracts/ENSIdentityVerifier.sol)
    Tooling
      Truffle(truffle/)
      Hardhat(hardhat/)
      Foundry(foundry/)
      Scripts(scripts/)
    Deployment
      Manifests(deploy/)
      Migrations(migrations/)
      Ops Docs(docs/operations/)
    Demonstrations
      Demo Suite(demo/)
```

- **Contracts.** Solidity sources live under [`contracts/`](contracts) with admin access hardened by [`contracts/Governable.sol`](contracts/Governable.sol) and two-step ownership via [`contracts/utils/CoreOwnable2Step.sol`](contracts/utils/CoreOwnable2Step.sol).
- **Runtime parity.** Truffle, Hardhat, and Foundry configurations (`truffle/`, `hardhat/`, `foundry/`) are synchronized so every invariant is exercised under multiple toolchains.
- **Operational intelligence.** Architecture decisions, ADRs, and incident drills live in [`docs/design/`](docs/design), [`docs/adr/`](docs/adr), and [`docs/operations/`](docs/operations).

---

## Owner Dominion

The owner has absolute control over parameter surfaces, routing, and pause levers. Guardians serve strictly as delegated safety brakes.

```mermaid
sequenceDiagram
    participant OwnerSafe
    participant GuardianSafe
    participant OwnerConfigurator
    participant SystemPause
    participant StakeManager
    participant JobRegistry
    participant FeePool
    participant Thermostat
    participant IdentityRegistry
    OwnerSafe->>OwnerConfigurator: configureBatch(governanceCalls)
    OwnerConfigurator->>SystemPause: executeGovernanceCall(target, data)
    SystemPause->>StakeManager: setModules / pauseAll / unpauseAll
    SystemPause->>JobRegistry: refreshConnectors / setCertificate
    SystemPause->>FeePool: setTreasury / setRewardRatios
    GuardianSafe->>SystemPause: pauseAll()
    OwnerSafe->>Thermostat: tuneIssuance()
    OwnerSafe->>IdentityRegistry: setRootIdentity()
    SystemPause-->>OwnerSafe: ModulesUpdated / ParameterUpdated events
```

| Surface | Owner-only controls | Files |
| --- | --- | --- |
| Governance router | `configure`, `configureBatch`, `setSystemPause`, `setGuardians` | [`contracts/admin/OwnerConfigurator.sol`](contracts/admin/OwnerConfigurator.sol) |
| Global pause lattice | `setModules`, `refreshPausers`, `pauseAll`, `unpauseAll`, `executeGovernanceCall` | [`contracts/SystemPause.sol`](contracts/SystemPause.sol) |
| Economic core | Treasury routing, burn ratios, validator lists, slash splits, auto tuning toggles | [`contracts/StakeManager.sol`](contracts/StakeManager.sol), [`contracts/Thermostat.sol`](contracts/Thermostat.sol) |
| Labor registry | Identity anchors, module connectors, fee curves, certificate enforcement | [`contracts/JobRegistry.sol`](contracts/JobRegistry.sol) |
| Validation + dispute | Validator cadence, escalation policy, jail logic | [`contracts/ValidationModule.sol`](contracts/ValidationModule.sol), [`contracts/modules/DisputeModule.sol`](contracts/modules/DisputeModule.sol) |
| Treasury pool | `setTreasury`, `setTreasuryAllowlist`, reward ratios | [`contracts/FeePool.sol`](contracts/FeePool.sol) |
| Identity orbit | Root updates, schema management, credential minting roles | [`contracts/IdentityRegistry.sol`](contracts/IdentityRegistry.sol), [`contracts/AttestationRegistry.sol`](contracts/AttestationRegistry.sol), [`contracts/CertificateNFT.sol`](contracts/CertificateNFT.sol) |
| Compliance | Policy URIs, acknowledgement rules | [`contracts/TaxPolicy.sol`](contracts/TaxPolicy.sol) |

Guardians listed in `SystemPause` can halt the mesh, but only the owner (via `Governable`) can rewire modules, resume operations, or change any parameter. This asymmetry keeps emergency responses subordinate to owner intent.

---

## $AGIALPHA Canon

- **Immutable binding.** `$AGIALPHA` resolves to ERC-20 contract `0xa61a3b3a130a9c20768eebf97e21515a6046a1fa` (18 decimals) through [`contracts/Constants.sol`](contracts/Constants.sol).
- **Runtime assertions.** Constructors in [`contracts/StakeManager.sol`](contracts/StakeManager.sol), [`contracts/FeePool.sol`](contracts/FeePool.sol), and [`contracts/JobRegistry.sol`](contracts/JobRegistry.sol) validate token metadata and revert on mismatch.
- **Deployment guardrails.** [`deploy/config.mainnet.json`](deploy/config.mainnet.json) and scripts in [`scripts/`](scripts) enforce the canonical token address before any production broadcast completes.

---

## Repository Atlas

| Path | Purpose |
| --- | --- |
| [`contracts/`](contracts) | Solidity sources grouped by core, modules, identity, and utilities. |
| [`migrations/`](migrations) | Truffle migration scripts synchronized with deployment manifests. |
| [`deploy/`](deploy) | Network configuration, autopilot docs, and governance manifests. |
| [`truffle/`](truffle) | Truffle-specific helpers and persistent configuration. |
| [`hardhat/`](hardhat) | Hardhat project with dedicated scripts and tests. |
| [`foundry/`](foundry) | Foundry configuration, scripts, and invariant tests. |
| [`scripts/`](scripts) | Governance checks, artifact verification, deployment automation, branch enforcement. |
| [`docs/`](docs) | Design dossiers, ADRs, operator playbooks, and compliance narratives. |
| [`demo/`](demo) | Guided demonstrations of the labor mesh running simulated markets. |

---

## Operational Flight Deck

> **Prerequisites**: Node.js 20.x, npm 10+, Foundry toolchain (`foundryup`), Python 3.11+ for static analysis, and access to the canonical `$AGIALPHA` token metadata.

```bash
# Install dependencies (once per machine)
npm ci --omit=optional --no-audit --no-fund

# Compile contracts with Truffle (disable analytics prompts)
TRUFFLE_TELEMETRY_DISABLED=1 npm run compile
# The compiler always runs with viaIR + optimizer because disabling IR
# triggers stack-too-deep errors in `ValidationModule`. Expect the first
# compile to take a few minutes; cached artifacts keep later runs quick.

# Execute Truffle tests using cached build artifacts
npm run test:truffle:ci

# Execute Hardhat tests
npm run test:hardhat

# Execute Foundry tests (requires forge)
npm run test:foundry

# The Truffle build artifacts now persist under `build/contracts`,
# so `npm test` compiles once and subsequent runs reuse the cached output via
# `--compile-none`. If you need a clean slate (e.g., after editing compiler
# settings), delete that directory before rerunning the suite.

# Governance matrix audit (verifies owner dominance)
npm run ci:governance

# Lint Solidity sources
npm run lint:sol
```

The commands are idempotent and mirror the CI pipeline. Non-technical operators can copy the Safe transaction manifests from [`docs/operations/`](docs/operations) when executing governance routines.

---

## Quality and Security Mesh

```mermaid
timeline
    title CI & Assurance Pipeline
    Checkout : Sovereign Compile (lint, compile, governance audit, multi-runtime tests, actionlint)
    Static Analysis : Security Scans workflow (Slither SARIF + Mythril symbolic execution)
    Branch Policy : Branch Gatekeeper (branch naming guard)
    Enforcement : Branch protection rules on main & develop
```

- **Workflows.** `Sovereign Compile`, `Security Scans`, and `Branch Gatekeeper` run on pushes, pull requests, schedules, and manual dispatches.
- **Artifacts & summaries.** Truffle build artifacts, Slither SARIF reports, and Mythril traces are uploaded for every run with concise summaries in the Actions tab.
- **Branch protection.** `.github/settings.yml` enforces required checks, linear history, admin inclusion, and review requirements on `main` and `develop`.
- **Security depth.** Slither fails on high-severity findings, and Mythril performs bounded symbolic execution across owner-controlled contracts to expose misconfiguration surfaces before deployment.

To reproduce locally:

```bash
# Static analysis
pip install --upgrade pip
pip install 'slither-analyzer==0.11.3' 'crytic-compile==0.3.10'
forge build --build-info --skip '*/foundry/test/**' '*/script/**' --force
slither . --config-file slither.config.json --foundry-out-directory foundry/out

# Mythril symbolic execution (subset)
pip install mythril
myth analyze contracts/SystemPause.sol --solv 0.8.25 \
  --allow-paths contracts,node_modules \
  --solc-remaps @openzeppelin=node_modules/@openzeppelin \
  --execution-timeout 900 --max-depth 32
```

---

## Deployment Autopilot

1. Review [`deploy/config.mainnet.json`](deploy/config.mainnet.json) for Safe addresses, pauser delegates, and `$AGIALPHA` treasury routing.
2. Consult [`deploy/README.md`](deploy/README.md) for workflow-specific broadcast instructions.
3. Choose a runtime:
   - **Truffle:** `npm run deploy:truffle:mainnet`
   - **Hardhat:** `npm run deploy:hardhat:mainnet`
   - **Foundry:** `npm run deploy:foundry:mainnet`
4. Apply owner governance policies via [`scripts/owner-apply-validator-policy.js`](scripts/owner-apply-validator-policy.js) and [`scripts/owner-set-treasury.js`](scripts/owner-set-treasury.js).
5. Record emitted events (`ModulesUpdated`, `ParameterUpdated`, `TemperatureUpdated`) as immutable evidence for compliance and audit trails.

Each autopilot halts if the `$AGIALPHA` constant or token metadata deviates from the canonical configuration, guaranteeing production deployments match the authoritative economic spine.

---

## Documentation & Demo Orbits

- **Operations Runbooks:** [`docs/operations/`](docs/operations) translates every governance and incident response path into Safe-friendly checklists.
- **Architecture & ADRs:** [`docs/design/`](docs/design) and [`docs/adr/`](docs/adr) capture the rationale behind contract interfaces, control flows, and fail-safes.
- **Demo Universe:** [`demo/`](demo) hosts meta-agentic walkthroughs (e.g., `Meta-Agentic-ALPHA-AGI-Jobs-v0`) that simulate validator onboarding, treasury routing, and dispute resolution.

```mermaid
journey
    title Operator Journey
    section Preparation
      Review ops runbooks: 5: Owner Safe
      Confirm guardian status: 4: Guardian Safe
    section Execution
      Submit governance batch: 5: Owner Safe
      Pause/unpause modules: 4: Guardian Safe
      Tune issuance via Thermostat: 5: Owner Safe
    section Evidence
      Archive emitted events: 5: Compliance Cell
      Update audit logs: 4: Compliance Cell
```

---

## Support & Contribution Protocol

- Branch names must satisfy [`scripts/check-branch-name.mjs`](scripts/check-branch-name.mjs); `Branch Gatekeeper` blocks non-compliant branches before other jobs start.
- Pull requests require every mandatory check (compile, tests, security scans, branch guard) before merge. Force pushes and branch deletions on protected branches are disabled.
- Escalations follow the communication playbooks in [`docs/operations/operator-runbook.md`](docs/operations/operator-runbook.md), with findings logged through GitHub Issues.

The sovereign labor engine contained here is engineered to be deployed immediately by the owner: parameters are owner-writeable, guardianship is subordinate, CI is fully green and enforced, and documentation equips non-technical operators to steer a global labor network with precision.
