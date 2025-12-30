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
    // Turbopack config moved to top-level (deprecated in experimental)
  },
  // Exclude node-cron and canvas from Edge runtime bundling (they use native modules)
  serverExternalPackages: ['node-cron', 'canvas'],
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

    return config;
  },
};

module.exports = nextConfig;
