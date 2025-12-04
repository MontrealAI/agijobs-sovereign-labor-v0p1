const { expect } = require("chai");
const { ethers, network, artifacts } = require("hardhat");

const { time } = require("@nomicfoundation/hardhat-network-helpers");

const AGIALPHA = "0xa61a3b3a130a9c20768eebf97e21515a6046a1fa";

async function impersonate(address) {
  await network.provider.send("hardhat_impersonateAccount", [address]);
  await network.provider.send("hardhat_setBalance", [address, "0x3635C9ADC5DEA00000"]); // 1000 ether
  return ethers.getSigner(address);
}

async function deployStakeManagerFixture() {
  const [owner, user, other] = await ethers.getSigners();

  const tokenArtifact = await artifacts.readArtifact("MockAGIAlpha");
  await network.provider.send("hardhat_setCode", [AGIALPHA, tokenArtifact.deployedBytecode]);
  const token = await ethers.getContractAt("MockAGIAlpha", AGIALPHA);

  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(0, [owner.address], [owner.address], owner.address);
  await timelock.waitForDeployment();

  const StakeManager = await ethers.getContractFactory("StakeManagerHarness");
  const stakeManager = await StakeManager.deploy(
    0,
    50,
    50,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    await timelock.getAddress()
  );
  await stakeManager.waitForDeployment();

  const JobRegistry = await ethers.getContractFactory("MockJobRegistry");
  const jobRegistry = await JobRegistry.deploy();
  await jobRegistry.waitForDeployment();

  const DisputeModule = await ethers.getContractFactory("MockDisputeModule");
  const disputeModule = await DisputeModule.deploy();
  await disputeModule.waitForDeployment();

  const timelockSigner = await impersonate(await timelock.getAddress());
  await stakeManager
    .connect(timelockSigner)
    .setModules(await jobRegistry.getAddress(), await disputeModule.getAddress());
  await stakeManager.connect(timelockSigner).setPauserManager(await timelock.getAddress());
  await stakeManager.connect(timelockSigner).setPauser(await timelock.getAddress());

  return { owner, user, other, token, timelock, timelockSigner, stakeManager, disputeModule };
}

describe("StakeManager governance surface", function () {
  let owner;
  let user;
  let other;
  let token;
  let timelock;
  let timelockSigner;
  let stakeManager;
  let disputeModule;

  beforeEach(async function () {
    ({ owner, user, other, token, timelock, timelockSigner, stakeManager, disputeModule } =
      await deployStakeManagerFixture());
  });

  it("rejects stake deposits while paused", async function () {
    const amount = ethers.parseEther("10");
    await token.mint(user.address, amount);
    await token.connect(user).approve(await stakeManager.getAddress(), amount);

    await expect(stakeManager.connect(user).depositStake(0, amount)).to.emit(stakeManager, "StakeDeposited");

    await stakeManager.connect(timelockSigner).pause();

    await expect(stakeManager.connect(user).depositStake(0, amount)).to.be.revertedWithCustomError(
      stakeManager,
      "EnforcedPause"
    );
  });

  it("restricts privileged setters to governance", async function () {
    await expect(stakeManager.connect(user).setRoleMinimums(0, 0, 0)).to.be.revertedWithCustomError(
      stakeManager,
      "NotGovernance"
    );

    await expect(
      stakeManager.connect(timelockSigner).setRoleMinimums(ethers.parseEther("1"), ethers.parseEther("1"), ethers.parseEther("1"))
    ).to.emit(stakeManager, "RoleMinimumUpdated");
  });

  it("blocks malicious reentrancy during acknowledgeAndDeposit", async function () {
    const Malicious = await ethers.getContractFactory("MaliciousJobRegistry");
    const malicious = await Malicious.deploy(await stakeManager.getAddress());
    await malicious.waitForDeployment();

    await stakeManager
      .connect(timelockSigner)
      .setModules(await malicious.getAddress(), await disputeModule.getAddress());

    const attacker = other;
    const amount = ethers.parseEther("5");
    await token.mint(attacker.address, amount);
    await token.connect(attacker).approve(await stakeManager.getAddress(), amount);

    await malicious.configureAttack(attacker.address, 0, amount);

    await expect(stakeManager.connect(attacker).acknowledgeAndDeposit(0, amount)).to.emit(
      stakeManager,
      "StakeDeposited"
    );
  });

  it("rejects invalid Hamiltonian feeds", async function () {
    await expect(
      stakeManager.connect(timelockSigner).setHamiltonianFeed(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(stakeManager, "InvalidHamiltonianFeed");

    await expect(stakeManager.connect(timelockSigner).setHamiltonianFeed(owner.address)).to.be.revertedWithCustomError(
      stakeManager,
      "InvalidHamiltonianFeed"
    );
  });

  it("raises stakes when the Hamiltonian feed exceeds the configured threshold", async function () {
    const MockHamiltonian = await ethers.getContractFactory("MockHamiltonian");
    const hFeed = await MockHamiltonian.deploy();
    await hFeed.waitForDeployment();

    await stakeManager
      .connect(timelockSigner)
      .configureAutoStake(0, 10, 5, 1, 0, 0, 0, 10, 0, 0, 1);
    await stakeManager.connect(timelockSigner).autoTuneStakes(true);
    await stakeManager.connect(timelockSigner).setHamiltonianFeed(await hFeed.getAddress());

    const initialMin = await stakeManager.minStake();

    await hFeed.setHamiltonian(5);
    await time.increase(2);
    await stakeManager.connect(owner).checkpointStake();
    expect(await stakeManager.minStake()).to.equal(initialMin);

    await hFeed.setHamiltonian(15);
    await time.increase(2);
    await stakeManager.connect(owner).checkpointStake();

    const expectedIncrease = initialMin + (initialMin * 10n) / 100n;
    expect(await stakeManager.minStake()).to.equal(expectedIncrease);
  });
});
