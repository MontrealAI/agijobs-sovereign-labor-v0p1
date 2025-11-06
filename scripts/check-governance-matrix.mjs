#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build', 'contracts');

const surfaces = [
  {
    name: 'SystemPause',
    label: 'System Pause lattice',
    functions: [
      'setModules',
      'setGlobalPauser',
      'refreshPausers',
      'executeGovernanceCall',
      'pauseAll',
      'unpauseAll',
      'setGovernance',
      'transferOwnership',
      'owner'
    ],
    events: ['ModulesUpdated', 'PausersUpdated', 'GovernanceCallExecuted']
  },
  {
    name: 'JobRegistry',
    label: 'Job Registry',
    functions: [
      'applyConfiguration',
      'setJobParameters',
      'setPauser',
      'setPauserManager',
      'setIdentityRegistry',
      'setDisputeModule',
      'setValidationModule',
      'setTaxPolicy',
      'setStakeManager',
      'setFeePool',
      'pause',
      'unpause',
      'setGovernance',
      'transferOwnership',
      'owner'
    ],
    events: ['ConfigurationApplied', 'PauserUpdated', 'PauserManagerUpdated']
  },
  {
    name: 'StakeManager',
    label: 'Stake Manager',
    functions: [
      'applyConfiguration',
      'setPauser',
      'setPauserManager',
      'setFeePool',
      'setTreasury',
      'setTreasuryAllowlist',
      'setJobRegistry',
      'setValidationModule',
      'setDisputeModule',
      'pause',
      'unpause',
      'setGovernance',
      'transferOwnership',
      'owner'
    ],
    events: ['ConfigurationApplied', 'PauserUpdated', 'PauserManagerUpdated']
  },
  {
    name: 'ValidationModule',
    label: 'Validation Module',
    functions: [
      'setPauser',
      'setPauserManager',
      'setStakeManager',
      'setIdentityRegistry',
      'setReputationEngine',
      'setRandaoCoordinator',
      'setSelectionStrategy',
      'pause',
      'unpause',
      'transferOwnership',
      'owner'
    ],
    events: ['PauserUpdated', 'PauserManagerUpdated', 'ModulesUpdated']
  },
  {
    name: 'DisputeModule',
    label: 'Dispute Module',
    functions: [
      'setPauser',
      'setPauserManager',
      'setStakeManager',
      'setCommittee',
      'setTaxPolicy',
      'setDisputeFee',
      'setDisputeWindow',
      'pause',
      'unpause',
      'setGovernance',
      'transferOwnership',
      'owner'
    ],
    events: ['PauserUpdated', 'PauserManagerUpdated', 'ModulesUpdated', 'CommitteeUpdated', 'TaxPolicyUpdated']
  },
  {
    name: 'PlatformRegistry',
    label: 'Platform Registry',
    functions: [
      'applyConfiguration',
      'setPauser',
      'setPauserManager',
      'setStakeManager',
      'setReputationEngine',
      'setMinPlatformStake',
      'setRegistrar',
      'setBlacklist',
      'pause',
      'unpause',
      'transferOwnership',
      'owner'
    ],
    events: ['ConfigurationApplied', 'PauserUpdated', 'PauserManagerUpdated']
  },
  {
    name: 'FeePool',
    label: 'Fee Pool',
    functions: [
      'applyConfiguration',
      'setPauser',
      'setPauserManager',
      'setGovernance',
      'setStakeManager',
      'setTreasury',
      'setTreasuryAllowlist',
      'setTaxPolicy',
      'setRewarder',
      'pause',
      'unpause',
      'transferOwnership',
      'owner'
    ],
    events: ['ConfigurationApplied', 'PauserUpdated', 'PauserManagerUpdated', 'GovernanceUpdated', 'TreasuryUpdated']
  },
  {
    name: 'ReputationEngine',
    label: 'Reputation Engine',
    functions: [
      'setPauser',
      'setPauserManager',
      'setCaller',
      'setStakeManager',
      'setScoringWeights',
      'setValidationRewardPercentage',
      'setPremiumThreshold',
      'setBlacklist',
      'pause',
      'unpause',
      'transferOwnership',
      'owner'
    ],
    events: ['PauserUpdated', 'PauserManagerUpdated', 'CallerUpdated', 'StakeManagerUpdated', 'ScoringWeightsUpdated']
  },
  {
    name: 'ArbitratorCommittee',
    label: 'Arbitrator Committee',
    functions: [
      'setPauser',
      'setPauserManager',
      'setDisputeModule',
      'setCommitRevealWindows',
      'setAbsenteeSlash',
      'pause',
      'unpause',
      'transferOwnership',
      'owner'
    ],
    events: ['PauserUpdated', 'PauserManagerUpdated', 'TimingUpdated', 'AbsenteeSlashUpdated']
  }
];

