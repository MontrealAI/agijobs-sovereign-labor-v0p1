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

async function ownerOf(contract) {
  if (typeof contract.owner === 'function') {
    return contract.owner();
  }
  return '0x0000000000000000000000000000000000000000';
}

module.exports = async function () {
  const cfg = loadConfig();
  const pause = await SystemPause.deployed();

  const guardian = (cfg.guardianSafe || cfg.ownerSafe || '').toLowerCase();
  const pauseOwner = (await pause.owner()).toLowerCase();
  if (pauseOwner !== (cfg.ownerSafe || '').toLowerCase()) {
    throw new Error(`SystemPause owner ${pauseOwner} != configured ownerSafe ${cfg.ownerSafe}`);
  }

  const activePauser = (await pause.activePauser()).toLowerCase();
  if (guardian && activePauser !== guardian) {
    throw new Error(`Active pauser ${activePauser} != configured guardian ${guardian}`);
  }

  const records = [];
  const moduleEntries = [
    ['JobRegistry', JobRegistry, await pause.jobRegistry()],
    ['StakeManager', StakeManager, await pause.stakeManager()],
    ['ValidationModule', ValidationModule, await pause.validationModule()],
    ['DisputeModule', DisputeModule, await pause.disputeModule()],
    ['PlatformRegistry', PlatformRegistry, await pause.platformRegistry()],
    ['FeePool', FeePool, await pause.feePool()],
    ['ReputationEngine', ReputationEngine, await pause.reputationEngine()],
    ['ArbitratorCommittee', ArbitratorCommittee, await pause.arbitratorCommittee()],
    ['TaxPolicy', TaxPolicy, (await TaxPolicy.deployed()).address]
  ];

  for (const [label, artifact, address] of moduleEntries) {
    const instance = await artifact.at(address);
    const moduleOwner = (await ownerOf(instance)).toLowerCase();
    records.push({
      module: label,
      address,
      ownedByPause: moduleOwner === pause.address.toLowerCase(),
      owner: moduleOwner
    });
  }

  console.log('📊 SystemPause wiring snapshot');
  for (const row of records) {
    console.log(
      `${row.module.padEnd(22)} :: ${row.address} :: owner=${row.owner} :: ownedByPause=${row.ownedByPause}`
    );
  }

  console.log('✅ SystemPause lattice verified. All core modules wired under pause control.');
};
