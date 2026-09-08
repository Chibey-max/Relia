/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  ...(process.env.RELIA_NEXT_DIST_DIR ? { distDir: process.env.RELIA_NEXT_DIST_DIR } : {}),
};
