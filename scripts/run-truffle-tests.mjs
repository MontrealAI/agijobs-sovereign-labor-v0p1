import { spawn } from 'child_process';

const run = async () => {
  const ensureBuild = spawn('node', ['scripts/ensure-truffle-build.mjs'], { stdio: 'inherit' });
  const ensureCode = await new Promise((resolve) => ensureBuild.on('exit', resolve));
  if (ensureCode !== 0) {
    process.exit(ensureCode ?? 1);
  }

  const testArgs = ['truffle', 'test', '--network', 'development', '--migrate-none', '--compile-none'];
  const testProcess = spawn('npx', testArgs, { stdio: 'inherit' });

  const exitCode = await new Promise((resolve) => {
    testProcess.on('exit', (code) => resolve(code ?? 1));
  });

  process.exit(exitCode);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
