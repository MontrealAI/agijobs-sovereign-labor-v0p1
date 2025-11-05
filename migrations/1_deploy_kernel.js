const fs = require('fs'); const path = require('path');
const cfgPath = process.env.DEPLOY_CONFIG || path.join(__dirname, '../deploy/config.mainnet.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const SystemPause         = artifacts.require('SystemPause');
const OwnerConfigurator   = artifacts.require('OwnerConfigurator');

const JobRegistry         = artifacts.require('JobRegistry');
const StakeManager        = artifacts.require('StakeManager');
const ValidationModule    = artifacts.require('ValidationModule');
const DisputeModule       = artifacts.require('DisputeModule');
const ArbitratorCommittee = artifacts.require('ArbitratorCommittee');

const PlatformRegistry    = artifacts.require('PlatformRegistry');
const ReputationEngine    = artifacts.require('ReputationEngine');
const IdentityRegistry    = artifacts.require('IdentityRegistry');
const AttestationRegistry = artifacts.require('AttestationRegistry');

const CertificateNFT      = artifacts.require('CertificateNFT');
const TaxPolicy           = artifacts.require('TaxPolicy');
const FeePool             = artifacts.require('FeePool');

module.exports = async function (deployer, network) {
  const chainId = await web3.eth.getChainId();
  if (chainId !== cfg.chainId) throw new Error(`Config chainId ${cfg.chainId} != network ${chainId}`);

  const AGI          = cfg.tokens.agi;
  const OWNER_SAFE   = cfg.ownerSafe;
  const GUARDIAN_SAFE= cfg.guardianSafe;
  const TREASURY     = cfg.treasury;

  // 1) Admin + treasury
  await deployer.deploy(OwnerConfigurator, OWNER_SAFE);
  const ownerCfg = await OwnerConfigurator.deployed();

  await deployer.deploy(FeePool, AGI);
  const feePool = await FeePool.deployed();

  // 2) Stake / Reputation / Identity
  // NOTE: If your StakeManager constructor differs, adjust here.
  await deployer.deploy(StakeManager, feePool.address);
  const stake = await StakeManager.deployed();

  await deployer.deploy(ReputationEngine);
  const rep = await ReputationEngine.deployed();

  await deployer.deploy(AttestationRegistry, cfg.identity.ensRegistry, cfg.identity.nameWrapper);
  const attReg = await AttestationRegistry.deployed();

  await deployer.deploy(IdentityRegistry);
  const idReg = await IdentityRegistry.deployed();

  // 3) Core registry + modules
  await deployer.deploy(JobRegistry);
  const reg = await JobRegistry.deployed();

  await deployer.deploy(DisputeModule, reg.address, stake.address);
  const disp = await DisputeModule.deployed();

  await deployer.deploy(ValidationModule, reg.address, stake.address, 0, 0, 0, 0, []);
  const val = await ValidationModule.deployed();

  await deployer.deploy(ArbitratorCommittee, reg.address, disp.address);
  const arb = await ArbitratorCommittee.deployed();

  await deployer.deploy(PlatformRegistry, stake.address, rep.address, 0);
  const plat = await PlatformRegistry.deployed();

  await deployer.deploy(CertificateNFT);
  const cert = await CertificateNFT.deployed();

  await deployer.deploy(TaxPolicy, cfg.tax.policyUri || "", cfg.tax.description || "");
  const tax = await TaxPolicy.deployed();

  // 4) Pause lattice
  // If your SystemPause constructor differs, adjust the arguments accordingly.
  await deployer.deploy(
    SystemPause,
    reg.address, stake.address, val.address, disp.address,
    plat.address, feePool.address, rep.address, arb.address,
    OWNER_SAFE
  );
  const pause = await SystemPause.deployed();

  // 5) Wiring helpers
  const safeCall = async (inst, fn, args=[]) => { if (inst[fn]) await inst[fn](...args); };

  await safeCall(reg, 'setModules', [val.address, stake.address, rep.address, disp.address, cert.address, tax.address]);

  await safeCall(stake, 'setJobRegistry', [reg.address]);
  await safeCall(stake, 'setDisputeModule', [disp.address]);
  await safeCall(stake, 'setTreasury', [feePool.address]);

  await safeCall(val, 'setIdentityRegistry', [idReg.address]);
  await safeCall(val, 'setReputationEngine', [rep.address]);

  await safeCall(cert, 'setJobRegistry', [reg.address]);

  await safeCall(ownerCfg, 'setRegistry', [reg.address]);
  await safeCall(ownerCfg, 'setStakeManager', [stake.address]);
  await safeCall(ownerCfg, 'setValidation', [val.address]);
  await safeCall(ownerCfg, 'setReputationEngine', [rep.address]);
  await safeCall(ownerCfg, 'setDisputeModule', [disp.address]);
  await safeCall(ownerCfg, 'setFeePool', [feePool.address]);
  await safeCall(ownerCfg, 'setCertificateNFT', [cert.address]);
  await safeCall(ownerCfg, 'setIdentityRegistry', [idReg.address]);
  await safeCall(ownerCfg, 'setPlatformRegistry', [plat.address]);

  await safeCall(idReg, 'setENS', [cfg.identity.ensRegistry, cfg.identity.nameWrapper]);
  await safeCall(idReg, 'setRoots', [cfg.identity.agentRootNode, cfg.identity.clubRootNode]);
  await safeCall(idReg, 'setMerkleRoots', [cfg.identity.agentMerkleRoot, cfg.identity.validatorMerkleRoot]);

  // 6) Hand ownership to governance Safe
  const ownables = [reg, stake, val, disp, plat, rep, idReg, attReg, cert, tax, arb, ownerCfg, feePool, pause];
  for (const c of ownables) if (c.transferOwnership) await c.transferOwnership(OWNER_SAFE);

  // 7) Write a manifest for downstream tools
  const writeManifest = require('../truffle/util/writeManifest');
  await writeManifest(network, {
    chainId,
    AGI,
    ownerSafe: OWNER_SAFE,
    guardianSafe: GUARDIAN_SAFE,
    treasury: TREASURY,
    SystemPause: pause.address,
    OwnerConfigurator: ownerCfg.address,
    JobRegistry: reg.address,
    StakeManager: stake.address,
    ValidationModule: val.address,
    DisputeModule: disp.address,
    ArbitratorCommittee: arb.address,
    PlatformRegistry: plat.address,
    ReputationEngine: rep.address,
    IdentityRegistry: idReg.address,
    AttestationRegistry: attReg.address,
    CertificateNFT: cert.address,
    TaxPolicy: tax.address,
    FeePool: feePool.address
  });

  console.log('✅ Sovereign Labor α0.1 deployed (addresses written to manifests/).');
};
