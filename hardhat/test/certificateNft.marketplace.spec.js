const { expect } = require("chai");
const { ethers, artifacts, network } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const AGIALPHA = "0xa61a3b3a130a9c20768eebf97e21515a6046a1fa";

async function deployCertificateFixture() {
  const [deployer, seller, buyer, treasury] = await ethers.getSigners();

  const tokenArtifact = await artifacts.readArtifact("MockAGIAlpha");
  await network.provider.send("hardhat_setCode", [AGIALPHA, tokenArtifact.deployedBytecode]);
  const agiAlpha = await ethers.getContractAt("MockAGIAlpha", AGIALPHA);

  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const certificate = await CertificateNFT.deploy("Sovereign Credential", "SLC");
  await certificate.waitForDeployment();

  await certificate.connect(deployer).setJobRegistry(deployer.address);
  await certificate.connect(deployer).mint(seller.address, 1, ethers.id("demo-uri"));

  return { deployer, seller, buyer, treasury, certificate, agiAlpha };
}

describe("CertificateNFT marketplace wiring", function () {
  after(async function () {
    await network.provider.send("hardhat_reset");
  });

  it("reverts listings until a stake manager is configured", async function () {
    const { seller, certificate } = await loadFixture(deployCertificateFixture);

    await expect(certificate.connect(seller).list(1, ethers.parseEther("1")))
      .to.be.revertedWithCustomError(certificate, "StakeManagerNotConfigured");
  });

  it("lists and executes purchases once the stake manager is set", async function () {
    const { deployer, seller, buyer, treasury, certificate, agiAlpha } = await loadFixture(
      deployCertificateFixture
    );

    const StakeManagerHarness = await ethers.getContractFactory("StakeManagerHarness");
    const stakeManager = await StakeManagerHarness.deploy(
      ethers.parseEther("2500"),
      9500,
      500,
      treasury.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      deployer.address
    );
    await stakeManager.waitForDeployment();

    await certificate.connect(deployer).setStakeManager(await stakeManager.getAddress());

    await agiAlpha.mint(buyer.address, ethers.parseEther("10"));
    await agiAlpha.connect(buyer).approve(await certificate.getAddress(), ethers.parseEther("10"));

    await certificate.connect(seller).list(1, ethers.parseEther("3"));
    await certificate.connect(buyer).purchase(1);

    expect(await certificate.ownerOf(1)).to.equal(buyer.address);
  });
});
