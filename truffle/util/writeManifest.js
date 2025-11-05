const fs = require('fs');
const path = require('path');

module.exports = async (network, manifest) => {
  const dir = path.join(__dirname, '../../manifests');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = manifest.chainId === 1 ? 'addresses.mainnet.json' : `addresses.${network}.json`;
  fs.writeFileSync(path.join(dir, name), JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifests/${name}`);
};
