const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const AGIALPHA = "0xa61a3b3a130a9c20768eebf97e21515a6046a1fa";

async function deployDemoFixture() {
  const [ownerSafe, employer, agent, treasury] = await ethers.getSigners();

  const tokenArtifact = await artifacts.readArtifact("MockAGIAlpha");
  await network.provider.send("hardhat_setCode", [AGIALPHA, tokenArtifact.deployedBytecode]);
  const agi = await ethers.getContractAt("MockAGIAlpha", AGIALPHA);

  const TaxPolicy = await ethers.getContractFactory("TaxPolicy");
  const taxPolicy = await TaxPolicy.connect(ownerSafe).deploy(
    "ipfs://demo-tax-policy",
    "Participants accept all tax responsibility."
  );
  await taxPolicy.waitForDeployment();

  const StakeManager = await ethers.getContractFactory("StakeManager");
  const stakeManager = await StakeManager.connect(ownerSafe).deploy(
    ethers.parseEther("1"),
    9500,
    500,
    treasury.address,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    ownerSafe.address
  );
  await stakeManager.waitForDeployment();

  const FeePool = await ethers.getContractFactory("FeePool");
  const feePool = await FeePool.connect(ownerSafe).deploy(
    await stakeManager.getAddress(),
    0,
    treasury.address,
    await taxPolicy.getAddress()
  );
  await feePool.waitForDeployment();

  const ReputationEngine = await ethers.getContractFactory("ReputationEngine");
  const reputationEngine = await ReputationEngine.connect(ownerSafe).deploy(await stakeManager.getAddress());
  await reputationEngine.waitForDeployment();

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.connect(ownerSafe).deploy(
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    await reputationEngine.getAddress(),
    ethers.ZeroHash,
    ethers.ZeroHash
  );
  await identityRegistry.waitForDeployment();

  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const certificateNft = await CertificateNFT.connect(ownerSafe).deploy(
    "Demo Credential",
    "DEMO"
  );
  await certificateNft.waitForDeployment();

  const DemoValidationModule = await ethers.getContractFactory("DemoValidationModule");
  const validationModule = await DemoValidationModule.connect(ownerSafe).deploy();
  await validationModule.waitForDeployment();

  const DisputeModule = await ethers.getContractFactory("MockDisputeModule");
  const disputeModule = await DisputeModule.connect(ownerSafe).deploy();
  await disputeModule.waitForDeployment();

  const JobRegistry = await ethers.getContractFactory("JobRegistry");
  const jobRegistry = await JobRegistry.connect(ownerSafe).deploy(
    await validationModule.getAddress(),
    await stakeManager.getAddress(),
    await reputationEngine.getAddress(),
    await disputeModule.getAddress(),
    await certificateNft.getAddress(),
    await feePool.getAddress(),
    await taxPolicy.getAddress(),
    5,
    ethers.parseEther("1"),
    [],
    ownerSafe.address
  );
  await jobRegistry.waitForDeployment();

  await validationModule.connect(ownerSafe).configure(await jobRegistry.getAddress());
  await validationModule.connect(ownerSafe).setDefaultOutcome(true);

  await taxPolicy.connect(ownerSafe).setAcknowledger(await jobRegistry.getAddress(), true);
  await taxPolicy.connect(ownerSafe).setAcknowledger(await stakeManager.getAddress(), true);

  await jobRegistry.connect(ownerSafe).setAcknowledger(await stakeManager.getAddress(), true);
  await jobRegistry.connect(ownerSafe).setIdentityRegistry(await identityRegistry.getAddress());

  await stakeManager.connect(ownerSafe).setJobRegistry(await jobRegistry.getAddress());
  await stakeManager.connect(ownerSafe).setDisputeModule(await disputeModule.getAddress());
  await stakeManager.connect(ownerSafe).setFeePool(await feePool.getAddress());
  await stakeManager.connect(ownerSafe).setTreasuryAllowlist(treasury.address, true);
  await stakeManager.connect(ownerSafe).setTreasury(treasury.address);

  await feePool.connect(ownerSafe).setStakeManager(await stakeManager.getAddress());
  await feePool.connect(ownerSafe).setTaxPolicy(await taxPolicy.getAddress());
  await feePool.connect(ownerSafe).setTreasuryAllowlist(treasury.address, true);
  await feePool.connect(ownerSafe).setTreasury(treasury.address);
  await feePool.connect(ownerSafe).setBurnPct(0);

  await reputationEngine.connect(ownerSafe).setCaller(await jobRegistry.getAddress(), true);
  await reputationEngine.connect(ownerSafe).setCaller(await validationModule.getAddress(), true);

  await certificateNft.connect(ownerSafe).setJobRegistry(await jobRegistry.getAddress());
  await certificateNft.connect(ownerSafe).setStakeManager(await stakeManager.getAddress());

  await disputeModule.connect(ownerSafe).setTaxPolicy(await taxPolicy.getAddress());
  await identityRegistry.connect(ownerSafe).addAdditionalAgent(agent.address);

  return {
    agi,
    jobRegistry,
    stakeManager,
    taxPolicy,
    validationModule,
    identityRegistry,
    feePool,
    employer,
    agent,
    treasury,
    ownerSafe
  };
}

