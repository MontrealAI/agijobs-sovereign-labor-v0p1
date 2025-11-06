# AGIJobs Sovereign Labor v0.1

[![Sovereign Compile](https://github.com/AGIJobs/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AGIJobs/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml)
[![GitHub Checks](https://img.shields.io/github/checks-status/AGIJobs/agijobs-sovereign-labor-v0p1/main?label=Branch%20Checks&logo=github)](https://github.com/AGIJobs/agijobs-sovereign-labor-v0p1/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.30-363636?logo=solidity)
![Truffle](https://img.shields.io/badge/Truffle-5.11.5-5e464d?logo=truffle)
![Security](https://img.shields.io/badge/Security-Protocol%20Grade%20Controls-0b7285)

> The sovereign labor intelligence substrate that silently choreographs global coordination, composability, and owner-level omnipotence.

---

## Table of Contents
- [Mission Vector](#mission-vector)
- [Repository Topology](#repository-topology)
- [System Cartography](#system-cartography)
- [Lifecycle Orchestration](#lifecycle-orchestration)
- [Governance & Control Surfaces](#governance--control-surfaces)
- [Continuous Integration & Release Discipline](#continuous-integration--release-discipline)
- [Operator Playbooks](#operator-playbooks)
- [Development Quickstart](#development-quickstart)
- [Observability Signals](#observability-signals)
- [Directory Atlases](#directory-atlases)

---

## Mission Vector
- **Precision governance.** Every privileged pathway is timelock mediated, auditable, and reversible by the contract owner with deterministic sequencing.
- **Dynamic labor markets.** Registries, staking, validation, and dispute circuits interlock through hardened interfaces to choreograph human and machine job flows.
- **Instant reconfiguration.** Core modules are hot-swappable, pausable, and parameterizable without downtime, empowering the owner to steer incentives in real time.
- **Command singularity.** The mesh behaves as the intelligence engine that shapes economic gravity—deploy once, steer forever.

## Autonomy Field Manual
```mermaid
mindmap
  root((Sovereign Labor Core))
    Control
      Global Pauser
      Governance Timelock
      Owner Console
    Markets
      Job Registry
      Platform Registry
      Fee & Tax Orchestrators
    Signal
      Reputation Engine
      Attestation Lattices
      Certificate NFTs
    Defense
      Validation Mesh
      Dispute Module
      Arbitrator Committee
```

> Every branch of the mindmap is live code in this repository. Each leaf links to a pausable, owner-governed module whose parameters can be remapped mid-flight without forfeiting determinism.

## Repository Topology
| Path | Signal |
| --- | --- |
| `contracts/` | Solidity source for registries, staking, arbitration, attestation, tax policy, and composable modules. |
| `deploy/` | Deployment pipelines and scripted environment bootstraps. |
| `migrations/` | Legacy Truffle migrations for historical compatibility. |
| `truffle/` | Network snapshots, fixtures, and environment shims. |
| `truffle-config.js` | Compiler settings (Solidity 0.8.30 via IR, optimizer, deterministic metadata). |
| `package.json` | Tooling manifest and reproducible build scripts. |
| `.github/workflows/` | Sovereign compile workflow enforcing green pipelines on every push and PR. |

## System Cartography
```mermaid
flowchart TD
    subgraph ControlPlane[Control Plane]
        GOV[Timelock Governance]
        SYS[SystemPause]
        TAX[TaxPolicy]
        TRE[FeePool]
    end
    subgraph LaborMesh[Labor Mesh]
        JR[JobRegistry]
        PR[PlatformRegistry]
        IR[IdentityRegistry]
        SM[StakeManager]
        VM[ValidationModule]
        DM[modules/DisputeModule]
        RE[ReputationEngine]
        AC[ArbitratorCommittee]
    end

    GOV -->|authorizes| SYS
    SYS -->|pauses/resumes| JR & PR & SM & VM & DM & RE & AC & TRE
    SYS -->|treasury routing| TRE
    PR -->|platform onboarding| JR
    IR -->|identity attestations| JR
    SM -->|collateral gates| JR
    VM -->|validation verdicts| JR
    DM -->|dispute resolution| JR
    RE -->|reputation updates| JR
    AC -->|arbitration| DM
    TAX -->|policy drift| TRE

    classDef plane fill:#120c3b,stroke:#7360ff,stroke-width:2px,color:#f8f9ff,font-size:12px;
    classDef mesh fill:#00332f,stroke:#26a69a,stroke-width:2px,color:#f4fff9,font-size:12px;
    class GOV,SYS,TAX,TRE plane;
    class JR,PR,IR,SM,VM,DM,RE,AC mesh;
```

## Lifecycle Orchestration
```mermaid
sequenceDiagram
    autonumber
    participant Governance
    participant SystemPause
    participant Platform
    participant Worker
    participant JobRegistry
    participant ValidationModule
    participant StakeManager
    participant ReputationEngine

    Governance->>SystemPause: Curate pauser + module set
    SystemPause->>JobRegistry: Propagate module delegates
    Platform->>JobRegistry: Register platform metadata
    JobRegistry->>ValidationModule: Dispatch validation hooks
    Worker->>StakeManager: Bond collateral
    Worker->>JobRegistry: Accept job unit
    ValidationModule-->>JobRegistry: Emit verdicts / failovers
    JobRegistry->>ReputationEngine: Update trust vector
    JobRegistry-->>Platform: Route settlement via FeePool
    Governance-->>SystemPause: Pause / resume in emergencies
```

## Governance & Control Surfaces
The owner (timelock governance) retains complete, immediate command over every parameter:

- `SystemPause.setModules(...)` & `refreshPausers()` keep all subsystem references and pauser roles synchronized under a single lever.
- `SystemPause.executeGovernanceCall(...)` forwards arbitrary governance-approved calldata to any managed module while enforcing ownership and pauser invariants.
- `StakeManager` exposes owner-only routines for collateral ratios, reward curves, slash multipliers, and treasury routing, enabling rapid incentive tuning.
- `JobRegistry` governance setters reshape job templates, fee gradients, arbitration policies, and module endpoints without redeploys.
- Each module inherits pausing and ownership surfaces so the owner can stop, resume, or upgrade any flow instantly.

Every critical operation emits rich telemetry events for downstream automation, dashboards, and compliance archives.

## Continuous Integration & Release Discipline
```mermaid
stateDiagram-v2
    [*] --> Checkout
    Checkout --> Toolchain: setup-node@v4
    Toolchain --> Cache : prime npm + truffle caches
    Cache --> Install : npm ci --omit=optional --no-audit --no-fund
    Install --> Compile : npm run compile
    Compile --> [*]
```

- The **Sovereign Compile** workflow gates every push to `main`, `develop`, `feature/**`, and `release/**` as well as all PRs targeting protected branches.
- Caches keep compiler downloads deterministic while `npm ci` enforces lockfile integrity.
- Branch protection checklist:
  1. Require the **Sovereign Compile** check.
  2. Enforce up-to-date merges before PR completion.
  3. Require at least one approving review.
  4. (Optional) Require signed commits for audit-grade provenance.

## Branch Protection Enforcement Blueprint
```mermaid
graph TD
    A[Repository Settings] --> B[Branches]
    B --> C{Select main & develop}
    C --> D[Require status checks]
    D --> D1[[Sovereign Compile]]
    D --> D2[[Peer Review >= 1]]
    C --> E[Require linear history]
    C --> F[Restrict who can push]
    F --> F1[Ops Guardians]
    F --> F2[Automation Bots]
    style D1 fill:#211a6b,stroke:#00d4ff,stroke-width:3px,color:#f2f6ff
    style F1 fill:#0b3e24,stroke:#00d78a,stroke-width:2px,color:#ebfff5
```

- Align GitHub branch protection rules with the diagram to guarantee that every pull request surfaces the Sovereign Compile check, code review, and governance-approved deployers.
- Mirror the same rules on `develop` (or your staging trunk) so that downstream environments inherit identical guardrails.
- Publish the enforcement policy in your Ops knowledge base; the system’s operators should treat it as a non-negotiable security boundary.

## Operator Playbooks
| Scenario | Action Sequence |
| --- | --- |
| Pause entire mesh | Queue `SystemPause.pauseAll()` via timelock, execute after delay, monitor `PausersUpdated` & `ModulesUpdated`. |
| Rotate pauser delegate | Call `SystemPause.setGlobalPauser(newPauser)` to update every module atomically. |
| Swap out validation logic | Deploy new validation module, transfer ownership to `SystemPause`, call `setModules(...)` with the new address. |
| Adjust staking economics | Invoke `StakeManager` governance setters to revise collateral ratios, reward splits, slash multipliers, and escrow managers. |
| Trigger validation failover | `SystemPause.triggerValidationFailover(jobId, action, extension, reason)` extends windows or escalates to disputes. |

## Development Quickstart
```bash
# Clone & bootstrap
git clone https://github.com/AGIJobs/agijobs-sovereign-labor-v0p1.git
cd agijobs-sovereign-labor-v0p1
npm install --omit=optional --no-audit --no-fund

# Deterministic compile
npm run compile

# Interactive sandbox
npx truffle develop
truffle(develop)> migrate
truffle(develop)> test
```

### Environment secrets for live deployment
| Variable | Purpose |
| --- | --- |
| `MAINNET_RPC` | HTTPS RPC endpoint (archive tier recommended). |
| `SEPOLIA_RPC` | Testnet RPC endpoint. |
| `DEPLOYER_PK` | Hex private key (no `0x`). |
| `ETHERSCAN_API_KEY` | Verification API token. |

Deploy with `truffle migrate --network <network>` and verify via `npm run verify:mainnet` once addresses are stable.

## Observability Signals
- `SystemPause.PausersUpdated` & `ModulesUpdated` — authoritative source of control surface state.
- `StakeManager.Slashed`, `RewardClaimed`, `ParametersUpdated` — staking liquidity and risk posture.
- `JobRegistry.JobCreated`, `JobAccepted`, `JobFinalized`, `JobChallenged` — labor flow telemetry.
- `ReputationEngine.ScoreUpdated` — trust dynamics for platforms and workers.

## Directory Atlases
- [`contracts/`](contracts/README.md) – Architecture, storage layout, and module interfaces for every on-chain component.
- [`deploy/`](deploy/README.md) – Deployment pipelines and environment tunables.
- [`truffle/`](truffle/README.md) – Per-network configuration, fixtures, and simulation harnesses.

---

Harness this repository with the discipline it deserves: precision governance, verified automation, and relentless CI keep the labor intelligence engine aligned with its operators.
