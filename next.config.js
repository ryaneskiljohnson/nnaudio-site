/** @type {import('next').NextConfig} */

const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  transpilePackages: ['react-icons'],
  // Next.js 16 uses Turbopack by default; we use webpack for build (see script --webpack).
  // Empty turbopack so Next doesn't error when it sees a webpack config.
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase limit to 10MB for file uploads
    },
    // Turbopack config moved to top-level (deprecated in experimental)
  },
  // Reduce serverless bundle: exclude build-only and test files from output tracing (Vercel 250 MB limit)
  // See https://vercel.com/kb/guide/troubleshooting-function-250mb-limit
  outputFileTracingExcludes: {
    '*': [
      './scripts/**',
      '**/__tests__/**',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      // public/ is served by CDN; exclude so convert-to-webp route doesn't pull 250MB+ into the function
      './public/**',
    ],
  },
  // Keep serverless function under 250 MB: externalize heavy deps (loaded from node_modules at runtime)
  serverExternalPackages: [
    'node-cron',
    'canvas',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-sts',
    '@aws-sdk/credential-providers',
    'langchain',
    '@langchain/classic',
    '@langchain/core',
    '@langchain/openai',
    '@langchain/textsplitters',
    'jsdom',
    'jspdf',
    'openai',
    'sharp',
  ],
  async redirects() {
    return [
      { source: '/faq', destination: '/#faq', permanent: false },
    ];
  },
  async headers() {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://nnaud.io';
    return [
      {
        source: '/api/nnaudio-access/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'znecvzfogwkzinkduyuq.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'jibirpbauzqhdiwjlrmf.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'nnaud.io',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // Fix for "Cannot read properties of undefined (reading 'call')" error
    // This error occurs when webpack tries to call a function on an undefined module
    
    // Initialize plugins array if it doesn't exist
    if (!config.plugins) {
      config.plugins = [];
    }

    // Ensure resolve object exists
    if (!config.resolve) {
      config.resolve = {};
    }

    // Set fallbacks for Node.js modules that shouldn't be bundled for client
    const fallbacks = {
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      buffer: false,
      util: false,
    };

    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      ...fallbacks,
    };

    // Handle canvas and other native modules - exclude from client bundle
    if (!isServer) {
      config.resolve.fallback.canvas = false;
      
      // Ignore canvas module completely on client side
      const ignoreCanvasPlugin = new webpack.IgnorePlugin({
        resourceRegExp: /^canvas$/,
      });
      config.plugins.push(ignoreCanvasPlugin);
    }

    // Fix module resolution to prevent undefined call errors
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };

    // Ensure proper module resolution order
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }
    config.resolve.modules = [
      ...config.resolve.modules,
      'node_modules',
    ];

    // Fix for webpack 5 module federation and resolution issues
    if (!config.optimization) {
      config.optimization = {};
    }
    config.optimization.moduleIds = 'deterministic';

    // Add error handling for undefined modules
    config.resolve.unsafeCache = false;

    // Externalize AWS SDK packages to prevent bundling issues
    if (isServer) {
      if (!config.externals) {
        config.externals = [];
      }
      // Add AWS SDK packages to externals
      const awsSdkPackages = [
        '@aws-sdk/client-s3',
        '@aws-sdk/client-sts',
        '@aws-sdk/credential-providers',
      ];
      config.externals.push(({ request }, callback) => {
        if (awsSdkPackages.some(pkg => request === pkg || request?.startsWith(`${pkg}/`))) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }

    return config;
  },
};

module.exports = nextConfig;
