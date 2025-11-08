const fs = require('fs');
const path = require('path');
const namehash = require('eth-ens-namehash');
const { ethers } = require('ethers');

const CANONICAL_AGIALPHA = '0xa61a3b3a130a9c20768eebf97e21515a6046a1fa';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ERC20_METADATA_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

function resolveConfigPath() {
  const configured = process.env.DEPLOY_CONFIG;
  if (configured && configured.trim().length > 0) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(__dirname, '../../deploy/config.mainnet.json');
}

function requireAddress(label, value) {
  try {
    return ethers.getAddress(value);
  } catch (err) {
    throw new Error(`${label} must be a valid address (received ${value || 'undefined'})`);
  }
}

function ensurePercentageMultiple(label, value, divisor) {
  if (value % divisor !== 0) {
    throw new Error(`${label} must be a multiple of ${divisor}`);
  }
  const pct = Math.floor(value / divisor);
  if (pct > 100) {
    throw new Error(`${label} ${value} exceeds 100%`);
  }
  return pct;
}

async function loadDeploymentConfig(provider) {
  const configPath = resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`Deployment config not found at ${configPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!Number.isInteger(raw.chainId)) {
    throw new Error('chainId must be an integer');
  }

  const ownerSafe = requireAddress('ownerSafe', raw.ownerSafe);
  const guardianSafe = raw.guardianSafe ? requireAddress('guardianSafe', raw.guardianSafe) : ownerSafe;
  const treasury = raw.treasury ? requireAddress('treasury', raw.treasury) : ZERO_ADDRESS;

  if (!raw.tokens || !raw.tokens.agi) {
    throw new Error('tokens.agi must be configured with the $AGIALPHA address');
  }
  const agiAddress = requireAddress('tokens.agi', raw.tokens.agi);
  if (raw.chainId === 1 && agiAddress.toLowerCase() !== CANONICAL_AGIALPHA) {
    throw new Error(`Mainnet requires $AGIALPHA = ${CANONICAL_AGIALPHA}, received ${agiAddress}`);
  }

  const agi = new ethers.Contract(agiAddress, ERC20_METADATA_ABI, provider);
  const decimals = Number(await agi.decimals());
  if (decimals !== 18) {
    throw new Error(`$AGIALPHA decimals must equal 18 (detected ${decimals})`);
  }

  const [symbol, name] = await Promise.all([
    agi.symbol().catch(() => ''),
    agi.name().catch(() => '')
  ]);
  if (symbol && symbol !== 'AGIALPHA') {
    console.warn(`⚠️  Expected $AGIALPHA symbol to equal AGIALPHA, observed ${symbol}`);
  }
  if (name && name.toLowerCase().includes('test')) {
    throw new Error(`$AGIALPHA metadata indicates a test token (${name}); aborting deployment.`);
  }

  const params = raw.params || {};
  const platformFeeBps = Number(params.platformFeeBps ?? 1000);
  const platformFeePct = ensurePercentageMultiple('params.platformFeeBps', platformFeeBps, 100);

  const burnBpsOfFee = Number(params.burnBpsOfFee ?? 100);
  const burnPct = ensurePercentageMultiple('params.burnBpsOfFee', burnBpsOfFee, 100);

  const slashBps = Number(params.slashBps ?? 500);
  if (slashBps < 0 || slashBps > 10000) {
    throw new Error('params.slashBps must be between 0 and 10_000');
  }
  const treasuryPct = slashBps;
  const employerPct = 10000 - treasuryPct;

  const validatorQuorum = Number(params.validatorQuorum ?? 3);
  if (validatorQuorum === 0) {
    throw new Error('params.validatorQuorum must be positive');
  }
  const maxValidators = Number(params.maxValidators ?? Math.max(validatorQuorum * 2, validatorQuorum));

  const minStakeWei = params.minStakeWei ? BigInt(params.minStakeWei) : 0n;
  const jobStakeWei = params.jobStakeWei ? BigInt(params.jobStakeWei) : minStakeWei;
  const disputeFeeWei = params.disputeFeeWei ? BigInt(params.disputeFeeWei) : 0n;
  const disputeWindow = Number(params.disputeWindow ?? 0);

  const identity = raw.identity || {};
  const agentRootNode = identity.agentRootNode ? namehash.hash(identity.agentRootNode) : ZERO_BYTES32;
  const clubRootNode = identity.clubRootNode ? namehash.hash(identity.clubRootNode) : ZERO_BYTES32;
  const agentMerkleRoot = identity.agentMerkleRoot || ZERO_BYTES32;
  const validatorMerkleRoot = identity.validatorMerkleRoot || ZERO_BYTES32;
  const ensRegistry = identity.ensRegistry ? requireAddress('identity.ensRegistry', identity.ensRegistry) : ZERO_ADDRESS;
  const nameWrapper = identity.nameWrapper ? requireAddress('identity.nameWrapper', identity.nameWrapper) : ZERO_ADDRESS;

  const tax = raw.tax || {};
  const taxPolicyUri = tax.policyUri || '';
  const taxDescription = tax.description || '';

  return {
    chainId: raw.chainId,
    ownerSafe,
    guardianSafe,
    treasury,
    tokens: {
      agi: agiAddress,
      decimals,
      symbol,
      name
    },
    params: {
      platformFeeBps,
      platformFeePct,
      burnBpsOfFee,
      burnPct,
      slashBps,
      employerPct,
      treasuryPct,
      validatorQuorum,
      maxValidators,
      minStakeWei,
      jobStakeWei,
      disputeFeeWei,
      disputeWindow
    },
    identity: {
      ensRegistry,
      nameWrapper,
      agentRootNode,
      clubRootNode,
      agentMerkleRoot,
      validatorMerkleRoot
    },
    tax: {
      policyUri: taxPolicyUri,
      description: taxDescription
    }
  };
}

module.exports = {
  loadDeploymentConfig,
  CANONICAL_AGIALPHA,
  ZERO_ADDRESS,
  ZERO_BYTES32,
  ERC20_METADATA_ABI
};
