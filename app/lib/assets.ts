'use client';

import { creditcoinClient, addresses, configuredAssetId, deployBlock } from './chain';
import { registryAbi } from './abi';

export interface ListedAsset {
  assetId: `0x${string}`;
  kind: number;
  buyer: `0x${string}`;
  shopSepolia: `0x${string}`;
  shopCtc: `0x${string}`;
  installment: bigint;
  windows: readonly bigint[];
}

/**
 * Every asset the registry has listed, read from its Listed events.
 *
 * Shared by /tape and /send so a demo never has to paste a raw 32-byte id from
 * a terminal — the ids come from the chain that issued them.
 */
export async function loadListedAssets(): Promise<ListedAsset[]> {
  if (/^0x[0-9a-fA-F]{64}$/.test(configuredAssetId)) {
    const asset = await creditcoinClient.readContract({
      address: addresses.registry,
      abi: registryAbi,
      functionName: 'getAsset',
      args: [configuredAssetId as `0x${string}`],
    });

    if (asset.exists) {
      return [{
        assetId: configuredAssetId as `0x${string}`,
        kind: Number(asset.kind),
        buyer: asset.buyer,
        shopSepolia: asset.shopSepolia,
        shopCtc: asset.shopCtc,
        installment: asset.installment,
        windows: [],
      }];
    }
  }

  const events = await creditcoinClient.getContractEvents({
    address: addresses.registry,
    abi: registryAbi,
    eventName: 'Listed',
    fromBlock: deployBlock,
  });

  return events.map((e) => ({
    assetId: e.args.assetId as `0x${string}`,
    kind: Number(e.args.kind ?? 0),
    buyer: e.args.buyer as `0x${string}`,
    shopSepolia: e.args.shopSepolia as `0x${string}`,
    shopCtc: e.args.shopCtc as `0x${string}`,
    installment: (e.args.installment ?? 0n) as bigint,
    windows: (e.args.windows ?? []) as readonly bigint[],
  }));
}

export function shortId(id: string): string {
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}
