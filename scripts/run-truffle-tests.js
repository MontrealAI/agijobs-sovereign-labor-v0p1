const ganache = require("ganache");
const { Web3 } = require("web3");

delete process.env.http_proxy;
delete process.env.HTTP_PROXY;
delete process.env.https_proxy;
delete process.env.HTTPS_PROXY;

const preferredPorts = [
  process.env.GANACHE_PORT && Number(process.env.GANACHE_PORT),
  8545,
  9545,
  18545
].filter(Boolean);

async function startGanache() {
  for (const port of preferredPorts) {
    const server = ganache.server({
      server: { port, host: "127.0.0.1" },
      wallet: { totalAccounts: 20 },
      logging: { quiet: false }
    });

    try {
      await server.listen(port);
      console.log(`Ganache started on http://127.0.0.1:${port}`);
      return { server, port };
    } catch (err) {
      if (err?.code === "EADDRINUSE") {
        console.warn(`Port ${port} in use, trying next candidate...`);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Unable to find an open port for Ganache.");
}

async function main() {
  let server;
  let port;

  try {
    ({ server, port } = await startGanache());
  } catch (err) {
    console.error("Failed to start Ganache:", err);
    process.exitCode = 1;
    return;
  }

  try {
    const web3 = new Web3(`http://127.0.0.1:${port}`);
    const block = await web3.eth.getBlockNumber();
    console.log(`Ganache reachable, current block: ${block}`);
    const accounts = await web3.eth.getAccounts();

    const harnessArtifact = require("../build/contracts/ConstantsHarness.json");
    const contract = new web3.eth.Contract(harnessArtifact.abi);

    const instance = await contract
      .deploy({ data: harnessArtifact.bytecode })
      .send({ from: accounts[0], gas: 6_000_000 });

    const token = await instance.methods.agiAlpha().call();
    const expected = web3.utils.toChecksumAddress("0xa61a3b3a130a9c20768eebf97e21515a6046a1fa");

    if (token !== expected) {
      throw new Error(`AGIALPHA mismatch: got ${token}, expected ${expected}`);
    }

    console.log("ConstantsHarness deployment verified.");
  } catch (healthErr) {
    console.error("Truffle smoke test failed:", healthErr);
    await server.close();
    process.exit(1);
    return;
  }

  try {
    await server.close();
    console.log("Ganache stopped.");
  } catch (closeErr) {
    console.error("Failed to stop Ganache:", closeErr);
  }
}

main().catch((err) => {
  console.error("Unexpected error running Truffle tests:", err);
  process.exit(1);
});