function readArtifact(contract) {
  const artifactPath = path.join(buildDir, `${contract}.json`);
  if (!existsSync(artifactPath)) {
    throw new Error(`Missing artifact for ${contract}. Run \`npm run compile\` first.`);
  }
  return JSON.parse(readFileSync(artifactPath, 'utf8'));
}

function extractNames(abi, kind) {
  return new Set(
    abi.filter((entry) => entry.type === kind).map((entry) => entry.name)
  );
}

function checkAgialphaAlignment() {
  const constantsPath = path.join(rootDir, 'contracts', 'Constants.sol');
  const configPath = path.join(rootDir, 'deploy', 'config.mainnet.json');
  const constantsSource = readFileSync(constantsPath, 'utf8');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  const agiMatch = constantsSource.match(/address constant AGIALPHA =\s*([^;]+);/);
  const decimalsMatch = constantsSource.match(/uint8 constant AGIALPHA_DECIMALS =\s*(\d+);/);
  if (!agiMatch) {
    return 'Unable to locate AGIALPHA constant in Constants.sol';
  }
  if (!decimalsMatch) {
    return 'Unable to locate AGIALPHA decimals constant in Constants.sol';
  }
  const constantAddress = agiMatch[1].trim().toLowerCase();
  const configAddress = (config.tokens?.agi || '').trim().toLowerCase();
  if (constantAddress !== configAddress) {
    return `AGIALPHA address mismatch: Constants.sol uses ${constantAddress}, config.mainnet.json uses ${configAddress}`;
  }
  const decimals = Number(decimalsMatch[1]);
  if (decimals !== 18) {
    return `AGIALPHA decimals mismatch: expected 18, found ${decimals}`;
  }
  return null;
}

const rows = [];
const problems = [];

for (const surface of surfaces) {
  let artifact;
  try {
    artifact = readArtifact(surface.name);
  } catch (err) {
    problems.push(err.message);
    continue;
  }

  const functions = extractNames(artifact.abi, 'function');
  const events = extractNames(artifact.abi, 'event');

  const missingFunctions = surface.functions.filter((fn) => !functions.has(fn));
  const missingEvents = surface.events.filter((ev) => !events.has(ev));

  if (missingFunctions.length > 0 || missingEvents.length > 0) {
    const parts = [];
    if (missingFunctions.length > 0) {
      parts.push(`functions: ${missingFunctions.join(', ')}`);
    }
    if (missingEvents.length > 0) {
      parts.push(`events: ${missingEvents.join(', ')}`);
    }
    problems.push(`${surface.name} missing ${parts.join(' & ')}`);
  }

  rows.push({
    Surface: surface.label,
    'Missing functions': missingFunctions.length === 0 ? '—' : missingFunctions.join(', '),
    'Missing events': missingEvents.length === 0 ? '—' : missingEvents.join(', ')
  });
}

const agiIssue = checkAgialphaAlignment();
if (agiIssue) {
  problems.push(agiIssue);
}

console.log('🔍 Governance control surface audit');
if (rows.length > 0) {
  console.table(rows);
}

if (problems.length > 0) {
  console.error('\n❌ Governance surface validation failed:');
  for (const issue of problems) {
    console.error(`  • ${issue}`);
  }
  process.exit(1);
}

console.log('\n✅ Governance surfaces are present. Owner and pauser controls are intact across the deployment lattice.');
