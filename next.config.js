import { withContentlayer } from "next-contentlayer";

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
  },
};

export default withContentlayer(nextConfig);
