const fs = require('fs');
const path = require('path');

const OwnerConfigurator = artifacts.require('OwnerConfigurator');
const SystemPause = artifacts.require('SystemPause');
const JobRegistry = artifacts.require('JobRegistry');
const StakeManager = artifacts.require('StakeManager');
const ValidationModule = artifacts.require('ValidationModule');
const FeePool = artifacts.require('FeePool');

const MODULE_KEYS = {
  JOB_REGISTRY: web3.utils.keccak256('JOB_REGISTRY'),
  STAKE_MANAGER: web3.utils.keccak256('STAKE_MANAGER'),
  VALIDATION_MODULE: web3.utils.keccak256('VALIDATION_MODULE'),
  FEE_POOL: web3.utils.keccak256('FEE_POOL')
};

const PARAMETER_KEYS = {
  JOB_FEE_PCT: web3.utils.keccak256('JOB_FEE_PCT'),
  JOB_STAKE: web3.utils.keccak256('JOB_STAKE'),
  JOB_MIN_AGENT_STAKE: web3.utils.keccak256('JOB_MIN_AGENT_STAKE'),
  STAKE_MIN_STAKE: web3.utils.keccak256('STAKE_MIN_STAKE'),
  STAKE_ROLE_MINIMUMS: web3.utils.keccak256('STAKE_ROLE_MINIMUMS'),
  STAKE_SLASHING: web3.utils.keccak256('STAKE_SLASHING'),
  VALIDATION_BOUNDS: web3.utils.keccak256('VALIDATION_BOUNDS'),
  VALIDATION_REQUIRED_APPROVALS: web3.utils.keccak256('VALIDATION_REQUIRED_APPROVALS'),
  VALIDATION_PER_JOB: web3.utils.keccak256('VALIDATION_PER_JOB'),
  FEEPOOL_BURN_PCT: web3.utils.keccak256('FEEPOOL_BURN_PCT')
};

