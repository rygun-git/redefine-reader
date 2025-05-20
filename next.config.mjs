/** @type {import('next').NextConfig} */
const nextConfig = {
  // Custom build directory
  distDir: 'dist',
  
  // Fix assetPrefix to start with a leading slash
  assetPrefix: '/',
  
  // Prevent cleaning the output directory
  cleanDistDir: false,
  
  // Output as a static site
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configure image domains
  images: {
    domains: ['llvbible.com'],
    unoptimized: true,
  },
}

export default nextConfig
