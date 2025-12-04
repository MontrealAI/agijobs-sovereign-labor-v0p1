import { existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(projectRoot, 'build', 'contracts');

const hasArtifacts = () => existsSync(buildDir) && readdirSync(buildDir).some((file) => file.endsWith('.json'));

if (!hasArtifacts()) {
  console.log('No Truffle build artifacts detected; compiling before running tests...');
  execSync('npx truffle compile', { stdio: 'inherit' });
} else {
  console.log('Reusing existing Truffle build artifacts at build/contracts.');
}
