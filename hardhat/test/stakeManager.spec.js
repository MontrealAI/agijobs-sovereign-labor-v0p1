const { expect } = require("chai");
const { ethers, network, artifacts } = require("hardhat");

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

  const timelockSigner = await impersonate(await timelock.getAddress());
  await stakeManager.connect(timelockSigner).setModules(await jobRegistry.getAddress(), ethers.ZeroAddress);
  await stakeManager.connect(timelockSigner).setPauserManager(await timelock.getAddress());
  await stakeManager.connect(timelockSigner).setPauser(await timelock.getAddress());

  return { owner, user, other, token, timelock, timelockSigner, stakeManager };
}

describe("StakeManager governance surface", function () {
  let owner;
  let user;
  let other;
  let token;
  let timelock;
  let timelockSigner;
  let stakeManager;

  beforeEach(async function () {
    ({ owner, user, other, token, timelock, timelockSigner, stakeManager } = await deployStakeManagerFixture());
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

    await stakeManager.connect(timelockSigner).setModules(await malicious.getAddress(), ethers.ZeroAddress);

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
});
