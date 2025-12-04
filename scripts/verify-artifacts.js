const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, '..', 'build', 'contracts');
const REQUIRED_CONTRACTS = [
  'SystemPause',
  'JobRegistry',
  'StakeManager',
  'ValidationModule',
  'DisputeModule',
  'FeePool',
  'ReputationEngine',
  'ArbitratorCommittee',
  'TaxPolicy',
  'IdentityRegistry',
  'AttestationRegistry',
  'CertificateNFT',
  'PlatformRegistry'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getPathStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch (error) {
    throw new Error(`Unable to stat ${targetPath}: ${error.message}`);
  }
}

assert(fs.existsSync(ARTIFACT_DIR), `Artifact directory not found: ${ARTIFACT_DIR}`);

const rows = [];

for (const contract of REQUIRED_CONTRACTS) {
  const artifactPath = path.join(ARTIFACT_DIR, `${contract}.json`);
  assert(fs.existsSync(artifactPath), `Missing artifact for ${contract} at ${artifactPath}`);

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  assert(artifact.contractName === contract, `Artifact name mismatch for ${contract}: ${artifact.contractName}`);
  assert(Array.isArray(artifact.abi), `Missing ABI array for ${contract}`);
  assert(artifact.abi.length > 0, `Empty ABI for ${contract}`);
  assert(artifact.bytecode && artifact.bytecode !== '0x', `Empty creation bytecode for ${contract}`);
  assert(artifact.deployedBytecode && artifact.deployedBytecode !== '0x', `Empty deployed bytecode for ${contract}`);
  assert(artifact.compiler && artifact.compiler.name === 'solc', `Unexpected compiler for ${contract}`);
  assert(
    artifact.compiler.version && artifact.compiler.version.startsWith('0.8.25'),
    `Unexpected compiler version for ${contract}: ${artifact.compiler && artifact.compiler.version}`
  );

  assert(artifact.sourcePath, `Missing source path for ${contract}`);
  const sourceStat = getPathStat(artifact.sourcePath);
  const artifactStat = getPathStat(artifactPath);
  assert(
    artifactStat.mtimeMs >= sourceStat.mtimeMs,
    `Artifact for ${contract} is older than its source (${artifactStat.mtime} < ${sourceStat.mtime})`
  );

  const creationSize = (artifact.bytecode.length - 2) / 2;
  const deployedSize = (artifact.deployedBytecode.length - 2) / 2;

  rows.push({
    contract,
    creationSize,
    deployedSize,
    compiledAt: new Date(artifactStat.mtime).toISOString()
  });
}

rows.sort((a, b) => b.deployedSize - a.deployedSize);

const summaryLines = [
  '| Contract | Initcode bytes | Deployed bytes | Compiled at |',
  '| --- | ---: | ---: | --- |',
  ...rows.map(({ contract, creationSize, deployedSize, compiledAt }) =>
    `| ${contract} | ${creationSize.toLocaleString()} | ${deployedSize.toLocaleString()} | ${compiledAt} |`
  )
];

const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (summaryPath) {
  fs.appendFileSync(summaryPath, '\n### Compiled artifact verification\n');
  fs.appendFileSync(summaryPath, summaryLines.join('\n') + '\n');
}

console.log('Verified compile artifacts for %d contracts.', rows.length);
