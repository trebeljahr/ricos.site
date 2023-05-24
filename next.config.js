const { withContentlayer } = require("next-contentlayer");

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
  },
  staticPageGenerationTimeout: 600,
  experimental: {
    esmExternals: false,
  },
};

module.exports = withContentlayer(nextConfig);
