const OwnerConfigurator = artifacts.require('OwnerConfigurator');
const StakeManager = artifacts.require('StakeManager');

module.exports = async function (callback) {
  try {
    const newTreasury = process.env.NEW_TREASURY;
    if (!newTreasury) {
      throw new Error('NEW_TREASURY environment variable is required');
    }

    const configurator = await OwnerConfigurator.deployed();
    const stake = await StakeManager.deployed();

    const moduleKey = web3.utils.keccak256('STAKE_MANAGER');
    const parameterKey = web3.utils.keccak256('TREASURY');

    const currentTreasury = await stake.treasury();
    const calldata = stake.contract.methods.setTreasury(newTreasury).encodeABI();

    const receipt = await configurator.configure(
      stake.address,
      calldata,
      moduleKey,
      parameterKey,
      web3.eth.abi.encodeParameter('address', currentTreasury),
      web3.eth.abi.encodeParameter('address', newTreasury)
    );

    console.log(`configure() transaction: ${receipt.tx}`);
    for (const log of receipt.logs.filter((log) => log.event === 'ParameterUpdated')) {
      console.log(`ParameterUpdated ⇒ module=${log.args.module} parameter=${log.args.parameter}`);
    }
  } catch (error) {
    console.error(error);
  }

  callback();
};
