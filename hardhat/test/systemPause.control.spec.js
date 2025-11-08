const { expect } = require("chai");
const { ethers, artifacts, network } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const AGIALPHA = "0xa61a3b3a130a9c20768eebf97e21515a6046a1fa";

async function deployKernelFixture() {
  const [deployer, ownerSafe, guardianSafe, treasury, newTreasury] = await ethers.getSigners();

  const tokenArtifact = await artifacts.readArtifact("MockAGIAlpha");
  await network.provider.send("hardhat_setCode", [AGIALPHA, tokenArtifact.deployedBytecode]);

  const TaxPolicy = await ethers.getContractFactory("TaxPolicy");
  const taxPolicy = await TaxPolicy.connect(ownerSafe).deploy(
    "ipfs://sovereign-tax-policy",
    "Participants own every tax obligation; the platform stays exempt."
  );
  await taxPolicy.waitForDeployment();

  const StakeManager = await ethers.getContractFactory("StakeManager");
  const stakeManager = await StakeManager.connect(ownerSafe).deploy(
    ethers.parseEther("2500"),
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
    1,
    treasury.address,
    await taxPolicy.getAddress()
  );
  await feePool.waitForDeployment();

  const ReputationEngine = await ethers.getContractFactory("ReputationEngine");
  const reputationEngine = await ReputationEngine.connect(ownerSafe).deploy(await stakeManager.getAddress());
  await reputationEngine.waitForDeployment();

  const PlatformRegistry = await ethers.getContractFactory("PlatformRegistry");
  const platformRegistry = await PlatformRegistry.connect(ownerSafe).deploy(
    await stakeManager.getAddress(),
    await reputationEngine.getAddress(),
    ethers.parseEther("2500")
  );
  await platformRegistry.waitForDeployment();

  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.connect(ownerSafe).deploy(
    ethers.ZeroAddress,
    ethers.ZeroAddress
  );
  await attestationRegistry.waitForDeployment();

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
    "Sovereign Labor Credential",
    "SLC"
  );
  await certificateNft.waitForDeployment();

  const ValidationModule = await ethers.getContractFactory("ValidationModule");
  const validationModule = await ValidationModule.connect(ownerSafe).deploy(
    ethers.ZeroAddress,
    await stakeManager.getAddress(),
    0,
    0,
    3,
    5,
    []
  );
  await validationModule.waitForDeployment();

  const DisputeModule = await ethers.getContractFactory("DisputeModule");
  const disputeModule = await DisputeModule.connect(ownerSafe).deploy(
    ethers.ZeroAddress,
    ethers.parseEther("1"),
    86400,
    ethers.ZeroAddress,
    ownerSafe.address
  );
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
    10,
    ethers.parseEther("2500"),
    [await taxPolicy.getAddress()],
    ownerSafe.address
  );
  await jobRegistry.waitForDeployment();

  const ArbitratorCommittee = await ethers.getContractFactory("ArbitratorCommittee");
  const arbitratorCommittee = await ArbitratorCommittee.connect(ownerSafe).deploy(
    await jobRegistry.getAddress(),
    await disputeModule.getAddress()
  );
  await arbitratorCommittee.waitForDeployment();

  const SystemPause = await ethers.getContractFactory("SystemPause");
  const systemPause = await SystemPause.connect(ownerSafe).deploy(
    await jobRegistry.getAddress(),
    await stakeManager.getAddress(),
    await validationModule.getAddress(),
    await disputeModule.getAddress(),
    await platformRegistry.getAddress(),
    await feePool.getAddress(),
    await reputationEngine.getAddress(),
    await arbitratorCommittee.getAddress(),
    await taxPolicy.getAddress(),
    ownerSafe.address
  );
  await systemPause.waitForDeployment();

  await identityRegistry.connect(ownerSafe).setAttestationRegistry(await attestationRegistry.getAddress());
  await validationModule.connect(ownerSafe).setJobRegistry(await jobRegistry.getAddress());
  await validationModule.connect(ownerSafe).setIdentityRegistry(await identityRegistry.getAddress());
  await validationModule.connect(ownerSafe).setReputationEngine(await reputationEngine.getAddress());

  await stakeManager.connect(ownerSafe).setFeePool(await feePool.getAddress());
  await stakeManager.connect(ownerSafe).setJobRegistry(await jobRegistry.getAddress());
  await stakeManager.connect(ownerSafe).setDisputeModule(await disputeModule.getAddress());
  await stakeManager.connect(ownerSafe).setTreasuryAllowlist(treasury.address, true);
  await stakeManager.connect(ownerSafe).setTreasury(treasury.address);

  await disputeModule.connect(ownerSafe).setJobRegistry(await jobRegistry.getAddress());
  await disputeModule.connect(ownerSafe).setStakeManager(await stakeManager.getAddress());
  await disputeModule.connect(ownerSafe).setCommittee(await arbitratorCommittee.getAddress());
  await disputeModule.connect(ownerSafe).setTaxPolicy(await taxPolicy.getAddress());

  await feePool.connect(ownerSafe).setStakeManager(await stakeManager.getAddress());
  await feePool.connect(ownerSafe).setRewardRole(2);
  await feePool.connect(ownerSafe).setTaxPolicy(await taxPolicy.getAddress());
  await feePool.connect(ownerSafe).setTreasuryAllowlist(treasury.address, true);
  await feePool.connect(ownerSafe).setTreasury(treasury.address);
  await feePool.connect(ownerSafe).setGovernance(await systemPause.getAddress());

  await reputationEngine.connect(ownerSafe).setCaller(await jobRegistry.getAddress(), true);
  await reputationEngine.connect(ownerSafe).setCaller(await validationModule.getAddress(), true);

  await certificateNft.connect(ownerSafe).setJobRegistry(await jobRegistry.getAddress());

  await taxPolicy.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await jobRegistry.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await stakeManager.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await validationModule.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await disputeModule.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await platformRegistry.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await feePool.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await reputationEngine.connect(ownerSafe).transferOwnership(await systemPause.getAddress());
  await arbitratorCommittee.connect(ownerSafe).transferOwnership(await systemPause.getAddress());

  const acceptOwnershipData = taxPolicy.interface.encodeFunctionData("acceptOwnership");
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await taxPolicy.getAddress(), acceptOwnershipData);

    await systemPause.connect(ownerSafe).setModules(
      await jobRegistry.getAddress(),
      await stakeManager.getAddress(),
      await validationModule.getAddress(),
      await disputeModule.getAddress(),
      await platformRegistry.getAddress(),
      await feePool.getAddress(),
      await reputationEngine.getAddress(),
      await arbitratorCommittee.getAddress(),
      await taxPolicy.getAddress()
    );

  await systemPause.connect(ownerSafe).setGlobalPauser(guardianSafe.address);

  await systemPause.connect(ownerSafe).transferOwnership(ownerSafe.address);
  await certificateNft.connect(ownerSafe).transferOwnership(ownerSafe.address);
  await attestationRegistry.connect(ownerSafe).transferOwnership(ownerSafe.address);
  await identityRegistry.connect(ownerSafe).transferOwnership(ownerSafe.address);

  return {
    deployer,
    ownerSafe,
    guardianSafe,
    treasury,
    newTreasury,
    systemPause,
    stakeManager,
    feePool,
    taxPolicy,
    jobRegistry,
    validationModule,
    reputationEngine,
    disputeModule,
    arbitratorCommittee,
    certificateNft,
    identityRegistry
  };
}

