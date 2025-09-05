/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
  config.module.exprContextCritical = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      os: false,
      path: false,
      crypto: false,
      readline: false,
      stream: false,
      util: false,
      buffer: false,
      events: false,
      url: false,
      querystring: false,
      http: false,
      https: false,
      zlib: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  experimental: {
    esmExternals: 'loose'
  }
};

module.exports = nextConfig;