function parseArgs(argv) {
  const options = {
    manifestPath: process.env.VALIDATOR_POLICY_MANIFEST || '',
    summaryPath: process.env.GOVERNANCE_SUMMARY_PATH || ''
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--manifest' || arg === '-m') {
      options.manifestPath = argv[i + 1] || '';
      i++;
    } else if (arg === '--summary' || arg === '-o') {
      options.summaryPath = argv[i + 1] || '';
      i++;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function ensureAbsolute(filePath) {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function readManifest(manifestPath) {
  if (!manifestPath) {
    throw new Error('Manifest path not provided. Use --manifest or set VALIDATOR_POLICY_MANIFEST.');
  }

  const resolvedPath = ensureAbsolute(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Manifest not found at ${resolvedPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  return { raw, resolvedPath };
}

function toBigInt(value, label) {
  if (value === undefined || value === null) {
    return null;
  }
  try {
    if (typeof value === 'string' && value.trim().startsWith('0x')) {
      return BigInt(value);
    }
    return BigInt(value.toString());
  } catch (err) {
    throw new Error(`${label} must be coercible to BigInt (received ${value})`);
  }
}

function toNumber(value, label) {
  if (value === undefined || value === null) {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label} must be numeric (received ${value})`);
  }
  return num;
}

function percentFromBps(label, bps) {
  const pct = Math.floor(bps / 100);
  if (bps % 100 !== 0) {
    throw new Error(`${label} must be a multiple of 100 basis points`);
  }
  if (pct > 100) {
    throw new Error(`${label} ${bps} exceeds 100%`);
  }
  return pct;
}

function encodeUint(value) {
  return web3.eth.abi.encodeParameter('uint256', value.toString());
}

function resolveAbi(contractInstance, fallbackAbi) {
  if (fallbackAbi && Array.isArray(fallbackAbi)) {
    return fallbackAbi;
  }
  if (Array.isArray(contractInstance.abi)) {
    return contractInstance.abi;
  }
  if (contractInstance.constructor) {
    if (Array.isArray(contractInstance.constructor.abi)) {
      return contractInstance.constructor.abi;
    }
    if (
      contractInstance.constructor._json &&
      Array.isArray(contractInstance.constructor._json.abi)
    ) {
      return contractInstance.constructor._json.abi;
    }
  }
  throw new Error(`ABI not found for ${contractInstance.address}`);
}

function buildEventIndex(contractInstance, contractName, abi) {
  const address = contractInstance.address.toLowerCase();
  const eventMap = new Map();
  const resolvedAbi = resolveAbi(contractInstance, abi);
  for (const item of resolvedAbi) {
    if (item.type === 'event') {
      const signature = web3.eth.abi.encodeEventSignature(item);
      eventMap.set(signature, {
        contract: contractName,
        name: item.name,
        inputs: item.inputs
      });
    }
  }
  return [address, eventMap];
}

function formatValue(value) {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value._isBigNumber || (value.toString && value.toString !== Object.prototype.toString)) {
    return value.toString();
  }
  return JSON.stringify(value);
}

function ensureDir(filePath) {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function decodeLogs(rawLogs, eventLookups) {
  const decoded = [];
  for (const log of rawLogs) {
    const address = log.address.toLowerCase();
    const eventMap = eventLookups.get(address);
    if (!eventMap) continue;
    const eventMeta = eventMap.get(log.topics[0]);
    if (!eventMeta) continue;
    let parsed;
    try {
      parsed = web3.eth.abi.decodeLog(eventMeta.inputs, log.data, log.topics.slice(1));
    } catch (err) {
      parsed = null;
    }
    decoded.push({
      contract: eventMeta.contract,
      name: eventMeta.name,
      args: parsed || {}
    });
  }
  return decoded;
}

function argsToString(args) {
  const entries = Object.entries(args).filter(([key]) => Number.isNaN(Number(key)));
  if (entries.length === 0) return '';
  return entries
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(', ');
}

module.exports = async function (callback) {
  const options = parseArgs(process.argv);

  if (options.help) {
    console.log('Usage: truffle exec scripts/owner-apply-validator-policy.js --network <network> --manifest <path> [--summary <path>]');
    console.log('Environment variables:');
    console.log('  VALIDATOR_POLICY_MANIFEST  Path to the scenario manifest (JSON).');
    console.log('  GOVERNANCE_SUMMARY_PATH    Optional path to write Markdown telemetry.');
    return callback();
  }

  try {
    const { raw: manifest, resolvedPath: manifestPath } = readManifest(options.manifestPath);
    const params = manifest.params || {};

    const platformFeeBps = toNumber(params.platformFeeBps, 'params.platformFeeBps');
    const burnBpsOfFee = toNumber(params.burnBpsOfFee, 'params.burnBpsOfFee');
    const slashBps = toNumber(params.slashBps, 'params.slashBps');
    const validatorQuorum = toNumber(params.validatorQuorum, 'params.validatorQuorum');
    const maxValidators = toNumber(params.maxValidators, 'params.maxValidators');

    const minStakeWei = toBigInt(params.minStakeWei, 'params.minStakeWei');
    const jobStakeWei = toBigInt(params.jobStakeWei, 'params.jobStakeWei');
    const minAgentStakeWei = toBigInt(params.minAgentStakeWei, 'params.minAgentStakeWei');
    const agentMinStakeWei = toBigInt(params.agentMinStakeWei, 'params.agentMinStakeWei');
    const validatorMinStakeWei = toBigInt(params.validatorMinStakeWei, 'params.validatorMinStakeWei');
    const platformMinStakeWei = toBigInt(params.platformMinStakeWei, 'params.platformMinStakeWei');
    const requiredApprovals = toNumber(params.requiredValidatorApprovals, 'params.requiredValidatorApprovals');

    if (platformFeeBps !== null && platformFeeBps < 0) {
      throw new Error('params.platformFeeBps must be non-negative');
    }
    if (burnBpsOfFee !== null && burnBpsOfFee < 0) {
      throw new Error('params.burnBpsOfFee must be non-negative');
    }
    if (slashBps !== null && (slashBps < 0 || slashBps > 10000)) {
      throw new Error('params.slashBps must be between 0 and 10,000');
    }
    if (validatorQuorum !== null && validatorQuorum <= 0) {
      throw new Error('params.validatorQuorum must be positive');
    }

    const configurator = await OwnerConfigurator.deployed();
    const pause = await SystemPause.deployed();
    const job = await JobRegistry.deployed();
    const stake = await StakeManager.deployed();
    const validation = await ValidationModule.deployed();
    let feePool;
    try {
      feePool = await FeePool.deployed();
    } catch (err) {
      feePool = null;
    }

    const [chainId, operator, oldState] = await Promise.all([
      web3.eth.getChainId(),
      web3.eth.getAccounts().then((accounts) => accounts[0]),
      (async () => {
        const [
          currentMinStake,
          currentAgentMin,
          currentValidatorMin,
          currentPlatformMin,
          currentEmployerSlash,
          currentTreasurySlash,
          currentFeePct,
          currentJobStake,
          currentMinAgentStake,
          currentRequiredApprovals,
          currentMinValidators,
          currentMaxValidators,
          currentValidatorsPerJob,
          currentBurnPct
        ] = await Promise.all([
          stake.minStake(),
          stake.roleMinimumStake(0),
          stake.roleMinimumStake(1),
          stake.roleMinimumStake(2),
          stake.employerSlashPct(),
          stake.treasurySlashPct(),
          job.feePct(),
          job.jobStake(),
          job.minAgentStake(),
          validation.requiredValidatorApprovals(),
          validation.minValidators(),
          validation.maxValidators(),
          validation.validatorsPerJob(),
          feePool ? feePool.burnPct() : Promise.resolve(null)
        ]);

        return {
          currentMinStake,
          currentAgentMin,
          currentValidatorMin,
          currentPlatformMin,
          currentEmployerSlash,
          currentTreasurySlash,
          currentFeePct,
          currentJobStake,
          currentMinAgentStake,
          currentRequiredApprovals,
          currentMinValidators,
          currentMaxValidators,
          currentValidatorsPerJob,
          currentBurnPct
        };
      })()
    ]);

    const operations = [];

    const desiredMinStake = minStakeWei !== null ? minStakeWei : BigInt(oldState.currentMinStake.toString());
    if (desiredMinStake <= 0n) {
      throw new Error('Resolved minimum stake must be greater than zero');
    }

    if (desiredMinStake.toString() !== oldState.currentMinStake.toString()) {
      const callData = stake.contract.methods.setMinStake(desiredMinStake.toString()).encodeABI();
      operations.push({
        description: 'StakeManager.setMinStake',
        moduleKey: MODULE_KEYS.STAKE_MANAGER,
        parameterKey: PARAMETER_KEYS.STAKE_MIN_STAKE,
        target: pause.address,
        callData: pause.contract.methods
          .executeGovernanceCall(stake.address, callData)
          .encodeABI(),
        oldValue: encodeUint(oldState.currentMinStake),
        newValue: encodeUint(desiredMinStake),
        summary: {
          module: 'StakeManager',
          parameter: 'minStake',
          from: oldState.currentMinStake.toString(),
          to: desiredMinStake.toString(),
          unit: 'wei'
        }
      });
    }

    const desiredAgentMin = agentMinStakeWei || minStakeWei || BigInt(oldState.currentAgentMin.toString());
    const desiredValidatorMin = validatorMinStakeWei || minStakeWei || BigInt(oldState.currentValidatorMin.toString());
    const desiredPlatformMin = platformMinStakeWei || minStakeWei || BigInt(oldState.currentPlatformMin.toString());

    if (
      desiredAgentMin.toString() !== oldState.currentAgentMin.toString() ||
      desiredValidatorMin.toString() !== oldState.currentValidatorMin.toString() ||
      desiredPlatformMin.toString() !== oldState.currentPlatformMin.toString()
    ) {
      const callData = stake.contract.methods
        .setRoleMinimums(
          desiredAgentMin.toString(),
          desiredValidatorMin.toString(),
          desiredPlatformMin.toString()
        )
        .encodeABI();
      operations.push({
        description: 'StakeManager.setRoleMinimums',
        moduleKey: MODULE_KEYS.STAKE_MANAGER,
        parameterKey: PARAMETER_KEYS.STAKE_ROLE_MINIMUMS,
        target: pause.address,
        callData: pause.contract.methods
          .executeGovernanceCall(stake.address, callData)
          .encodeABI(),
        oldValue: web3.eth.abi.encodeParameters(
          ['uint256', 'uint256', 'uint256'],
          [
            oldState.currentAgentMin.toString(),
            oldState.currentValidatorMin.toString(),
            oldState.currentPlatformMin.toString()
          ]
        ),
        newValue: web3.eth.abi.encodeParameters(
          ['uint256', 'uint256', 'uint256'],
          [desiredAgentMin.toString(), desiredValidatorMin.toString(), desiredPlatformMin.toString()]
        ),
        summary: {
          module: 'StakeManager',
          parameter: 'roleMinimums',
          from: `${oldState.currentAgentMin}/${oldState.currentValidatorMin}/${oldState.currentPlatformMin}`,
          to: `${desiredAgentMin}/${desiredValidatorMin}/${desiredPlatformMin}`,
          unit: 'wei'
        }
      });
    }

    if (slashBps !== null) {
      const employerPct = 10000 - slashBps;
      const treasuryPct = slashBps;
      if (
        employerPct.toString() !== oldState.currentEmployerSlash.toString() ||
        treasuryPct.toString() !== oldState.currentTreasurySlash.toString()
      ) {
        const callData = stake.contract.methods
          .setSlashingPercentages(employerPct.toString(), treasuryPct.toString())
          .encodeABI();
        operations.push({
          description: 'StakeManager.setSlashingPercentages',
          moduleKey: MODULE_KEYS.STAKE_MANAGER,
          parameterKey: PARAMETER_KEYS.STAKE_SLASHING,
          target: pause.address,
          callData: pause.contract.methods
            .executeGovernanceCall(stake.address, callData)
            .encodeABI(),
          oldValue: web3.eth.abi.encodeParameters(
            ['uint256', 'uint256'],
            [oldState.currentEmployerSlash.toString(), oldState.currentTreasurySlash.toString()]
          ),
          newValue: web3.eth.abi.encodeParameters(
            ['uint256', 'uint256'],
            [employerPct.toString(), treasuryPct.toString()]
          ),
          summary: {
            module: 'StakeManager',
            parameter: 'slashingPercentages',
            from: `${oldState.currentEmployerSlash}/${oldState.currentTreasurySlash}`,
            to: `${employerPct}/${treasuryPct}`,
            unit: 'bps'
          }
        });
      }
    }

    if (platformFeeBps !== null) {
      const platformFeePct = percentFromBps('params.platformFeeBps', platformFeeBps);
      if (platformFeePct.toString() !== oldState.currentFeePct.toString()) {
        const callData = job.contract.methods.setFeePct(platformFeePct.toString()).encodeABI();
        operations.push({
          description: 'JobRegistry.setFeePct',
          moduleKey: MODULE_KEYS.JOB_REGISTRY,
          parameterKey: PARAMETER_KEYS.JOB_FEE_PCT,
          target: pause.address,
          callData: pause.contract.methods
            .executeGovernanceCall(job.address, callData)
            .encodeABI(),
          oldValue: encodeUint(oldState.currentFeePct),
          newValue: encodeUint(platformFeePct),
          summary: {
            module: 'JobRegistry',
            parameter: 'feePct',
            from: oldState.currentFeePct.toString(),
            to: platformFeePct.toString(),
            unit: 'pct'
          }
        });
      }
    }

    const resolvedJobStake = jobStakeWei || minStakeWei;
    if (resolvedJobStake !== null && resolvedJobStake.toString() !== oldState.currentJobStake.toString()) {
      const callData = job.contract.methods.setJobStake(resolvedJobStake.toString()).encodeABI();
      operations.push({
        description: 'JobRegistry.setJobStake',
        moduleKey: MODULE_KEYS.JOB_REGISTRY,
        parameterKey: PARAMETER_KEYS.JOB_STAKE,
        target: pause.address,
        callData: pause.contract.methods
          .executeGovernanceCall(job.address, callData)
          .encodeABI(),
        oldValue: encodeUint(oldState.currentJobStake),
        newValue: encodeUint(resolvedJobStake),
        summary: {
          module: 'JobRegistry',
          parameter: 'jobStake',
          from: oldState.currentJobStake.toString(),
          to: resolvedJobStake.toString(),
          unit: 'wei'
        }
      });
    }

    const resolvedMinAgentStake = minAgentStakeWei || minStakeWei;
    if (
      resolvedMinAgentStake !== null &&
      resolvedMinAgentStake.toString() !== oldState.currentMinAgentStake.toString()
    ) {
      const callData = job.contract.methods.setMinAgentStake(resolvedMinAgentStake.toString()).encodeABI();
      operations.push({
        description: 'JobRegistry.setMinAgentStake',
        moduleKey: MODULE_KEYS.JOB_REGISTRY,
        parameterKey: PARAMETER_KEYS.JOB_MIN_AGENT_STAKE,
        target: pause.address,
        callData: pause.contract.methods
          .executeGovernanceCall(job.address, callData)
          .encodeABI(),
        oldValue: encodeUint(oldState.currentMinAgentStake),
        newValue: encodeUint(resolvedMinAgentStake),
        summary: {
          module: 'JobRegistry',
          parameter: 'minAgentStake',
          from: oldState.currentMinAgentStake.toString(),
          to: resolvedMinAgentStake.toString(),
          unit: 'wei'
        }
      });
    }

    if (validatorQuorum !== null) {
      const desiredMinValidators = validatorQuorum;
      const desiredMaxValidators = maxValidators || Math.max(validatorQuorum * 2, validatorQuorum);
      if (
        desiredMinValidators.toString() !== oldState.currentMinValidators.toString() ||
        desiredMaxValidators.toString() !== oldState.currentMaxValidators.toString()
      ) {
        const callData = validation.contract.methods
          .setValidatorBounds(desiredMinValidators.toString(), desiredMaxValidators.toString())
          .encodeABI();
        operations.push({
          description: 'ValidationModule.setValidatorBounds',
          moduleKey: MODULE_KEYS.VALIDATION_MODULE,
          parameterKey: PARAMETER_KEYS.VALIDATION_BOUNDS,
          target: pause.address,
          callData: pause.contract.methods
            .executeGovernanceCall(validation.address, callData)
            .encodeABI(),
          oldValue: web3.eth.abi.encodeParameters(
            ['uint256', 'uint256'],
            [oldState.currentMinValidators.toString(), oldState.currentMaxValidators.toString()]
          ),
          newValue: web3.eth.abi.encodeParameters(
            ['uint256', 'uint256'],
            [desiredMinValidators.toString(), desiredMaxValidators.toString()]
          ),
          summary: {
            module: 'ValidationModule',
            parameter: 'validatorBounds',
            from: `${oldState.currentMinValidators}/${oldState.currentMaxValidators}`,
            to: `${desiredMinValidators}/${desiredMaxValidators}`,
            unit: 'validators'
          }
        });
      }

      if (desiredMaxValidators.toString() !== oldState.currentValidatorsPerJob.toString()) {
        const callData = validation.contract.methods
          .setValidatorsPerJob(desiredMaxValidators.toString())
          .encodeABI();
        operations.push({
          description: 'ValidationModule.setValidatorsPerJob',
          moduleKey: MODULE_KEYS.VALIDATION_MODULE,
          parameterKey: PARAMETER_KEYS.VALIDATION_PER_JOB,
          target: pause.address,
          callData: pause.contract.methods
            .executeGovernanceCall(validation.address, callData)
            .encodeABI(),
          oldValue: encodeUint(oldState.currentValidatorsPerJob),
          newValue: encodeUint(desiredMaxValidators),
          summary: {
            module: 'ValidationModule',
            parameter: 'validatorsPerJob',
            from: oldState.currentValidatorsPerJob.toString(),
            to: desiredMaxValidators.toString(),
            unit: 'validators'
          }
        });
      }

      const approvalsTarget =
        requiredApprovals !== null ? requiredApprovals : validatorQuorum;
      if (approvalsTarget <= 0) {
        throw new Error('Resolved required validator approvals must be positive');
      }
      if (approvalsTarget.toString() !== oldState.currentRequiredApprovals.toString()) {
        const callData = validation.contract.methods
          .setRequiredValidatorApprovals(approvalsTarget.toString())
          .encodeABI();
        operations.push({
          description: 'ValidationModule.setRequiredValidatorApprovals',
          moduleKey: MODULE_KEYS.VALIDATION_MODULE,
          parameterKey: PARAMETER_KEYS.VALIDATION_REQUIRED_APPROVALS,
          target: pause.address,
          callData: pause.contract.methods
            .executeGovernanceCall(validation.address, callData)
            .encodeABI(),
          oldValue: encodeUint(oldState.currentRequiredApprovals),
          newValue: encodeUint(approvalsTarget),
          summary: {
            module: 'ValidationModule',
            parameter: 'requiredValidatorApprovals',
            from: oldState.currentRequiredApprovals.toString(),
            to: approvalsTarget.toString(),
            unit: 'validators'
          }
        });
      }
    }

    if (feePool && burnBpsOfFee !== null) {
      const burnPct = percentFromBps('params.burnBpsOfFee', burnBpsOfFee);
      if (burnPct.toString() !== (oldState.currentBurnPct || '0').toString()) {
        const callData = feePool.contract.methods.setBurnPct(burnPct.toString()).encodeABI();
        operations.push({
          description: 'FeePool.setBurnPct',
          moduleKey: MODULE_KEYS.FEE_POOL,
          parameterKey: PARAMETER_KEYS.FEEPOOL_BURN_PCT,
          target: pause.address,
          callData: pause.contract.methods
            .executeGovernanceCall(feePool.address, callData)
            .encodeABI(),
          oldValue: encodeUint(oldState.currentBurnPct || 0),
          newValue: encodeUint(burnPct),
          summary: {
            module: 'FeePool',
            parameter: 'burnPct',
            from: formatValue(oldState.currentBurnPct || 0),
            to: burnPct.toString(),
            unit: 'pct'
          }
        });
      }
    }

    if (operations.length === 0) {
      console.log('✅ No changes detected between manifest and on-chain state.');
      return callback();
    }

    const batch = operations.map((op) => [
      op.target,
      op.callData,
      op.moduleKey,
      op.parameterKey,
      op.oldValue,
      op.newValue
    ]);

    console.log('🚀 Executing validator policy scenario via OwnerConfigurator.configureBatch');
    console.log(`   Network chainId: ${chainId}`);
    console.log(`   Operator:        ${operator}`);
    console.log(`   Manifest:        ${manifestPath}`);

    const receipt = await configurator.configureBatch(batch, { from: operator });
    console.log(`📡 Transaction hash: ${receipt.tx}`);

    const eventLookups = new Map([
      buildEventIndex(configurator, 'OwnerConfigurator', OwnerConfigurator.abi),
      buildEventIndex(pause, 'SystemPause', SystemPause.abi),
      buildEventIndex(job, 'JobRegistry', JobRegistry.abi),
      buildEventIndex(stake, 'StakeManager', StakeManager.abi),
      buildEventIndex(validation, 'ValidationModule', ValidationModule.abi)
    ]);
    if (feePool) {
      eventLookups.set(...buildEventIndex(feePool, 'FeePool', FeePool.abi));
    }

    const decodedLogs = decodeLogs(receipt.receipt.rawLogs, eventLookups);

    console.log('🛰️  Telemetry stream:');
    for (const log of decodedLogs) {
      const argsText = argsToString(log.args);
      console.log(`   [${log.contract}] ${log.name}${argsText ? ` — ${argsText}` : ''}`);
    }

    const summaryLines = [];
    summaryLines.push(`# Validator policy update`);
    summaryLines.push('');
    summaryLines.push(`- **Timestamp:** ${new Date().toISOString()}`);
    summaryLines.push(`- **Chain ID:** ${chainId}`);
    summaryLines.push(`- **Operator:** ${operator}`);
    summaryLines.push(`- **Manifest:** ${manifestPath}`);
    summaryLines.push(`- **Transaction:** ${receipt.tx}`);
    summaryLines.push('');
    summaryLines.push('## Parameter changes');
    summaryLines.push('');
    for (const op of operations) {
      const { module, parameter, from, to, unit } = op.summary;
      summaryLines.push(`- **${module} → ${parameter}:** ${from} → ${to} ${unit ? `(${unit})` : ''}`.trim());
    }
    summaryLines.push('');
    summaryLines.push('## Telemetry');
    summaryLines.push('');
    for (const log of decodedLogs) {
      const argsText = argsToString(log.args);
      summaryLines.push(`- ${log.contract}.${log.name}${argsText ? ` — ${argsText}` : ''}`);
    }
    summaryLines.push('');
    summaryLines.push('## Recommended evidence commands');
    summaryLines.push('');
    summaryLines.push('- `npm run ci:governance`');
    summaryLines.push('- `npm run test:truffle:ci`');
    summaryLines.push('- `npm run test:hardhat`');
    summaryLines.push('- `npm run test:foundry`');

    const markdown = summaryLines.join('\n');

    if (options.summaryPath) {
      const outputPath = ensureAbsolute(options.summaryPath);
      ensureDir(outputPath);
      fs.writeFileSync(outputPath, markdown, 'utf8');
      console.log(`🗄️  Summary written to ${outputPath}`);
    }

    console.log('---');
    console.log(markdown);
  } catch (error) {
    console.error('❌ Scenario execution failed:', error.message);
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error(error);
    }
  }

  callback();
};
