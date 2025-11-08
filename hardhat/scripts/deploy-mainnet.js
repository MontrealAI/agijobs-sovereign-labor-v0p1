/* eslint-disable no-console */
require('dotenv').config();
const hre = require('hardhat');
const { ethers, network } = hre;
const {
  loadDeploymentConfig,
  ZERO_ADDRESS,
  ZERO_BYTES32
} = require('../../scripts/deploy/load-config');
const writeManifest = require('../../truffle/util/writeManifest');

async function label(txLabel, promise) {
  console.log(`▶️  ${txLabel}`);
  const tx = await promise;
  const receipt = await tx.wait();
  console.log(`   └ tx ${receipt.hash}`);
  return receipt;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider;
  const config = await loadDeploymentConfig(provider);

  const runtimeNetwork = await provider.getNetwork();
  if (Number(runtimeNetwork.chainId) !== Number(config.chainId)) {
    throw new Error(`Config chainId ${config.chainId} != connected network ${runtimeNetwork.chainId}`);
  }

  console.log(`\n🛠️  Deploying Sovereign Labor kernel from ${deployer.address} on chain ${runtimeNetwork.chainId}`);
  console.log(`💎 Binding $AGIALPHA at ${config.tokens.agi} (${config.tokens.symbol || 'AGIALPHA'})`);

  const OwnerConfigurator = await ethers.getContractFactory('OwnerConfigurator');
  const TaxPolicy = await ethers.getContractFactory('TaxPolicy');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const FeePool = await ethers.getContractFactory('FeePool');
  const ReputationEngine = await ethers.getContractFactory('ReputationEngine');
  const PlatformRegistry = await ethers.getContractFactory('PlatformRegistry');
  const AttestationRegistry = await ethers.getContractFactory('AttestationRegistry');
  const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry');
  const CertificateNFT = await ethers.getContractFactory('CertificateNFT');
  const ValidationModule = await ethers.getContractFactory('ValidationModule');
  const DisputeModule = await ethers.getContractFactory('DisputeModule');
  const JobRegistry = await ethers.getContractFactory('JobRegistry');
  const ArbitratorCommittee = await ethers.getContractFactory('ArbitratorCommittee');
  const SystemPause = await ethers.getContractFactory('SystemPause');

  const ownerConfigurator = await OwnerConfigurator.deploy(config.ownerSafe);
  await ownerConfigurator.waitForDeployment();
  console.log(`OwnerConfigurator deployed at ${ownerConfigurator.target}`);

  const taxPolicy = await TaxPolicy.deploy(config.tax.policyUri, config.tax.description);
  await taxPolicy.waitForDeployment();
  console.log(`TaxPolicy deployed at ${taxPolicy.target}`);

  const stakeManager = await StakeManager.deploy(
    config.params.minStakeWei,
    config.params.employerPct,
    config.params.treasuryPct,
    config.treasury,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    deployer.address
  );
  await stakeManager.waitForDeployment();
  console.log(`StakeManager deployed at ${stakeManager.target}`);

  const feePool = await FeePool.deploy(
    stakeManager.target,
    config.params.burnPct,
    config.treasury,
    taxPolicy.target
  );
  await feePool.waitForDeployment();
  console.log(`FeePool deployed at ${feePool.target}`);

  const reputationEngine = await ReputationEngine.deploy(stakeManager.target);
  await reputationEngine.waitForDeployment();
  console.log(`ReputationEngine deployed at ${reputationEngine.target}`);

  const platformRegistry = await PlatformRegistry.deploy(
    stakeManager.target,
    reputationEngine.target,
    config.params.minStakeWei
  );
  await platformRegistry.waitForDeployment();
  console.log(`PlatformRegistry deployed at ${platformRegistry.target}`);

  const attestationRegistry = await AttestationRegistry.deploy(
    config.identity.ensRegistry,
    config.identity.nameWrapper
  );
  await attestationRegistry.waitForDeployment();
  console.log(`AttestationRegistry deployed at ${attestationRegistry.target}`);

  const identityRegistry = await IdentityRegistry.deploy(
    config.identity.ensRegistry,
    config.identity.nameWrapper,
    reputationEngine.target,
    config.identity.agentRootNode,
    config.identity.clubRootNode
  );
  await identityRegistry.waitForDeployment();
  console.log(`IdentityRegistry deployed at ${identityRegistry.target}`);

  const certificateNft = await CertificateNFT.deploy('Sovereign Labor Credential', 'SLC');
  await certificateNft.waitForDeployment();
  console.log(`CertificateNFT deployed at ${certificateNft.target}`);

  const validationModule = await ValidationModule.deploy(
    ZERO_ADDRESS,
    stakeManager.target,
    0,
    0,
    config.params.validatorQuorum,
    config.params.maxValidators,
    []
  );
  await validationModule.waitForDeployment();
  console.log(`ValidationModule deployed at ${validationModule.target}`);

  const disputeModule = await DisputeModule.deploy(
    ZERO_ADDRESS,
    config.params.disputeFeeWei,
    config.params.disputeWindow,
    ZERO_ADDRESS,
    deployer.address
  );
  await disputeModule.waitForDeployment();
  console.log(`DisputeModule deployed at ${disputeModule.target}`);

  const jobRegistry = await JobRegistry.deploy(
    validationModule.target,
    stakeManager.target,
    reputationEngine.target,
    disputeModule.target,
    certificateNft.target,
    feePool.target,
    taxPolicy.target,
    config.params.platformFeePct,
    config.params.jobStakeWei,
    [taxPolicy.target],
    deployer.address
  );
  await jobRegistry.waitForDeployment();
  console.log(`JobRegistry deployed at ${jobRegistry.target}`);

  const arbitratorCommittee = await ArbitratorCommittee.deploy(jobRegistry.target, disputeModule.target);
  await arbitratorCommittee.waitForDeployment();
  console.log(`ArbitratorCommittee deployed at ${arbitratorCommittee.target}`);

  const systemPause = await SystemPause.deploy(
    jobRegistry.target,
    stakeManager.target,
    validationModule.target,
    disputeModule.target,
    platformRegistry.target,
    feePool.target,
    reputationEngine.target,
    arbitratorCommittee.target,
    deployer.address
  );
  await systemPause.waitForDeployment();
  console.log(`SystemPause deployed at ${systemPause.target}`);

  console.log('\n🔧 Wiring modules');

  if (attestationRegistry.target !== ZERO_ADDRESS) {
    await label('IdentityRegistry.setAttestationRegistry', identityRegistry.setAttestationRegistry(attestationRegistry.target));
  }
  if (config.identity.agentMerkleRoot !== ZERO_BYTES32) {
    await label('IdentityRegistry.setAgentMerkleRoot', identityRegistry.setAgentMerkleRoot(config.identity.agentMerkleRoot));
  }
  if (config.identity.validatorMerkleRoot !== ZERO_BYTES32) {
    await label('IdentityRegistry.setValidatorMerkleRoot', identityRegistry.setValidatorMerkleRoot(config.identity.validatorMerkleRoot));
  }

  await label('ValidationModule.setJobRegistry', validationModule.setJobRegistry(jobRegistry.target));
  await label('ValidationModule.setStakeManager', validationModule.setStakeManager(stakeManager.target));
  await label('ValidationModule.setIdentityRegistry', validationModule.setIdentityRegistry(identityRegistry.target));
  await label('ValidationModule.setReputationEngine', validationModule.setReputationEngine(reputationEngine.target));

  await label('StakeManager.setFeePool', stakeManager.setFeePool(feePool.target));
  await label('StakeManager.setJobRegistry', stakeManager.setJobRegistry(jobRegistry.target));
  await label('StakeManager.setDisputeModule', stakeManager.setDisputeModule(disputeModule.target));
  if (config.treasury !== ZERO_ADDRESS) {
    await label('StakeManager.setTreasuryAllowlist', stakeManager.setTreasuryAllowlist(config.treasury, true));
    await label('StakeManager.setTreasury', stakeManager.setTreasury(config.treasury));
  }

  await label('DisputeModule.setJobRegistry', disputeModule.setJobRegistry(jobRegistry.target));
  await label('DisputeModule.setStakeManager', disputeModule.setStakeManager(stakeManager.target));
  await label('DisputeModule.setCommittee', disputeModule.setCommittee(arbitratorCommittee.target));
  await label('DisputeModule.setTaxPolicy', disputeModule.setTaxPolicy(taxPolicy.target));

  await label('FeePool.setStakeManager', feePool.setStakeManager(stakeManager.target));
  await label('FeePool.setRewardRole', feePool.setRewardRole(2));
  await label('FeePool.setTaxPolicy', feePool.setTaxPolicy(taxPolicy.target));
  if (config.treasury !== ZERO_ADDRESS) {
    await label('FeePool.setTreasuryAllowlist', feePool.setTreasuryAllowlist(config.treasury, true));
    await label('FeePool.setTreasury', feePool.setTreasury(config.treasury));
  }
  await label('FeePool.setGovernance', feePool.setGovernance(systemPause.target));

  await label('ReputationEngine.setCaller(JobRegistry)', reputationEngine.setCaller(jobRegistry.target, true));
  await label('ReputationEngine.setCaller(ValidationModule)', reputationEngine.setCaller(validationModule.target, true));

  await label('CertificateNFT.setJobRegistry', certificateNft.setJobRegistry(jobRegistry.target));

  console.log('\n🎛️  Transferring ownership to SystemPause lattice');
  await label('TaxPolicy.transferOwnership(SystemPause)', taxPolicy.transferOwnership(systemPause.target));
  await label('JobRegistry.transferOwnership(SystemPause)', jobRegistry.transferOwnership(systemPause.target));
  await label('StakeManager.transferOwnership(SystemPause)', stakeManager.transferOwnership(systemPause.target));
  await label('ValidationModule.transferOwnership(SystemPause)', validationModule.transferOwnership(systemPause.target));
  await label('DisputeModule.transferOwnership(SystemPause)', disputeModule.transferOwnership(systemPause.target));
  await label('PlatformRegistry.transferOwnership(SystemPause)', platformRegistry.transferOwnership(systemPause.target));
  await label('FeePool.transferOwnership(SystemPause)', feePool.transferOwnership(systemPause.target));
  await label('ReputationEngine.transferOwnership(SystemPause)', reputationEngine.transferOwnership(systemPause.target));
  await label('ArbitratorCommittee.transferOwnership(SystemPause)', arbitratorCommittee.transferOwnership(systemPause.target));

  await label(
    'SystemPause.executeGovernanceCall acceptOwnership(TaxPolicy)',
    systemPause.executeGovernanceCall(
      taxPolicy.target,
      taxPolicy.interface.encodeFunctionData('acceptOwnership')
    )
  );

  await label('SystemPause.setModules', systemPause.setModules(
    jobRegistry.target,
    stakeManager.target,
    validationModule.target,
    disputeModule.target,
    platformRegistry.target,
    feePool.target,
    reputationEngine.target,
    arbitratorCommittee.target
  ));

  await label('SystemPause.setGlobalPauser', systemPause.setGlobalPauser(config.guardianSafe));
  await label('SystemPause.transferOwnership(ownerSafe)', systemPause.transferOwnership(config.ownerSafe));

  await label('CertificateNFT.transferOwnership(ownerSafe)', certificateNft.transferOwnership(config.ownerSafe));
  await label('AttestationRegistry.transferOwnership(ownerSafe)', attestationRegistry.transferOwnership(config.ownerSafe));
  await label('IdentityRegistry.transferOwnership(ownerSafe)', identityRegistry.transferOwnership(config.ownerSafe));

  await writeManifest(network.name || runtimeNetwork.chainId.toString(), {
    chainId: Number(runtimeNetwork.chainId),
    ownerSafe: config.ownerSafe,
    guardianSafe: config.guardianSafe,
    treasury: config.treasury,
    SystemPause: systemPause.target,
    OwnerConfigurator: ownerConfigurator.target,
    JobRegistry: jobRegistry.target,
    StakeManager: stakeManager.target,
    ValidationModule: validationModule.target,
    DisputeModule: disputeModule.target,
    ArbitratorCommittee: arbitratorCommittee.target,
    PlatformRegistry: platformRegistry.target,
    ReputationEngine: reputationEngine.target,
    IdentityRegistry: identityRegistry.target,
    AttestationRegistry: attestationRegistry.target,
    CertificateNFT: certificateNft.target,
    TaxPolicy: taxPolicy.target,
    FeePool: feePool.target
  });

  console.log('\n✅ Sovereign Labor kernel deployed. Accept pending ownerships (Identity & Attestation) via owner Safe.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
