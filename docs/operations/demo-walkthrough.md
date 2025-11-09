# Demo Execution Walkthrough

This guide explains how to exercise the Sovereign Labor demo end-to-end using
local Hardhat/Foundry environments and how to replay the same flow against a
Sepolia test deployment. The process validates contract wiring, script utility
behaviour, and the happy-path lifecycle from job creation to reward payout.

## Prerequisites

- Node.js 18 or newer.
- npm 9+.
- Foundry toolchain (`forge`) installed and available on your `PATH`.
- A cloned working copy of this repository with dependencies installed via:
  ```bash
  npm install
  ```
- For Sepolia interactions: funded test accounts plus the following environment
  variables populated in a `.env` file or shell session:
  ```bash
  export SEPOLIA_RPC="https://sepolia.infura.io/v3/<project-id>"
  export SEPOLIA_DEPLOYER_PK="0x<private-key>"
  ```

## Local verification (Hardhat)

1. **Run the integration regression:** the new test fixture deploys the kernel
   (TaxPolicy, StakeManager, FeePool, IdentityRegistry, Certificate NFT, and the
   demo validation harness) and walks through the demo lifecycle—employer creates
   a job, an agent stakes and submits work, validation auto-approves, and funds
   are finalised.
   ```bash
   npx hardhat test hardhat/test/demoFlow.integration.spec.js
   ```
   Expected output includes `Demo lifecycle integration` with the job lifecycle
   completing and token balances asserted.

2. **Validate script utilities:** ensure deployment metadata checks still pass by
   running the targeted unit suite.
   ```bash
   npx hardhat test hardhat/test/scripts/load-config.spec.js
   ```
   This covers JSON normalisation, ENS hashing, and failure conditions for token
   metadata.

3. (Optional) **Spot-check in an interactive console:**
   ```bash
   npx hardhat console
   ```
   Within the console you can attach to the deployed in-memory contracts
   (`await ethers.getContractAt("JobRegistry", <address>)`) from the fixture log
   to experiment with additional state changes.

## Local verification (Foundry)

1. **Run the end-to-end forge test:** the Foundry suite mirrors the Hardhat
   fixture while using Foundry’s cheatcodes to time-travel and manipulate the AGI
   token address.
   ```bash
   forge test --match-test testDemoLifecycleHappyPath
   ```
   The test mints escrow, forces validation success through the demo module, and
   asserts that the agent receives both the reward and unlocked stake.

2. (Optional) **Inspect traces:** append `-vvvv` to the command above to review
   detailed execution traces, gas usage, and emitted events for the happy-path
   scenario.

## Sepolia walkthrough (optional deployment)

1. **Deploy a mock $AGIALPHA token:** because Sepolia does not host the canonical
   token, deploy the test implementation included in this repository from a
   Hardhat console:
   ```bash
   npx hardhat console --network sepolia
   > const Token = await ethers.getContractFactory("MockAGIAlpha");
   > const token = await Token.deploy();
   > await token.waitForDeployment();
   > token.target
   ```
   Record the printed address for the next steps.

2. **Prepare a Sepolia config manifest:** copy `deploy/config.mainnet.json` to a
   new file (for example `deploy/config.sepolia.json`) and update:
   - `chainId` → `11155111`
   - `tokens.agi` → address returned in the previous step
   - Safe/treasury placeholders → funded Sepolia accounts under your control
   - Identity roots → keep zeroed values for test deployments

3. **Load the config and deploy the kernel:**
   ```bash
   export DEPLOY_CONFIG=deploy/config.sepolia.json
   npx hardhat run --network sepolia hardhat/scripts/deploy-mainnet.js
   ```
   The loader validates token metadata on-chain before wiring the JobRegistry,
   StakeManager, ValidationModule harness, and supporting contracts.

4. **Exercise the flow on Sepolia:** use `npx hardhat console --network sepolia`
   (or Foundry `cast send`) to:
   - Mint test $AGIALPHA to the employer/agent from the mock token.
   - Call `acknowledgeAndCreateJob`, `stakeAndApply`, `submit`, and
     `finalize` on the deployed JobRegistry.
   - Confirm token balances and acknowledgements mirror the local test results.

5. **Archive telemetry:** capture transaction hashes, emitted events, and final
   balances for stakeholders reviewing the demo run.

Following the sequence above guarantees parity between CI-style tests (Hardhat
+ Foundry) and live Sepolia verification, demonstrating the entire Sovereign
Labor demo pipeline with reproducible commands.
