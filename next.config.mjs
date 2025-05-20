/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure for Cloudflare Pages
  output: 'standalone',
  // Ensure images work properly
  images: {
    unoptimized: true,
  },
  // Preserve all files in the public folder during builds
  distDir: 'dist',
  assetPrefix: './',
  // Prevent public directory from being cleaned during builds
  cleanDistDir: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