describe("SystemPause governance lattice", function () {
  it("allows governance to retune treasuries through the pause lattice", async function () {
    const { systemPause, stakeManager, feePool, taxPolicy, ownerSafe, newTreasury } = await loadFixture(
      deployKernelFixture
    );

    const allowStakeTreasury = stakeManager.interface.encodeFunctionData("setTreasuryAllowlist", [
      newTreasury.address,
      true
    ]);
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await stakeManager.getAddress(), allowStakeTreasury);

    const updateStakeTreasury = stakeManager.interface.encodeFunctionData("setTreasury", [newTreasury.address]);
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await stakeManager.getAddress(), updateStakeTreasury);

    expect(await stakeManager.treasury()).to.equal(newTreasury.address);

    const allowFeeTreasury = feePool.interface.encodeFunctionData("setTreasuryAllowlist", [
      newTreasury.address,
      true
    ]);
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await feePool.getAddress(), allowFeeTreasury);

    const updateFeeTreasury = feePool.interface.encodeFunctionData("setTreasury", [newTreasury.address]);
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await feePool.getAddress(), updateFeeTreasury);

    expect(await feePool.treasury()).to.equal(newTreasury.address);

    const newPolicy = "ipfs://agijobs/tax-policy-v2";
    const updatePolicy = taxPolicy.interface.encodeFunctionData("setPolicyURI", [newPolicy]);
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await taxPolicy.getAddress(), updatePolicy);

    expect(await taxPolicy.policyURI()).to.equal(newPolicy);
  });

  it("delegates pause authority to the guardian while governance retains recovery", async function () {
    const { systemPause, stakeManager, guardianSafe, ownerSafe } = await loadFixture(deployKernelFixture);

    expect(await systemPause.activePauser()).to.equal(guardianSafe.address);
    expect(await stakeManager.pauser()).to.equal(guardianSafe.address);

    await expect(stakeManager.connect(guardianSafe).pause()).to.emit(stakeManager, "Paused");
    expect(await stakeManager.paused()).to.equal(true);

    const unpauseCalldata = stakeManager.interface.encodeFunctionData("unpause");
    await systemPause
      .connect(ownerSafe)
      .executeGovernanceCall(await stakeManager.getAddress(), unpauseCalldata);

    expect(await stakeManager.paused()).to.equal(false);
  });

  it("rejects non-governance attempts to mutate core modules", async function () {
    const { systemPause, stakeManager, guardianSafe } = await loadFixture(deployKernelFixture);

    await expect(
      systemPause
        .connect(guardianSafe)
        .executeGovernanceCall(
          await stakeManager.getAddress(),
          stakeManager.interface.encodeFunctionData("pause")
        )
    ).to.be.revertedWithCustomError(systemPause, "NotGovernance");
  });
});
