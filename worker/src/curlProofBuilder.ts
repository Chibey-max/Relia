import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { BatchContinuityResponse, BatchProofResult } from '@gluwa/usc-sdk/dist/proof-provider/index.js';

const execFileAsync = promisify(execFile);

export interface ProofBuilderLike {
  waitUntilHeightAttested(
    chainKey: number,
    targetHeight: number,
    pollIntervalMs?: number,
    waitTimeoutMs?: number,
    extraDelayMs?: number,
  ): Promise<void>;
  getBatchProof(transactionHashes: string[]): Promise<BatchProofResult>;
}

export class CurlProofBuilder implements ProofBuilderLike {
  constructor(
    private readonly chainKey: number,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async waitUntilHeightAttested(
    chainKey: number,
    targetHeight: number,
    pollIntervalMs = 15000,
    waitTimeoutMs = 900000,
    extraDelayMs = 5000,
  ): Promise<void> {
    const started = Date.now();
    for (;;) {
      if (Date.now() - started > waitTimeoutMs) {
        throw new Error(`Timeout waiting for height ${targetHeight} to be attested on chain key ${chainKey}`);
      }
      const { attestedHeight } = await this.getJson<{ attestedHeight?: number }>(`/api/v1/attested-height/${chainKey}`);
      if (typeof attestedHeight === 'number' && attestedHeight >= targetHeight) {
        await sleep(extraDelayMs);
        return;
      }
      await sleep(pollIntervalMs);
    }
  }

  async getBatchProof(transactionHashes: string[]): Promise<BatchProofResult> {
    try {
      const data = await this.getJson<BatchContinuityResponse>(
        `/api/v1/proof-batch-by-tx/${this.chainKey}`,
        transactionHashes,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getJson<T>(path: string, body?: unknown): Promise<T> {
    const args = [
      '-sS',
      '--fail-with-body',
      '--connect-timeout',
      '20',
      '--max-time',
      String(Math.ceil(this.timeoutMs / 1000)),
      `${this.baseUrl.replace(/\/$/, '')}${path}`,
    ];
    if (body !== undefined) {
      args.splice(-1, 0, '-H', 'content-type: application/json', '-d', JSON.stringify(body));
    }
    const { stdout } = await execFileAsync('curl', args, { maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(stdout) as T;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
