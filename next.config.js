const { withContentlayer } = require("next-contentlayer");

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
  },
};

module.exports = withContentlayer(nextConfig);
