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
  
  // Explicitly disable directory cleaning
  cleanDistDir: false,
  
  // Add headers for all requests
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS, PUT, DELETE',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
  
  // Custom webpack configuration to preserve public files
  webpack: (config, { isServer }) => {
    // Preserve the public directory during builds
    if (!isServer) {
      config.optimization.minimize = false;
    }
    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
