# Core Contract Design Notes

These notes condense the executable specifications embedded in the Sovereign Labor core contracts. They trace state, invariants, privileged control, adversarial considerations, and the off-chain semantics that indexers must consume to keep auxiliary services synchronised.

## JobRegistry

### State Variables
- `nextJobId`: Sequential identifier for new jobs; monotonic and never reused. Tracks the canonical job timeline.
- `jobs`: Packed lifecycle record storing employer, agent, escrow, hashes, and encoded metadata (state, deadlines, fee splits, success flag).
- `pendingValidationEntropy` / `validationStartPending`: Captures pre-selection entropy and whether validator launch awaits RANDAO fulfilment to prevent manipulation.
- `reputationProcessed`: Marks jobs whose outcomes have been applied to the reputation engine once to avoid double counting.
- `employerStats`, `activeJobs`, `maxActiveJobsPerAgent`: Bound per-employer and per-agent concurrency to honour capacity ceilings and DoS limits.
- Module links: `validationModule`, `stakeManager`, `reputationEngine`, `disputeModule`, `certificateNFT`, `auditModule`, `taxPolicy`, `feePool`, `identityRegistry` – every privileged external dependency is referenced explicitly and emitted when reconfigured.
- Governance delegates: `treasury`, `pauser`, `pauserManager`, and `acknowledgers` maintain the owner’s operational reach, including delegated pause rights and tax acknowledger rotation.
- Agent attestation cache: `agentAuthCache`, `agentAuthExpiry`, `agentAuthVersion`, `agentAuthCacheVersion`, `agentAuthCacheDuration`, and `agentSubdomains` accelerate identity checks without sacrificing revocation.
- Economic parameters: `jobStake`, `minAgentStake`, `feePct`, `maxJobReward`, `maxJobDuration`, `validatorRewardPct`, `expirationGracePeriod` codify deterministic staking and payout envelopes for every posting.

### Invariants
- Jobs advance through `State` in a strictly forward manner; reverting paths guard against state regression and replays.
- Every stake, fee, and reward path is denominated in `$AGIALPHA` with 18 decimals; mismatches revert through `StakeManager` and `FeePool` checks.
- Employers and agents must acknowledge the active tax policy prior to funding or claiming, ensuring the owner-governed compliance surface is observed.
- Validator selection requires minimum entropy contributors and respects the configured commit/reveal windows from `ValidationModule` to avoid committee manipulation.
- Maximum reward, duration, and active job caps are enforced to protect treasury balances and validator bandwidth.
- Audit callbacks never revert the primary flow; failures emit `AuditModuleCallbackFailed` and are recoverable off-chain without halting payouts.

### Privileged Functions & Threat Model
- Module setters (`setValidationModule`, `setStakeManager`, `setReputationEngine`, `setDisputeModule`, `setCertificateNFT`, `setAuditModule`, `setFeePool`, `setIdentityRegistry`, `setTaxPolicy`) are `onlyGovernance`. Threat: stale module references; mitigated by emit logs and CI governance matrix.
- Economic tuners (`setJobParameters`, `setMaxActiveJobsPerAgent`, `setValidatorRewardPct`, `applyConfiguration`) restricted to governance to prevent unauthorized fee/grace shifts.
- Treasury and pauser delegates (`setTreasury`, `setPauser`, `setPauserManager`, `setAcknowledger`) require governance to keep pause and acknowledgement power under Safe supervision.
- Cache controls (`bumpAgentAuthCacheVersion`, `setAgentAuthCacheDuration`, `setAgentSubdomain`) restricted to governance or delegated acknowledgers; threat: stale identity data; mitigated by versioning and expiry.
- `pause`/`unpause` restricted to governance or delegated pauser; threat: global job freeze/DoS; mitigated through Safe-run SystemPause with guardian keys.

### Events & Off-chain Semantics
- `ModuleUpdated` family: Mirror the precise address change for every dependency so automation can reconcile wiring instantly.
- `JobFunded`, `JobCreated`, `ApplicationSubmitted`, `AgentAssigned`, `ResultSubmitted`, `JobCompleted`, `JobPayout`, `JobFinalized`, `JobCancelled`: Provide a full audit trail for job lifecycle analytics, escrow accounting, and certificate minting triggers.
- `TaxAcknowledged` and `AcknowledgerUpdated`: Drive tax-policy compliance dashboards and prove acknowledgement text immutability.
- `ValidationStartPending` / `ValidationStartTriggered`: Signal oracles that commit–reveal scheduling has begun to coordinate validator clients.
- `BurnReceiptSubmitted`, `BurnConfirmed`, `BurnDiscrepancy`: Enable off-chain confirmation of carbon- or burn-proof receipts before payouts finalize.
- `GovernanceFinalized`: Broadcasts forced resolution (e.g., after disputes) so derivative markets or insurance wrappers can settle consistently.

