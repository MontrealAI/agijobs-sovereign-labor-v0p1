const fs = require("fs");
const os = require("os");
const path = require("path");
const { expect } = require("chai");
const namehash = require("eth-ens-namehash");

const {
  loadDeploymentConfig,
  ZERO_ADDRESS,
  ZERO_BYTES32
} = require("../../../scripts/deploy/load-config.js");

function writeConfig(tmpDir, filename, data) {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

describe("deploy configuration loader", function () {
  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-config-"));
  });

  afterEach(function () {
    delete process.env.DEPLOY_CONFIG;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("normalizes configuration values using on-chain token metadata", async function () {
    const [ownerSafe, guardianSafe, treasury] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("FlexibleMetadataToken");
    const token = await Token.deploy("AGI Token", "AGIALPHA", 18);
    await token.waitForDeployment();

    const configPath = writeConfig(tmpDir, "valid.json", {
      chainId: 31337,
      ownerSafe: ownerSafe.address,
      guardianSafe: guardianSafe.address,
      treasury: treasury.address,
      tokens: {
        agi: await token.getAddress()
      },
      params: {
        platformFeeBps: 700,
        burnBpsOfFee: 300,
        slashBps: 2500,
        validatorQuorum: 4,
        minStakeWei: "1000000000000000000",
        jobStakeWei: "2000000000000000000"
      },
      identity: {
        agentRootNode: "agent.demo",
        clubRootNode: "club.demo",
        agentMerkleRoot: "0x" + "11".repeat(32),
        validatorMerkleRoot: "0x" + "22".repeat(32)
      },
      tax: {
        policyUri: "ipfs://demo/policy",
        description: "Demo tax policy"
      }
    });

    process.env.DEPLOY_CONFIG = configPath;

    const loaded = await loadDeploymentConfig(ethers.provider);
    expect(loaded.chainId).to.equal(31337);
    expect(loaded.ownerSafe).to.equal(ownerSafe.address);
    expect(loaded.guardianSafe).to.equal(guardianSafe.address);
    expect(loaded.treasury).to.equal(treasury.address);
    expect(loaded.tokens.agi).to.equal(await token.getAddress());
    expect(loaded.tokens.decimals).to.equal(18);
    expect(loaded.tokens.symbol).to.equal("AGIALPHA");
    expect(loaded.params.platformFeePct).to.equal(7);
    expect(loaded.params.burnPct).to.equal(3);
    expect(loaded.params.validatorQuorum).to.equal(4);
    expect(loaded.params.minStakeWei).to.equal(1000000000000000000n);
    expect(loaded.params.jobStakeWei).to.equal(2000000000000000000n);
    expect(loaded.identity.agentRootNode).to.equal(namehash.hash("agent.demo"));
    expect(loaded.identity.clubRootNode).to.equal(namehash.hash("club.demo"));
    expect(loaded.identity.agentMerkleRoot).to.not.equal(ZERO_BYTES32);
    expect(loaded.tax.policyUri).to.equal("ipfs://demo/policy");
  });

  it("rejects tokens with incorrect decimals", async function () {
    const Token = await ethers.getContractFactory("FlexibleMetadataToken");
    const token = await Token.deploy("AGI Token", "AGIALPHA", 6);
    await token.waitForDeployment();

    const configPath = writeConfig(tmpDir, "bad-decimals.json", {
      chainId: 1337,
      ownerSafe: ZERO_ADDRESS,
      tokens: {
        agi: await token.getAddress()
      }
    });

    process.env.DEPLOY_CONFIG = configPath;

    await expect(loadDeploymentConfig(ethers.provider)).to.be.rejectedWith(
      "$AGIALPHA decimals must equal 18"
    );
  });

  it("enforces fee configuration divisibility", async function () {
    const Token = await ethers.getContractFactory("FlexibleMetadataToken");
    const token = await Token.deploy("AGI Token", "AGIALPHA", 18);
    await token.waitForDeployment();

    const configPath = writeConfig(tmpDir, "bad-burn.json", {
      chainId: 1337,
      ownerSafe: ZERO_ADDRESS,
      tokens: {
        agi: await token.getAddress()
      },
      params: {
        burnBpsOfFee: 150
      }
    });

    process.env.DEPLOY_CONFIG = configPath;

    await expect(loadDeploymentConfig(ethers.provider)).to.be.rejectedWith(
      "params.burnBpsOfFee must be a multiple of 100"
    );
  });
});
