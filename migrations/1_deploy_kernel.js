const fs = require('fs');
const path = require('path');
const namehash = require('eth-ens-namehash');

const SystemPause = artifacts.require('SystemPause');
const OwnerConfigurator = artifacts.require('OwnerConfigurator');
const JobRegistry = artifacts.require('JobRegistry');
const StakeManager = artifacts.require('StakeManager');
const ValidationModule = artifacts.require('ValidationModule');
const DisputeModule = artifacts.require('DisputeModule');
const ArbitratorCommittee = artifacts.require('ArbitratorCommittee');
const PlatformRegistry = artifacts.require('PlatformRegistry');
const ReputationEngine = artifacts.require('ReputationEngine');
const IdentityRegistry = artifacts.require('IdentityRegistry');
const AttestationRegistry = artifacts.require('AttestationRegistry');
const CertificateNFT = artifacts.require('CertificateNFT');
const TaxPolicy = artifacts.require('TaxPolicy');
const FeePool = artifacts.require('FeePool');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CANONICAL_AGIALPHA = '0xa61a3b3a130a9c20768eebf97e21515a6046a1fa';

const ERC20_METADATA_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
];

function resolveConfig() {
  const cfgPath = process.env.DEPLOY_CONFIG || path.join(__dirname, '../deploy/config.mainnet.json');
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

async function send(label, fn) {
  console.log(`▶️  ${label}`);
  return fn();
}

module.exports = async function (deployer, network, accounts) {
  const [deployerAccount] = accounts;
  const cfg = resolveConfig();
  const chainId = await web3.eth.getChainId();
  if (chainId !== cfg.chainId) {
    throw new Error(`Config chainId ${cfg.chainId} != network ${chainId}`);
  }

  if (!cfg.tokens?.agi) {
    throw new Error('deploy config must include tokens.agi');
  }

  const configuredAgi = cfg.tokens.agi.toLowerCase();
  if (chainId === 1 && configuredAgi !== CANONICAL_AGIALPHA) {
    throw new Error(`Mainnet AGIALPHA must be ${CANONICAL_AGIALPHA}, received ${configuredAgi}`);
  }

  const agiMetadata = new web3.eth.Contract(ERC20_METADATA_ABI, configuredAgi);
  const agiDecimals = Number(await agiMetadata.methods.decimals().call());
  if (agiDecimals !== 18) {
    throw new Error(`$AGIALPHA decimals must equal 18, detected ${agiDecimals}`);
  }

  const agiSymbol = await agiMetadata.methods.symbol().call().catch(() => '');
  if (agiSymbol && agiSymbol !== 'AGIALPHA') {
    console.warn(`⚠️  Expected $AGIALPHA symbol to be AGIALPHA, observed ${agiSymbol}`);
  }

  const agiName = await agiMetadata.methods.name().call().catch(() => '');
  if (agiName && agiName.toLowerCase().includes('test')) {
    throw new Error(`$AGIALPHA metadata indicates a test token (${agiName}); aborting.`);
  }

  console.log(`💎 Using $AGIALPHA token ${configuredAgi} (${agiSymbol || 'AGIALPHA'}) with ${agiDecimals} decimals`);

  const ownerSafe = cfg.ownerSafe;
  const guardianSafe = cfg.guardianSafe || ownerSafe;
  const treasury = cfg.treasury || ZERO_ADDRESS;

  const params = cfg.params || {};
  const platformFeeBps = Number(params.platformFeeBps ?? 1000);
  if (platformFeeBps % 100 !== 0) {
    throw new Error('platformFeeBps must be a multiple of 100');
  }
  const platformFeePct = Math.floor(platformFeeBps / 100);
  if (platformFeePct > 100) {
    throw new Error(`platformFeeBps ${platformFeeBps} exceeds 100%`);
  }

  const burnBpsOfFee = Number(params.burnBpsOfFee ?? 100);
  if (burnBpsOfFee % 100 !== 0) {
    throw new Error('burnBpsOfFee must be a multiple of 100');
  }
  const burnPct = Math.floor(burnBpsOfFee / 100);
  if (burnPct > 100) {
    throw new Error(`burnBpsOfFee ${burnBpsOfFee} exceeds 100%`);
  }

  const slashBps = Number(params.slashBps ?? 500);
  if (slashBps < 0 || slashBps > 10000) {
    throw new Error('slashBps must be between 0 and 10_000');
  }
  const treasuryPct = slashBps;
  const employerPct = 10000 - treasuryPct;

  const validatorQuorum = Number(params.validatorQuorum ?? 3);
  const maxValidators = Number(params.maxValidators ?? Math.max(validatorQuorum * 2, validatorQuorum));
  const minStakeWei = params.minStakeWei ?? '0';
  const jobStakeWei = params.jobStakeWei ?? minStakeWei;
  const disputeFeeWei = params.disputeFeeWei ?? '0';
  const disputeWindow = Number(params.disputeWindow ?? 0);

  const agentRootNode = cfg.identity?.agentRootNode ? namehash.hash(cfg.identity.agentRootNode) : ZERO_BYTES32;
  const clubRootNode = cfg.identity?.clubRootNode ? namehash.hash(cfg.identity.clubRootNode) : ZERO_BYTES32;
  const agentMerkleRoot = cfg.identity?.agentMerkleRoot ?? ZERO_BYTES32;
  const validatorMerkleRoot = cfg.identity?.validatorMerkleRoot ?? ZERO_BYTES32;

  console.log('🚀 Deploying Sovereign Labor kernel with deployer', deployerAccount);

  const ownerCfg = await send('Deploy OwnerConfigurator', () => deployer.deploy(OwnerConfigurator, ownerSafe).then(() => OwnerConfigurator.deployed()));
  const tax = await send('Deploy TaxPolicy', () => deployer.deploy(TaxPolicy, cfg.tax?.policyUri || '', cfg.tax?.description || '').then(() => TaxPolicy.deployed()));

  const stake = await send('Deploy StakeManager', () =>
    deployer
      .deploy(
        StakeManager,
        minStakeWei,
        employerPct,
        treasuryPct,
        treasury,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        deployerAccount
      )
      .then(() => StakeManager.deployed())
  );

  const feePool = await send('Deploy FeePool', () =>
    deployer
      .deploy(FeePool, stake.address, burnPct, treasury, tax.address)
      .then(() => FeePool.deployed())
  );

  const reputation = await send('Deploy ReputationEngine', () =>
    deployer.deploy(ReputationEngine, stake.address).then(() => ReputationEngine.deployed())
  );

  const platform = await send('Deploy PlatformRegistry', () =>
    deployer.deploy(PlatformRegistry, stake.address, reputation.address, minStakeWei).then(() => PlatformRegistry.deployed())
  );

  const attestation = await send('Deploy AttestationRegistry', () =>
    deployer
      .deploy(AttestationRegistry, cfg.identity?.ensRegistry || ZERO_ADDRESS, cfg.identity?.nameWrapper || ZERO_ADDRESS)
      .then(() => AttestationRegistry.deployed())
  );

  const identity = await send('Deploy IdentityRegistry', () =>
    deployer
      .deploy(
        IdentityRegistry,
        cfg.identity?.ensRegistry || ZERO_ADDRESS,
        cfg.identity?.nameWrapper || ZERO_ADDRESS,
        reputation.address,
        agentRootNode,
        clubRootNode
      )
      .then(() => IdentityRegistry.deployed())
  );

  const certificate = await send('Deploy CertificateNFT', () =>
    deployer.deploy(CertificateNFT, 'Sovereign Labor Credential', 'SLC').then(() => CertificateNFT.deployed())
  );

  const validation = await send('Deploy ValidationModule', () =>
    deployer
      .deploy(
        ValidationModule,
        ZERO_ADDRESS,
        stake.address,
        0,
        0,
        validatorQuorum,
        maxValidators,
        []
      )
      .then(() => ValidationModule.deployed())
  );

  const dispute = await send('Deploy DisputeModule', () =>
    deployer
      .deploy(
        DisputeModule,
        ZERO_ADDRESS,
        disputeFeeWei,
        disputeWindow,
        ZERO_ADDRESS,
        deployerAccount
      )
      .then(() => DisputeModule.deployed())
  );

  const job = await send('Deploy JobRegistry', () =>
    deployer
      .deploy(
        JobRegistry,
        validation.address,
        stake.address,
        reputation.address,
        dispute.address,
        certificate.address,
        feePool.address,
        tax.address,
        platformFeePct,
        jobStakeWei,
        [tax.address],
        deployerAccount
      )
      .then(() => JobRegistry.deployed())
  );

  const committee = await send('Deploy ArbitratorCommittee', () =>
    deployer.deploy(ArbitratorCommittee, job.address, dispute.address).then(() => ArbitratorCommittee.deployed())
  );

  const pause = await send('Deploy SystemPause', () =>
    deployer
      .deploy(
        SystemPause,
        job.address,
        stake.address,
        validation.address,
        dispute.address,
        platform.address,
        feePool.address,
        reputation.address,
        committee.address,
        tax.address,
        deployerAccount
      )
      .then(() => SystemPause.deployed())
  );

  console.log('🔧 Wiring modules');

  if (attestation.address !== ZERO_ADDRESS) {
    await send('IdentityRegistry.setAttestationRegistry', () => identity.setAttestationRegistry(attestation.address));
  }
  if (agentMerkleRoot !== ZERO_BYTES32) {
    await send('IdentityRegistry.setAgentMerkleRoot', () => identity.setAgentMerkleRoot(agentMerkleRoot));
  }
  if (validatorMerkleRoot !== ZERO_BYTES32) {
    await send('IdentityRegistry.setValidatorMerkleRoot', () => identity.setValidatorMerkleRoot(validatorMerkleRoot));
  }

  await send('ValidationModule.setJobRegistry', () => validation.setJobRegistry(job.address));
  await send('ValidationModule.setStakeManager', () => validation.setStakeManager(stake.address));
  await send('ValidationModule.setIdentityRegistry', () => validation.setIdentityRegistry(identity.address));
  await send('ValidationModule.setReputationEngine', () => validation.setReputationEngine(reputation.address));

  await send('StakeManager.setFeePool', () => stake.setFeePool(feePool.address));
  await send('StakeManager.setJobRegistry', () => stake.setJobRegistry(job.address));
  await send('StakeManager.setDisputeModule', () => stake.setDisputeModule(dispute.address));
  if (treasury !== ZERO_ADDRESS) {
    await send('StakeManager.setTreasuryAllowlist', () => stake.setTreasuryAllowlist(treasury, true));
    await send('StakeManager.setTreasury', () => stake.setTreasury(treasury));
  }

  await send('DisputeModule.setJobRegistry', () => dispute.setJobRegistry(job.address));
  await send('DisputeModule.setStakeManager', () => dispute.setStakeManager(stake.address));
  await send('DisputeModule.setCommittee', () => dispute.setCommittee(committee.address));
  await send('DisputeModule.setTaxPolicy', () => dispute.setTaxPolicy(tax.address));

  await send('FeePool.setStakeManager', () => feePool.setStakeManager(stake.address));
  await send('FeePool.setRewardRole', () => feePool.setRewardRole(2));
  await send('FeePool.setTaxPolicy', () => feePool.setTaxPolicy(tax.address));
  if (treasury !== ZERO_ADDRESS) {
    await send('FeePool.setTreasuryAllowlist', () => feePool.setTreasuryAllowlist(treasury, true));
    await send('FeePool.setTreasury', () => feePool.setTreasury(treasury));
  }
  await send('FeePool.setGovernance', () => feePool.setGovernance(pause.address));

  await send('ReputationEngine.setCaller(JobRegistry)', () => reputation.setCaller(job.address, true));
  await send('ReputationEngine.setCaller(ValidationModule)', () => reputation.setCaller(validation.address, true));

  await send('CertificateNFT.setJobRegistry', () => certificate.setJobRegistry(job.address));

  console.log('🎛️  Transferring ownership to SystemPause lattice');

  await send('TaxPolicy.transferOwnership(SystemPause)', () => tax.transferOwnership(pause.address));

  await send('JobRegistry.transferOwnership(SystemPause)', () => job.transferOwnership(pause.address));
  await send('StakeManager.transferOwnership(SystemPause)', () => stake.transferOwnership(pause.address));
  await send('ValidationModule.transferOwnership(SystemPause)', () => validation.transferOwnership(pause.address));
  await send('DisputeModule.transferOwnership(SystemPause)', () => dispute.transferOwnership(pause.address));
  await send('PlatformRegistry.transferOwnership(SystemPause)', () => platform.transferOwnership(pause.address));
  await send('FeePool.transferOwnership(SystemPause)', () => feePool.transferOwnership(pause.address));
  await send('ReputationEngine.transferOwnership(SystemPause)', () => reputation.transferOwnership(pause.address));
  await send('ArbitratorCommittee.transferOwnership(SystemPause)', () => committee.transferOwnership(pause.address));

  await send('SystemPause.accept TaxPolicy ownership', () =>
    pause.executeGovernanceCall(tax.address, tax.contract.methods.acceptOwnership().encodeABI())
  );

  await send('SystemPause.setModules', () =>
    pause.setModules(
      job.address,
      stake.address,
      validation.address,
      dispute.address,
      platform.address,
      feePool.address,
      reputation.address,
      committee.address,
      tax.address
    )
  );

  await send('SystemPause.setGlobalPauser', () => pause.setGlobalPauser(guardianSafe));
  await send('SystemPause.transferOwnership(ownerSafe)', () => pause.transferOwnership(ownerSafe));

  await send('CertificateNFT.transferOwnership(ownerSafe)', () => certificate.transferOwnership(ownerSafe));
  await send('AttestationRegistry.transferOwnership(ownerSafe)', () => attestation.transferOwnership(ownerSafe));
  await send('IdentityRegistry.transferOwnership(ownerSafe)', () => identity.transferOwnership(ownerSafe));

  const writeManifest = require('../truffle/util/writeManifest');
  await writeManifest(network, {
    chainId,
    ownerSafe,
    guardianSafe,
    treasury,
    SystemPause: pause.address,
    OwnerConfigurator: ownerCfg.address,
    JobRegistry: job.address,
    StakeManager: stake.address,
    ValidationModule: validation.address,
    DisputeModule: dispute.address,
    ArbitratorCommittee: committee.address,
    PlatformRegistry: platform.address,
    ReputationEngine: reputation.address,
    IdentityRegistry: identity.address,
    AttestationRegistry: attestation.address,
    CertificateNFT: certificate.address,
    TaxPolicy: tax.address,
    FeePool: feePool.address
  });

  console.log('✅ Sovereign Labor kernel deployed. Update pending ownerships (Identity & Attestation) must be accepted by owner safe.');
};