### Threat Posture
Governance is a Safe-controlled `TimelockController`. Attackers must compromise the Safe, pauser, and acknowledger delegates simultaneously to hijack operations. All token flows pull from `StakeManager` and `FeePool`, so the registry never custodies stray ERC-20s or ether; untrusted calls are guarded by reentrancy checks and state gating. Guardian Safe can pause via `SystemPause` if malicious proposals attempt to rewire modules.

## StakeManager

### State Variables
- Immutable `token` binding to `$AGIALPHA`; decimal check ensures contract cannot be initialised with a mismatched asset.
- Percent tuners (`feePct`, `burnPct`, `validatorRewardPct`, slash splits) orchestrate how slashed stake and rewards route between fee pool, treasury, employers, operators, and burns.
- Module links: `feePool`, `treasury`, `jobRegistry`, `validationModule`, `disputeModule`, plus allowlists (`treasuryAllowlist`, `validatorLockManagers`).
- Stake ledgers: nested mappings `stakes`, `totalStakes`, `totalBoostedStakes`, `boostedStake`, `lockedStakes`, `unlockTime`, `jobEscrows`, `operatorRewardPool`, `validatorStakeLocks`, and unbond queues with jail flags.
- Configuration caps: `minStake`, per-role overrides, `maxStakePerAddress`, `unbondingPeriod`, `maxAGITypes`, `maxValidatorPoolSize`, thermostat/hardening feeds.

### Invariants
- Deposits, withdrawals, and slashes always conserve total supply across fee, burn, treasury, and validator pools; events emit exact deltas.
- Unbonding respects `unbondingPeriod`; withdrawals before unlock revert, preventing race attacks.
- Validator stake locks cannot be bypassed: only job registry and validation module may lock/unlock with strict accounting against `validatorStakeLocks`.
- Governance-set percentages must sum within configured maxima (`MaxTotalPayoutPct`) so distributions never exceed 100% of slashed amounts.
- Burn operations target `BURN_ADDRESS` and verify burnable interface before invoking to avoid accidental burns on non-burnable tokens.

### Privileged Functions & Threat Model
- Module setters (`setFeePool`, `setDisputeModule`, `setValidationModule`, `setJobRegistry`) are governance-only; threat: redirecting slashes/payouts to attacker; mitigated by Safe control and SystemPause cross-checks.
- Economic knobs (`setTreasury`, `setTreasuryAllowlist`, `setMinStake`, `setRoleMinimum`, `setPercentages`, `setOperatorRewardPool`, `setUnbondingPeriod`, `setMaxStakePerAddress`, `applyConfiguration`) require governance. Each emits and is captured by governance audit script.
- Pauser operations allow governance-designated operator to halt staking functions rapidly.
- Thermostat/Hamiltonian feeds used for auto-stake tuning are governance-controlled to prevent malicious auto-boost manipulations.

### Events & Off-chain Semantics
- Stake flow events (`StakeDeposited`, `StakeWithdrawn`, `WithdrawRequested`, `StakeEscrowLocked`, `StakeReleased`, `RewardPaid`) feed treasury accounting, validator dashboards, and job escrow monitors.
- Slash events (`StakeSlashed`, `GovernanceSlash`, `SlashDistributionUpdated`, `SlashPercentsUpdated`, `JurorSlashed`) provide structured data for risk assessment and auditing.
- Configuration broadcasts (`ParametersUpdated`, `MinStakeUpdated`, `PauserUpdated`, `FeePctUpdated`, `BurnPctUpdated`, `ValidatorRewardPctUpdated`) allow off-chain agents to update UI thresholds instantly.
- `RewardValidator`, `OperatorSlashShareAllocated`, `RewardPoolUpdated` coordinate validator payouts and operator incentive reporting.

### Threat Posture
StakeManager is the economic vault. Reentrancy guards, pausable modifiers, and explicit role-based checks ensure only registered modules touch escrow. Treasury addresses must be allowlisted, blocking accidental leaks. Because governance can rotate fee pools, dispute modules, and treasuries via Safe-managed proposals, the owner retains absolute control while SystemPause can freeze staking in emergencies.

## ValidationModule

### State Variables
- Cross-module links: `jobRegistry`, `stakeManager`, `reputationEngine`, `identityRegistry`, `randaoCoordinator`.
- Commit–reveal timing: `commitWindow`, `revealWindow`, `forceFinalizeGrace`, `validatorsPerJob`, `minValidators`, `maxValidators`, `maxValidatorsPerJob`.
- Approval and slashing thresholds: `validatorSlashingPercentage`, `approvalThreshold`, `requiredValidatorApprovals`, `revealQuorumPct`, `minRevealValidators`, `autoApprovalTarget`.
- Validator pool metadata: `validatorPool`, `validatorPoolSampleSize`, `maxValidatorPoolSize`, `selectionStrategy`, `validatorPoolRotation`.
- Identity cache: `validatorAuthCache`, `validatorAuthExpiry`, `validatorAuthVersion`, `validatorAuthCacheVersion`, `validatorAuthCacheDuration`, `validatorSubdomains`.
- Per-job storage: `rounds`, `failoverStates`, `commitments`, `revealed`, `votes`, `validatorStakes`, `validatorStakeLocks`, `jobNonce`, `pendingEntropy`, `selectionBlock`, `entropyContributorCount`, `entropyRound`, `selectionSeeds`.

