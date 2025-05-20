/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Use standalone output instead of static export
  output: 'standalone',
  
  // Ensure images work properly
  images: {
    unoptimized: true,
  },
  
  // Fix assetPrefix to start with a leading slash
  assetPrefix: '/',
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
