const fs = require('fs');
const path = require('path');

const SystemPause = artifacts.require('SystemPause');
const FeePool = artifacts.require('FeePool');
const StakeManager = artifacts.require('StakeManager');
const ValidationModule = artifacts.require('ValidationModule');
const JobRegistry = artifacts.require('JobRegistry');

module.exports = async function (_deployer, network) {
  const chainId = await web3.eth.getChainId();
  const cfgPath = process.env.DEPLOY_CONFIG || path.join(__dirname, '../deploy/config.mainnet.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

  if (chainId !== cfg.chainId) {
    console.log(`⏭️  Skipping finalize for chainId ${chainId}; expected ${cfg.chainId}.`);
    return;
  }

  console.log(`🔐 Validating Sovereign Labor deployment for ${network} (chainId ${chainId})`);

  const pause = await SystemPause.deployed();
  const feePool = await FeePool.deployed();
  const stakeManager = await StakeManager.deployed();
  const validation = await ValidationModule.deployed();
  const registry = await JobRegistry.deployed();

  const owner = await pause.owner();
  if (owner.toLowerCase() !== cfg.ownerSafe.toLowerCase()) {
    throw new Error(`SystemPause owner ${owner} != expected owner ${cfg.ownerSafe}`);
  }

  const feeToken = await feePool.token();
  if (feeToken.toLowerCase() !== cfg.tokens.agi.toLowerCase()) {
    throw new Error(`FeePool token ${feeToken} != configured $AGIALPHA ${cfg.tokens.agi}`);
  }

  const registryPause = await registry.owner();
  if (registryPause.toLowerCase() !== cfg.ownerSafe.toLowerCase()) {
    throw new Error(`JobRegistry owner ${registryPause} != expected owner ${cfg.ownerSafe}`);
  }

  const stakeTreasury = await stakeManager.treasury();
  if (stakeTreasury.toLowerCase() !== cfg.treasury.toLowerCase()) {
    console.warn(`⚠️  StakeManager treasury ${stakeTreasury} differs from config ${cfg.treasury}`);
  }

  const validatorModule = await pause.validationModule();
  if (validatorModule.toLowerCase() !== validation.address.toLowerCase()) {
    throw new Error('SystemPause validation module pointer mismatch');
  }

  console.log('✅ Sovereign Labor mainnet deployment validated. Ready for governance hand-off.');
};