### Invariants
- Each job round can only be initialised once until reset; `validators` arrays remain immutable post-selection to prevent retroactive committee edits.
- Entropy contributions require distinct addresses per round and enforce a minimum count, resisting single-party bias.
- Commitments and reveals enforce deadlines, preventing late information leakage. Reveal quorum and approval thresholds guard against minority capture.
- Validator bans and penalties persist for configured blocks, ensuring slashed validators cannot immediately rejoin committees.
- Modules may only be set while unpaused and when addresses are non-zero contracts; misconfiguration reverts.

### Privileged Functions & Threat Model
- Owner (Safe via SystemPause) configures modules, pool parameters, timing, thresholds, randomisation strategy, RANDAO coordinator, identity registry, and pauser delegates. Attack scenario: degrade quorum to rubber-stamp results; mitigated by governance oversight and CI detection of suspicious threshold shifts.
- Pauser and pauserManager can halt operations, buying time to remediate validator issues.
- `resetJobNonce`, `forceFinalize`, `applyFailover` restricted to governance or job registry, preventing unauthorized failover or re-selection.

### Events & Off-chain Semantics
- `ValidatorsUpdated`, `SelectionSeedRecorded`, `ValidatorPoolRotationUpdated`: feed committee dashboards, enable reproducible selection verification.
- `CommitWindowUpdated`, `RevealWindowUpdated`, `ApprovalThresholdUpdated`, `RevealQuorumUpdated`: signal operator clients to adjust timers and thresholds.
- `ValidatorIdentityVerified`, `ValidatorAuthCacheVersionBumped`: keep identity services in sync with cache invalidations.
- `SelectionReset`, `JobNonceReset`, `Failover` events allow watchers to reconcile committee restarts and escalate if frequent resets appear.

### Threat Posture
ValidationModule relies on time-bound commit–reveal and deterministic randomness. Attackers attempt to bias randomness, with defences including XOR entropy, RANDAO integration, and minimum contributors. The owner can rotate pausers and validators, flush caches, or extend windows via Safe governance. Unauthorized ether deposits revert, preventing stuck funds.

## DisputeModule

### State Variables
- Module links: `jobRegistry`, `stakeManager`, `committee` (arbitration contract), `taxPolicy`.
- Economic knobs: `disputeFee`, `disputeWindow`.
- Governance delegates: `pauser`, `pauserManager`.
- Dispute ledger: `disputes` mapping storing claimant, timestamp, fee, evidence hash, reason string.
- Moderator governance: `moderatorWeights`, `totalModeratorWeight` to weight multi-sig approvals.

### Invariants
- Only one active dispute per job; raising a second while unresolved reverts.
- Dispute resolution cannot occur before `disputeWindow` passes unless committee override occurs per rules.
- Moderator approvals require aggregated weight to meet quorum, preventing single-moderator capture.
- Tax policy must be explicitly acknowledged; non-exempt policies revert to prevent misconfiguration.

### Privileged Functions & Threat Model
- Governance controls module wiring (`setJobRegistry`, `setStakeManager`, `setCommittee`), economics (`setDisputeFee`, `setDisputeWindow`), pausers, moderators, and tax policy. Threat: malicious committee or zero fee enabling spam; mitigated by Safe oversight and event visibility.
- Committee-based overrides and governance escalations can finalise disputes; misuse is limited to Safe signers.
- Pauser/pauserManager can freeze dispute intake to halt attack floods.

### Events & Off-chain Semantics
- `DisputeRaised`, `DisputeResolved`, `EvidenceSubmitted`: Primary timeline for dispute lifecycle; indexers use these to trigger UI updates and evidence retrieval.
- `DisputeFeeUpdated`, `DisputeWindowUpdated`, `ModeratorUpdated`: Provide governance telemetry for economic and quorum adjustments.
- `JurorSlashed`: Signals validator penalties derived from dispute outcomes.
- `TaxPolicyUpdated`: Off-chain compliance monitors ingest this to notify participants.

### Threat Posture
DisputeModule holds no ether and routes token fees through StakeManager, reducing custody risk. Moderator approvals use EIP-712 typed data, verified against weight tables to prevent signature replay. Governance retains override ability via Safe, and SystemPause can pause if dispute spam emerges.

