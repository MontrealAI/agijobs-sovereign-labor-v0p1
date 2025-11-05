const SystemPause  = artifacts.require('SystemPause');
const JobRegistry  = artifacts.require('JobRegistry');
const StakeManager = artifacts.require('StakeManager');
const Validation   = artifacts.require('ValidationModule');
const Dispute      = artifacts.require('DisputeModule');
const Platform     = artifacts.require('PlatformRegistry');
const FeePool      = artifacts.require('FeePool');
const Reputation   = artifacts.require('ReputationEngine');
const Committee    = artifacts.require('ArbitratorCommittee');

module.exports = async function () {
  const pause = await SystemPause.deployed();
  const modules = [
    (await JobRegistry.deployed()).address,
    (await StakeManager.deployed()).address,
    (await Validation.deployed()).address,
    (await Dispute.deployed()).address,
    (await Platform.deployed()).address,
    (await FeePool.deployed()).address,
    (await Reputation.deployed()).address,
    (await Committee.deployed()).address
  ];
  if (pause.setModules) await pause.setModules(modules);
  console.log('🛡️  SystemPause registered modules.');
};
