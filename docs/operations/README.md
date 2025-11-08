# Sovereign Operations Atlas

[![Sovereign Compile](https://img.shields.io/github/actions/workflow/status/agijobs/agijobs-sovereign-labor-v0p1/ci.yml?branch=main&label=Sovereign%20Compile&logo=github&style=for-the-badge)](https://github.com/agijobs/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml)
[![Branch Gatekeeper](https://img.shields.io/github/actions/workflow/status/agijobs/agijobs-sovereign-labor-v0p1/branch-checks.yml?branch=main&label=Branch%20Gatekeeper&logo=github&style=for-the-badge)](https://github.com/agijobs/agijobs-sovereign-labor-v0p1/actions/workflows/branch-checks.yml)
[![Security Scans](https://img.shields.io/github/actions/workflow/status/agijobs/agijobs-sovereign-labor-v0p1/security.yml?branch=main&label=Security%20Scans&logo=dependabot&style=for-the-badge)](https://github.com/agijobs/agijobs-sovereign-labor-v0p1/actions/workflows/security.yml)
[![AGIALPHA Spine](https://img.shields.io/badge/$AGIALPHA-0xa61a3b3a130a9c20768eebf97e21515a6046a1fa-5522aa?style=for-the-badge)](https://etherscan.io/token/0xa61a3b3a130a9c20768eebf97e21515a6046a1fa)

> The operations atlas is the friendly pilot manual for the unstoppable labor engine. Every operator action—from pausing the mesh to rotating treasuries—routes through the owner Safe with deterministic, observable outcomes.

---

## Table of contents

1. [Operator command map](#operator-command-map)
2. [Non-technical control loops](#non-technical-control-loops)
3. [Owner playbooks](#owner-playbooks)
4. [Telemetry capture](#telemetry-capture)
5. [Evidence archive schema](#evidence-archive-schema)

---

## Operator command map

```mermaid
flowchart LR
    subgraph Safe[Owner Safe]
        queue[Queue transaction]
        confirm[Confirm & execute]
    end
    subgraph SystemPause
        pauseAll[PauseAll]
        resume[UnpauseAll]
        batch[ExecuteGovernanceCall]
    end
    subgraph Modules
        stake[StakeManager]
        fee[FeePool]
        job[JobRegistry]
        identity[IdentityRegistry]
        attest[AttestationRegistry]
        dispute[DisputeModule]
        platform[PlatformRegistry]
        rep[ReputationEngine]
        committee[ArbitratorCommittee]
        tax[TaxPolicy]
    end
    queue -->|OwnerConfigurator manifests| batch
    confirm --> pauseAll
    confirm --> resume
    batch --> stake
    batch --> fee
    batch --> job
    batch --> identity
    batch --> attest
    batch --> dispute
    batch --> platform
    batch --> rep
    batch --> committee
    batch --> tax
    pauseAll -->|Events + Step summaries| log[Evidence Vault]
    resume --> log
    stake --> log
    fee --> log
    job --> log
    identity --> log
    attest --> log
    dispute --> log
    platform --> log
    rep --> log
    committee --> log
    tax --> log
    classDef safe fill:#14213d,stroke:#fca311,color:#f1faee;
    classDef system fill:#0b132b,stroke:#1c2541,color:#ffffff;
    classDef modules fill:#1b4332,stroke:#2d6a4f,color:#f1faee;
    class queue,confirm safe;
    class pauseAll,resume,batch system;
    class stake,fee,job,identity,attest,dispute,platform,rep,committee,tax modules;
```

---

## Non-technical control loops

The [`docs/operations/owner-control.md`](owner-control.md) playbook provides narrated, copy-paste ready sequences for guardians and owners:

- **Emergency pause / resume.** One-click OwnerConfigurator bundles that pause or resume the entire lattice.
- **Treasury rotation.** Update staking treasuries, burn splits, and reward allowlists without touching raw calldata.
- **Parameter tuning.** Adjust validator quorum, slash basis points, dispute windows, and identity roots using pre-built JSON manifests.
- **Identity onboarding.** Publish new ENS nodes and Merkle roots with transparent event logs.

Hardhat proof-of-control: running `npm run test:hardhat` executes the SystemPause governance lattice spec so operators confirm treasuries, TaxPolicy text, and guardian pausers remain under Safe control before executing production flows.

Every sequence mirrors CI governance checks and reuses the same `$AGIALPHA` manifest validation.

---

## Owner playbooks

| Scenario | Artifact | Summary |
| --- | --- | --- |
| Pause / resume mesh | [`owner-control.md`](owner-control.md#global-pause-and-resume) | Guardian and owner Safe instructions with safety checks and telemetry expectations. |
| Rotate treasuries | [`owner-control.md`](owner-control.md#treasury-rotation) | Update StakeManager and FeePool treasuries while preserving burn splits. |
| Update validator policy | [`owner-control.md`](owner-control.md#validator-policy-tuning) | Increase quorum, adjust job stakes, and refresh validator allowlists with step-by-step validation. |
| Refresh identity | [`owner-control.md`](owner-control.md#identity-refresh) | Publish new ENS hashes and Merkle roots with Safe transaction templates. |

---

## Telemetry capture

1. **Manifest logs.** Every OwnerConfigurator run produces a Markdown summary; commit those under `manifests/governance/` or attach to the Safe transaction comments.
2. **Event trail.** Subscribe to `ModulesUpdated`, `PausersUpdated`, `GovernanceCallExecuted`, and module-specific events; the playbook lists expected emissions for each flow.
3. **CI mirror.** After executing a control action, rerun `npm run ci:governance` and `npm run test:truffle:ci` to prove the governance matrix and invariants remain intact.
4. **Evidence vault.** Store Safe transaction hashes, CLI logs, and GitHub Action URLs in your evidence vault for auditors.

---

## Evidence archive schema

```json
{
  "timestamp": "2024-05-01T12:34:56Z",
  "operator": "owner-safe",
  "action": "stakeManager.setTreasury",
  "transactionHash": "0x...",
  "safeUrl": "https://app.safe.global/transactions/...",
  "commands": [
    "npm run test:truffle:ci",
    "npm run test:hardhat",
    "npm run test:foundry",
    "npm run ci:governance"
  ],
  "manifests": [
    "manifests/addresses.mainnet.json",
    "manifests/governance/2024-05-01-treasury-rotation.md"
  ],
  "notes": "Treasury rotated to 0x1234… after council approval."
}
```

Keep this schema under version control or your preferred compliance vault so every configuration change is auditable and reproducible.
