#!/usr/bin/env node
// Foundry expects a native `solc` binary. This environment has no egress to
// binaries.soliditylang.org, so this shim speaks the same CLI contract
// (--version, --standard-json on stdin) backed by the npm solc wasm build.
const solc = require('solc');

if (process.argv.includes('--version')) {
  const v = solc.version();
  process.stdout.write(`solc, the solidity compiler commandline interface\nVersion: ${v}\n`);
  process.exit(0);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    process.stdout.write(solc.compile(input));
  } catch (e) {
    process.stdout.write(JSON.stringify({ errors: [{ severity: 'error', type: 'ShimError', message: String(e) }] }));
    process.exit(1);
  }
});
