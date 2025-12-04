import { existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(projectRoot, 'build', 'contracts');
const contractsDir = path.join(projectRoot, 'contracts');
const migrationsDir = path.join(projectRoot, 'migrations');

const latestMtime = (dir, filterFn) => {
  if (!existsSync(dir)) return 0;

  return readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return latestMtime(fullPath, filterFn);
      }
      if (filterFn && !filterFn(fullPath)) {
        return 0;
      }
      return statSync(fullPath).mtimeMs;
    })
    .reduce((latest, mtime) => Math.max(latest, mtime), 0);
};

const hasArtifacts = () => existsSync(buildDir) && readdirSync(buildDir).some((file) => file.endsWith('.json'));

const latestArtifactMtime = () => {
  if (!hasArtifacts()) return 0;
  return latestMtime(buildDir, (filePath) => filePath.endsWith('.json'));
};

const latestSourceMtime = () => {
  const latestContracts = latestMtime(contractsDir, (filePath) => filePath.endsWith('.sol'));
  const latestMigrations = latestMtime(migrationsDir, (filePath) => filePath.endsWith('.js'));
  return Math.max(latestContracts, latestMigrations);
};

const artifactsAreStale = latestSourceMtime() > latestArtifactMtime();

if (!hasArtifacts() || artifactsAreStale) {
  const reason = !hasArtifacts()
    ? 'No Truffle build artifacts detected'
    : 'Truffle sources are newer than existing build artifacts';
  console.log(`${reason}; compiling before running tests...`);
  execSync('npx truffle compile', { stdio: 'inherit' });
} else {
  console.log('Reusing up-to-date Truffle build artifacts at build/contracts.');
}
