const fs = require('fs');
const path = require('path');

const SystemPause = artifacts.require('SystemPause');
const JobRegistry = artifacts.require('JobRegistry');
const StakeManager = artifacts.require('StakeManager');
const ValidationModule = artifacts.require('ValidationModule');
const DisputeModule = artifacts.require('DisputeModule');
const PlatformRegistry = artifacts.require('PlatformRegistry');
const FeePool = artifacts.require('FeePool');
const ReputationEngine = artifacts.require('ReputationEngine');
const ArbitratorCommittee = artifacts.require('ArbitratorCommittee');
const TaxPolicy = artifacts.require('TaxPolicy');

function loadConfig() {
  const cfgPath = process.env.DEPLOY_CONFIG || path.join(__dirname, '../deploy/config.mainnet.json');
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

async function ensureOwner(contract, expected, label) {
  const actual = (await contract.owner()).toLowerCase();
  if (actual !== expected.toLowerCase()) {
    throw new Error(`${label} owner ${actual} != expected ${expected}`);
  }
}

module.exports = async function (_deployer, network) {
  const cfg = loadConfig();
  const chainId = await web3.eth.getChainId();
  if (chainId !== cfg.chainId) {
    console.log(`⏭️  Skipping finalize for chainId ${chainId}; expected ${cfg.chainId}.`);
    return;
  }

  console.log(`🔐 Validating Sovereign Labor deployment for ${network} (chainId ${chainId})`);

  const pause = await SystemPause.deployed();
  const job = await JobRegistry.deployed();
  const stake = await StakeManager.deployed();
  const validation = await ValidationModule.deployed();
  const dispute = await DisputeModule.deployed();
  const platform = await PlatformRegistry.deployed();
  const feePool = await FeePool.deployed();
  const reputation = await ReputationEngine.deployed();
  const committee = await ArbitratorCommittee.deployed();
  const tax = await TaxPolicy.deployed();

  await ensureOwner(pause, cfg.ownerSafe, 'SystemPause');
  await ensureOwner(job, pause.address, 'JobRegistry');
  await ensureOwner(stake, pause.address, 'StakeManager');
  await ensureOwner(validation, pause.address, 'ValidationModule');
  await ensureOwner(dispute, pause.address, 'DisputeModule');
  await ensureOwner(platform, pause.address, 'PlatformRegistry');
  await ensureOwner(feePool, pause.address, 'FeePool');
  await ensureOwner(reputation, pause.address, 'ReputationEngine');
  await ensureOwner(committee, pause.address, 'ArbitratorCommittee');
  await ensureOwner(tax, pause.address, 'TaxPolicy');

  const activePauser = (await pause.activePauser()).toLowerCase();
  const expectedPauser = (cfg.guardianSafe || cfg.ownerSafe || '').toLowerCase();
  if (expectedPauser && activePauser !== expectedPauser) {
    throw new Error(`Active pauser ${activePauser} != configured guardian ${expectedPauser}`);
  }

  const pointers = {
    validation: await pause.validationModule(),
    stake: await pause.stakeManager(),
    dispute: await pause.disputeModule(),
    platform: await pause.platformRegistry(),
    feePool: await pause.feePool(),
    reputation: await pause.reputationEngine(),
    committee: await pause.arbitratorCommittee()
  };

  if (pointers.validation.toLowerCase() !== validation.address.toLowerCase()) {
    throw new Error('SystemPause validation module pointer mismatch');
  }
  if (pointers.stake.toLowerCase() !== stake.address.toLowerCase()) {
    throw new Error('SystemPause stake manager pointer mismatch');
  }
  if (pointers.dispute.toLowerCase() !== dispute.address.toLowerCase()) {
    throw new Error('SystemPause dispute module pointer mismatch');
  }
  if (pointers.platform.toLowerCase() !== platform.address.toLowerCase()) {
    throw new Error('SystemPause platform registry pointer mismatch');
  }
  if (pointers.feePool.toLowerCase() !== feePool.address.toLowerCase()) {
    throw new Error('SystemPause fee pool pointer mismatch');
  }
  if (pointers.reputation.toLowerCase() !== reputation.address.toLowerCase()) {
    throw new Error('SystemPause reputation engine pointer mismatch');
  }
  if (pointers.committee.toLowerCase() !== committee.address.toLowerCase()) {
    throw new Error('SystemPause committee pointer mismatch');
  }

  const feeToken = await feePool.token();
  if (feeToken.toLowerCase() !== cfg.tokens.agi.toLowerCase()) {
    throw new Error(`FeePool token ${feeToken} != configured $AGIALPHA ${cfg.tokens.agi}`);
  }

  const treasury = await stake.treasury();
  if (treasury.toLowerCase() !== (cfg.treasury || '').toLowerCase()) {
    console.warn(`⚠️  StakeManager treasury ${treasury} differs from config ${cfg.treasury}`);
  }

  console.log('✅ Sovereign Labor deployment validated. Governance lattice is green.');
};
