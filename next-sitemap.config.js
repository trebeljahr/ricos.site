const nextSitemapConfig = {
  siteUrl: "https://ricos.site",
  generateRobotsTxt: true,
  sitemapSize: 7000,
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/" }],
  },
  exclude: ["email-signup-success", "email-signup-error", "emergency"],
};

export default nextSitemapConfig;
