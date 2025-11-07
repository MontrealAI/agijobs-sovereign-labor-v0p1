# ADR 0001: Safe-Routed System Pause Authority

- Status: Accepted
- Date: 2024-07-05
- Deciders: Sovereign Labor Core Team

## Context
The platform’s emergency brake must freeze the entire labor mesh without allowing any single contract to drift from owner control. Each core module (`JobRegistry`, `StakeManager`, `ValidationModule`, `DisputeModule`, `PlatformRegistry`, `FeePool`, `ReputationEngine`, `ArbitratorCommittee`) exposes `pause`/`unpause` surfaces that are restricted to governance or a delegated pauser. Without a unified router the owner Safe would need to micromanage pauser roles across every module, increasing the chance of configuration skew or timelock delays during incidents.

## Decision
All pause delegation flows through a single `SystemPause` contract owned by the Safe-backed `TimelockController`. `SystemPause` verifies that every managed module is owned by the same governance contract, registers itself as the active pauser, and exposes atomic `pauseAll` / `unpauseAll` commands. A guardian Safe address is recorded as the delegated pauser, letting emergency responders freeze the system without touching governance privileges. The router also exposes `executeGovernanceCall` for bounded module-level instructions, ensuring that ad-hoc rewiring still originates from the Safe and is recorded on-chain with the executed selector.

## Consequences
- ✅ **Consistency.** Pauser rotation happens in one transaction and can be re-applied automatically after module upgrades. No module can retain a stale pauser once the router is refreshed.
- ✅ **Operational speed.** Incident responders only sign one transaction to freeze or resume the network. Guardian Safe retains limited permissions, minimising blast radius.
- ⚠️ **Router dependency.** If `SystemPause` is misconfigured the whole mesh can become unpausable. Mitigated by constructor ownership checks, CI governance surface tests, and deployment runbooks that pin module addresses.
- ❌ **Single router compromise.** A hostile takeover of `SystemPause` could pause or rewire the ecosystem. Because the contract is Safe-owned and emits every mutation via events, the same compromise would already imply Safe loss which is an accepted systemic risk.

## Alternatives Considered
1. **Direct pauser delegation per module.** Rejected: managing pauser keys across 8+ modules creates drift and increases misconfiguration risk.
2. **Timelock-only pausing.** Rejected: timelock latency is unacceptable for emergency halts and ties up Safe signers with repetitive actions.
3. **Module-level guardians.** Rejected: duplicates logic, complicates auditing, and dilutes observability.

## Verification
- Governance surface audit (`scripts/check-governance-matrix.mjs`) asserts that every module recognises `SystemPause` as pauser and that the Safe retains ownership.
- CI runs Hardhat scenarios that impersonate guardian Safe accounts to validate pause propagation and rewiring.
- Runbook requires operators to capture `ModulesUpdated` and `PausersUpdated` events after every deployment to confirm the routing graph.
