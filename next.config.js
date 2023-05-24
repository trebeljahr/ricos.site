const { withContentlayer } = require("next-contentlayer");

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
  },
  imageSizes: [
    16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
    3840,
  ],
  staticPageGenerationTimeout: 600,
  experimental: {
    esmExternals: false,
  },
};

module.exports = withContentlayer(nextConfig);
