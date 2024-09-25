const nextSitemapConfig = {
  siteUrl: "https://www.trebeljahr.com",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", disallow: "/newsletter/*" },
      { userAgent: "*", allow: "/" },
    ],
  },
  exclude: ["/newsletter/*"],
};

export default nextSitemapConfig;
