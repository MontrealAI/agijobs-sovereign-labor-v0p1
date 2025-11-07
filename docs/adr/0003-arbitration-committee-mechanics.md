# ADR 0003: Arbitration Committee Mechanics

- Status: Accepted
- Date: 2024-07-05
- Deciders: Sovereign Labor Core Team

## Context
Disputes escalate beyond validator voting when evidence conflicts or deadlines pass. The system needs an escalation path that balances speed, fairness, and owner control. Validators already stake through `StakeManager`, but complex disputes may require human governance oversight via `ArbitratorCommittee` smart contracts with curated membership and slashing authority.

## Decision
We route all escalated disputes through the on-chain `ArbitratorCommittee` referenced by `DisputeModule`. Governance configures moderator weights inside the committee, manages absentee slashing, and defines commit/reveal windows for juror voting. `DisputeModule` can request committee intervention when quorum or reveal requirements fail, and committee resolutions feed back into the registry for final payouts. Governance retains the ability to swap committees, update windows, or slash absentee jurors through Safe proposals.

## Consequences
- ✅ **Deterministic escalation.** Disputes follow a clear path: validator vote → committee escalation → governance finalisation if required.
- ✅ **Observable fairness.** Weighted moderator signatures and committee votes are emitted as events, enabling off-chain auditors to replay decisions.
- ⚠️ **Juror availability risk.** Committee members must remain engaged; absentee slashing and rotation governance mitigate apathy.
- ❌ **Human input dependency.** Complex disputes may require off-chain evidence review, introducing latency that cannot be eliminated in code.

## Alternatives Considered
1. **Fully automated dispute resolution.** Rejected: edge cases require subjective evaluation; automation alone cannot cover fraud, regulatory takedowns, or nuanced burn disputes.
2. **External arbitration services.** Rejected: increases integration risk, reduces deterministic visibility, and creates fragmented governance authority.
3. **Single-governance override.** Rejected: concentrates too much power in the Safe and removes structured escalation steps that validators and platforms expect.

## Verification
- Hardhat and Foundry tests impersonate committee accounts, checking dispute escalations and resolution paths.
- CI governance audit asserts `DisputeModule` exposes setters for committee address and moderator weights, preserving owner control.
- Runbooks require operators to monitor `CommitteeUpdated`, `JurorSlashed`, and dispute resolution events to keep human committees accountable.
