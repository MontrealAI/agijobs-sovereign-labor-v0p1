# Sovereign Operator Runbook

[![Sovereign Compile](https://img.shields.io/github/actions/workflow/status/MontrealAI/agijobs-sovereign-labor-v0p1/ci.yml?branch=main&label=Sovereign%20Compile&logo=github&style=for-the-badge)](https://github.com/MontrealAI/agijobs-sovereign-labor-v0p1/actions/workflows/ci.yml)
[![Branch Gatekeeper](https://img.shields.io/github/actions/workflow/status/MontrealAI/agijobs-sovereign-labor-v0p1/branch-checks.yml?branch=main&label=Branch%20Gatekeeper&logo=github&style=for-the-badge)](https://github.com/MontrealAI/agijobs-sovereign-labor-v0p1/actions/workflows/branch-checks.yml)
[![Security Scans](https://img.shields.io/github/actions/workflow/status/MontrealAI/agijobs-sovereign-labor-v0p1/security.yml?branch=main&label=Security%20Scans&logo=dependabot&style=for-the-badge)](https://github.com/MontrealAI/agijobs-sovereign-labor-v0p1/actions/workflows/security.yml)

> This runbook is the execution checklist for owners, guardians, and release pilots. Follow it to prove changes locally, coordinate reviews, land pull requests with clean history, and broadcast upgrades to the network without improvisation.

---

## Table of Contents

1. [Mission checklist](#mission-checklist)
2. [Pre-flight environment](#pre-flight-environment)
3. [Local validation](#local-validation)
4. [Continuous integration sync](#continuous-integration-sync)
5. [Review & approvals](#review--approvals)
6. [Merge & post-merge actions](#merge--post-merge-actions)
7. [Post-merge announcement template](#post-merge-announcement-template)
8. [Reference materials](#reference-materials)

---

## Mission checklist

- ✅ Repository cloned, `.nvmrc` respected, dependencies installed.
- ✅ Contract changes mirrored in design notes or manifests as required.
- ✅ Multi-runtime test suites run locally with results captured in the evidence vault.
- ✅ CI pipelines green or pending with owners notified.
- ✅ Reviewer matrix engaged (owner, guardian, security where applicable).
- ✅ Announcement drafted and scheduled.

Record these confirmations in `manifests/governance/<date>-runbook.md` alongside Safe transaction hashes.

## Pre-flight environment

1. Align Node.js with `.nvmrc` and install dependencies using `npm install`.
2. Install and update Foundry via `foundryup`, ensuring `forge --version` reports the pinned release.
3. Export any secrets required for integration tests (for example `ALCHEMY_API_KEY` or `MNEMONIC`) via your secure shell profile.
4. Pull the latest `main` branch and rebase your feature branch to keep the governance matrix current.

## Local validation

1. **Compile & lint**
   ```bash
   npm run lint:sol
   npm run compile
   ```
2. **Multi-runtime assurance**
   ```bash
   npm run test:truffle:ci
   npm run test:hardhat
   npm run test:foundry
   ```
3. **Governance invariants**
   ```bash
   npm run ci:governance
   ```
4. Capture console output in your evidence vault and update related manifests in `deploy/` or `manifests/`.

## Continuous integration sync

1. Push your branch to GitHub and confirm the `ci.yml`, `security.yml`, and `branch-checks.yml` workflows trigger.
2. Watch the Governance Audit, Multi-runtime Tests, and Security Scans jobs until they pass.
3. If a job fails, reproduce locally, patch, and re-run all tests before requesting review.
4. Document CI URLs in the pull request description under a "CI Evidence" list.

## Review & approvals

1. Tag at least:
   - One contract owner/guardian for governance-impacting changes.
   - A security reviewer when modifying privileged modules or pauser routes.
   - Documentation stewards for README or docs updates.
2. Summarise changes in the PR using the changelog entry as a guide.
3. Resolve review comments in commits (no force-push squashes after approvals without consensus).
4. Capture verbal approvals from synchronous calls in the PR thread for auditability.

## Merge & post-merge actions

1. Verify branch protections (status checks + review counts) are satisfied before merging via the "Squash and merge" pathway.
2. After merge:
   - Pull `main` locally and tag the release if required.
   - Archive the merged manifests, CI URLs, and Safe transactions into the evidence vault.
   - Update deployment dashboards or run `npm run ci:governance` again against the merge commit if policy demands.
3. Trigger any downstream automation (e.g., Safe transaction execution, off-chain agents) referenced in the changelog.

## Post-merge announcement template

Share the announcement in the owner communication channel (e.g., Discord `#announcements`, governance Discourse, or investor brief). Customize the bracketed fields:

```
🛰️ Sovereign Labor Update — [Feature name]

• Repository: MontrealAI/agijobs-sovereign-labor-v0p1 ([commit/PR link])
• Summary: [One sentence describing the change]
• Impacted modules: [contracts or docs touched]
• Operator actions: [Any follow-up tasks for guardians/treasury]
• Verification: [Local commands + CI runs]
• Demo: `demo/Meta-Agentic-ALPHA-AGI-Jobs-v0` refreshed with [notable updates]

Next steps: [Planned follow-on work or monitoring instructions]
```

Store a copy of each announcement in `manifests/communications/` for compliance review.

## Reference materials

- [`docs/operations/README.md`](README.md) — Operations atlas and telemetry schema.
- [`docs/operations/owner-control.md`](owner-control.md) — Safe transaction manifests for pausing, treasuries, and validator policy.
- [`demo/Meta-Agentic-ALPHA-AGI-Jobs-v0/`](../../demo/Meta-Agentic-ALPHA-AGI-Jobs-v0) — Workshop-ready demo scaffolding and datasets.
- [`docs/design/core-contracts.md`](../design/core-contracts.md) — Contract invariants and governance surfaces.

Keep this runbook versioned with every operational enhancement so new guardians can onboard in minutes instead of weeks.
