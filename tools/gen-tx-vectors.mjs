// Generates real, locally-signed EIP-1559 transactions and records each one's
// true hash. LibTxHash must reproduce these hashes from the decoded fields
// alone. Signing is offline, so this needs no network.
import { Wallet, Transaction, getBytes } from 'ethers';
import { writeFileSync } from 'node:fs';

const wallet = new Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

const cases = [
  { label: 'typical pay() call', nonce: 7, gasLimit: 120000n, to: '0x1111111111111111111111111111111111111111',
    value: 0n, data: '0xa9059cbb' + '00'.repeat(60), maxPriorityFeePerGas: 1500000000n, maxFeePerGas: 30000000000n },
  { label: 'zero nonce and zero value', nonce: 0, gasLimit: 21000n, to: '0x2222222222222222222222222222222222222222',
    value: 0n, data: '0x', maxPriorityFeePerGas: 0n, maxFeePerGas: 1n },
  { label: 'large value and long calldata', nonce: 1234567, gasLimit: 8000000n,
    to: '0x3333333333333333333333333333333333333333', value: 123456789012345678901234567890n,
    data: '0x' + 'ab'.repeat(600), maxPriorityFeePerGas: 2000000000n, maxFeePerGas: 99000000000n },
  { label: 'single low byte calldata', nonce: 255, gasLimit: 50000n,
    to: '0x4444444444444444444444444444444444444444', value: 1n, data: '0x7f',
    maxPriorityFeePerGas: 1n, maxFeePerGas: 2n },
  { label: 'calldata exactly 55 bytes', nonce: 56, gasLimit: 60000n,
    to: '0x5555555555555555555555555555555555555555', value: 55n, data: '0x' + 'cd'.repeat(55),
    maxPriorityFeePerGas: 3n, maxFeePerGas: 4n },
];

const out = [];
for (const c of cases) {
  const tx = Transaction.from({
    type: 2, chainId: 11155111, nonce: c.nonce, gasLimit: c.gasLimit, to: c.to, value: c.value,
    data: c.data, maxPriorityFeePerGas: c.maxPriorityFeePerGas, maxFeePerGas: c.maxFeePerGas, accessList: [],
  });
  const signed = Transaction.from(await wallet.signTransaction(tx));
  out.push({
    label: c.label, hash: signed.hash, chainId: Number(signed.chainId), nonce: signed.nonce,
    gasLimit: signed.gasLimit.toString(), from: signed.from, to: signed.to,
    value: signed.value.toString(), data: signed.data,
    maxPriorityFeePerGas: signed.maxPriorityFeePerGas.toString(),
    maxFeePerGas: signed.maxFeePerGas.toString(),
    yParity: signed.signature.yParity, r: signed.signature.r, s: signed.signature.s,
  });
}

writeFileSync('test-vectors/type2-tx.json', JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} vectors`);
for (const v of out) console.log(` ${v.hash}  ${v.label}`);
