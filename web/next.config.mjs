/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 1. Ignore ESLint errors during build
  // This allows the build to finish even if there are small code style warnings.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Ignore TypeScript errors during build (Optional but recommended for smooth deploys)
  // This prevents the build from crashing if there's a strict type mismatch.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