describe("Demo lifecycle integration", function () {
  it("completes the happy path from job creation to payout", async function () {
    const {
      agi,
      jobRegistry,
      stakeManager,
      taxPolicy,
      validationModule,
      feePool,
      employer,
      agent
    } = await loadFixture(deployDemoFixture);

    const reward = ethers.parseEther("100");
    const stakeAmount = await jobRegistry.jobStake();
    const feePct = await jobRegistry.feePct();
    const fee = (reward * feePct) / 100n;
    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
    const specHash = ethers.keccak256(ethers.toUtf8Bytes("demo-spec-v1"));
    const jobUri = "ipfs://demo/job/1";

    await agi.connect(employer).mint(employer.address, reward + fee);
    await agi.connect(employer).approve(await stakeManager.getAddress(), reward + fee);

    await jobRegistry
      .connect(employer)
      .acknowledgeAndCreateJob(reward, deadline, specHash, jobUri);
    const jobId = await jobRegistry.nextJobId();

    expect(await taxPolicy.hasAcknowledged(employer.address)).to.equal(true);

    await agi.connect(agent).mint(agent.address, stakeAmount);
    await agi.connect(agent).approve(await stakeManager.getAddress(), stakeAmount);

    await jobRegistry
      .connect(agent)
      .stakeAndApply(jobId, stakeAmount, "agent.demo", []);

    const resultHash = ethers.keccak256(ethers.toUtf8Bytes("demo-result"));
    await jobRegistry
      .connect(agent)
      .submit(jobId, resultHash, "ipfs://demo/result/1", "agent.demo", []);

    const jobAfterSubmit = await jobRegistry.jobs(jobId);
    const metadataAfterSubmit = await jobRegistry.decodeJobMetadata(jobAfterSubmit.packedMetadata);
    expect(metadataAfterSubmit.state).to.equal(3n); // Submitted

    await validationModule.complete(jobId);

    await jobRegistry.connect(employer).finalize(jobId);

    const finalizedJob = await jobRegistry.jobs(jobId);
    const finalizedMeta = await jobRegistry.decodeJobMetadata(finalizedJob.packedMetadata);
    expect(finalizedMeta.state).to.equal(6n); // Finalized

    const agentBalance = await agi.balanceOf(agent.address);
    expect(agentBalance).to.equal(reward);
    expect(await stakeManager.stakeOf(agent.address, 0)).to.equal(stakeAmount);

    expect(await taxPolicy.hasAcknowledged(agent.address)).to.equal(true);
    expect(await agi.balanceOf(await feePool.getAddress())).to.equal(fee);
  });
});
