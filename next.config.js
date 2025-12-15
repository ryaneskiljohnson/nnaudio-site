/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    styledComponents: true,
  },
  transpilePackages: ['react-icons'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase limit to 10MB for file uploads
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'nnaud.io',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
