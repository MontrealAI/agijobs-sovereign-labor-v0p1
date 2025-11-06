const { execSync } = require('child_process');
const fs = require('fs');

function run(command) {
  return execSync(command, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

const nodeVersion = run('node --version');
const npmVersion = run('npm --version');
const truffleInfo = run('npx truffle version');

let solcVersion = 'unknown';
for (const line of truffleInfo.split(/\r?\n/)) {
  const match = line.match(/^Solidity - (.+)$/);
  if (match) {
    solcVersion = match[1];
    break;
  }
}

const summary = [
  '### Sovereign compile status',
  `- Network: \`${process.env.GITHUB_REF_NAME || 'local'}\``,
  `- Runner: \`${process.env.RUNNER_OS || process.platform}\``,
  `- Node.js: \`${nodeVersion}\``,
  `- npm: \`${npmVersion}\``,
  `- Truffle: \`${truffleInfo.split(/\r?\n/)[0]}\``,
  `- Solidity: \`${solcVersion}\``
].join('\n');

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  fs.appendFileSync(summaryPath, summary + '\n');
} else {
  console.log(summary);
}