## SystemPause

### State Variables
- Module references for every core subsystem (`jobRegistry`, `stakeManager`, `validationModule`, `disputeModule`, `platformRegistry`, `feePool`, `reputationEngine`, `arbitratorCommittee`).
- `activePauser` caches the delegated pauser propagated across modules.

### Invariants
- Each module must be owned by the same governance before wiring; `_requireModuleOwnership` reverts otherwise, ensuring a consistent Safe-controlled perimeter.
- Governance calls executed through `executeGovernanceCall` require known targets; selectors are emitted for forensic tracing.

### Privileged Functions & Threat Model
- Governance can retarget modules, refresh pausers, propagate failovers, and execute bounded calls into owned modules. The attack vector is misrouting modules to malicious implementations; mitigated by Safe approval and module ownership verification.
- Guardian Safe (via delegated pauser) can call `pauseAll`/`unpauseAll`, freezing or restoring the network in one transaction.

### Events & Off-chain Semantics
- `ModulesUpdated`, `PausersUpdated`, `GovernanceCallExecuted`, `ValidationFailoverForwarded`: Provide centralised telemetry for pause state, module rewiring, and failover operations.

### Threat Posture
SystemPause is the owner’s cockpit. It rejects unknown governance targets and verifies ownership, preventing privilege escalation through spoofed contracts. Reentrancy guard blocks nested pause storms.

## FeePool

### State Variables
- Immutable `$AGIALPHA` `token`; constructor asserts 18 decimals.
- Governance-managed destinations: `treasury`, `burnAddress`, `jobRegistry`, `stakeManager`, `taxPolicy`.
- Reward authorisation: `rewardRoles` mapping to throttle automated distributors.
- Accounting: `rewards` mapping, `totalRewards`, `pendingBurn`, `pendingTreasury`, `pendingTax`.
- Delegates: `pauser`, `pauserManager`.

### Invariants
- Deposits and withdrawals balance across treasury, burn, and reward buckets; `pendingBurn` and `pendingTreasury` cannot be withdrawn without governance intent.
- Only allowlisted reward roles may withdraw assigned rewards; unauthorized calls revert.
- Token decimals validated at deployment; any token upgrade requiring decimals change necessitates new deployment.

### Privileged Functions & Threat Model
- Governance sets treasury, tax policy, burn sink, reward roles, and pausers. Threat: redirecting rewards; mitigated by Safe gating and event logs.
- `sweep` and `allocate` functions require governance or authorized roles to prevent arbitrary transfers.

### Events & Off-chain Semantics
- `RewardAllocated`, `RewardClaimed`, `TreasuryDrained`, `BurnScheduled`, `BurnExecuted`, `PauserUpdated`: Mirror every movement for auditors and automated burners.

### Threat Posture
FeePool never holds ether and only interacts with the canonical token. Reward roles can be revoked instantly. Guardian can pause in emergencies.

## PlatformRegistry & ReputationEngine (Highlights)

### PlatformRegistry
- State: links to `stakeManager`, `reputationEngine`, `taxPolicy`, plus registrar delegates, platform metadata, and staking thresholds.
- Invariants: platform registrations require stake lock and tax acknowledgement; operator lists cannot be pruned without governance.
- Privileged control: governance adjusts minimum stake, registrars, module links, and pause delegates.
- Events: `PlatformRegistered`, `PlatformUpdated`, `PlatformSlashed`, `PauserUpdated`, `ConfigurationApplied` – consumed by onboarding dashboards.

### ReputationEngine
- State: scoring weights, caller allowlist, stake manager link, tax policy ack storage, blacklist flags.
- Invariants: only allowlisted scoring callers may mutate reputation; blacklisted addresses blocked from accrual.
- Privileged control: governance updates weights, allowed callers, pausers, and policy references.
- Events: `ScoreApplied`, `ScoreReset`, `BlacklistUpdated`, `WeightUpdated`, `CallerAuthorized`, `PauserUpdated` – analytics consume to render trust scores.

## Identity Surfaces

- `IdentityRegistry` retains ENS-based registries, Merkle roots for agents/validators/club members, and pause delegates. Governance rotates roots and registrars; events `MerkleRootUpdated`, `RegistrarUpdated`, `PauserUpdated` signal attestation watchers.
- `AttestationRegistry` anchors ENS controller integration; events `AttestationMinted`, `ControllerSet` keep ENS wrappers aligned.
- `ENSIdentityVerifier` cross-checks ENS name ownership; stateless except for ENS registry references that governance can retarget.

These modules uphold the same invariants: Safe-governed setters, delegated pausers, and zero ether custody.

---

The design lattice ensures the owner retains absolute, transparent command. Every privileged mutation emits structured telemetry and is enforced in CI via the governance surface audit so green builds equate to unchanged control guarantees.
