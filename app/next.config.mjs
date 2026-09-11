import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // The floating dev badge overlaps bottom-left content during mobile review.
  devIndicators: false,
  outputFileTracingRoot: appDir,
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(process.env.RELIA_NEXT_DIST_DIR ? { distDir: process.env.RELIA_NEXT_DIST_DIR } : {}),
};
