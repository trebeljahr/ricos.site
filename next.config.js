import { withContentlayer } from "next-contentlayer";

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
    formats: ["image/avif", "image/webp"],
    path: "https://d3p2n42xtyufws.cloudfront.net/_next/image",
  },
  webpack: (config) => {
    config.infrastructureLogging = {
      level: "error",
    };

    return config;
  },
};

const configWithContentlayer = withContentlayer(nextConfig);

export default configWithContentlayer;
