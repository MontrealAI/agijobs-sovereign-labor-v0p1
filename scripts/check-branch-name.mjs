#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const DEFAULT_SUMMARY_TITLE = 'Branch name validation';

const allowedRootBranches = new Set(['main', 'develop']);
const allowedTypes = [
  'release',
  'feature',
  'bugfix',
  'hotfix',
  'chore',
  'docs',
  'test',
  'refactor',
  'dependabot',
  'renovate',
  'codex'
];

const descriptorPattern = /^[A-Za-z0-9._-]+$/;

function writeSummary(lines) {
  const summaryPath = process.env.SUMMARY_FILE || process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  try {
    fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`);
  } catch (error) {
    console.warn(`Unable to write branch summary to ${summaryPath}:`, error);
  }
}

function printFailure(message, extraLines = []) {
  writeSummary([
    '### Branch name validation failed',
    `- Status: ❌ Fail`,
    `- Reason: ${message}`,
    ...extraLines
  ]);
  console.error(message);
  process.exitCode = 1;
}

function validateBranchName(branchName) {
  if (!branchName) {
    printFailure('Branch name could not be determined.');
    return false;
  }

  if (allowedRootBranches.has(branchName)) {
    writeSummary([
      `### ${DEFAULT_SUMMARY_TITLE}`,
      `- Branch: \`${branchName}\``,
      '- Status: ✅ Pass',
      '- Rule: Root branch allowed'
    ]);
    return true;
  }

  const segments = branchName.split('/');
  if (segments.length < 2) {
    printFailure(
      `Branch \`${branchName}\` must either be one of ${Array.from(allowedRootBranches)
        .map((name) => `\`${name}\``)
        .join(', ')} or follow the \`<type>/<descriptor>\` pattern.`,
      [`- Allowed types: ${allowedTypes.map((type) => `\`${type}\``).join(', ')}`]
    );
    return false;
  }

  const [type, ...rest] = segments;
  if (!allowedTypes.includes(type)) {
    printFailure(
      `Branch type \`${type}\` is not allowed.`,
      [`- Allowed types: ${allowedTypes.map((item) => `\`${item}\``).join(', ')}`]
    );
    return false;
  }

  const invalidSegment = rest.find((segment) => !descriptorPattern.test(segment));
  if (invalidSegment) {
    printFailure(
      `Branch segment \`${invalidSegment}\` contains invalid characters.`,
      ['- Allowed characters: letters, numbers, dot, underscore, and hyphen']
    );
    return false;
  }

  writeSummary([
    `### ${DEFAULT_SUMMARY_TITLE}`,
    `- Branch: \`${branchName}\``,
    '- Status: ✅ Pass',
    `- Rule: \`${type}/<descriptor>\``
  ]);
  return true;
}

function main() {
  const branchName = process.argv[2] || process.env.BRANCH_NAME || '';

  const isValid = validateBranchName(branchName.trim());
  if (!isValid && process.exitCode === undefined) {
    process.exitCode = 1;
  }
}

main();
