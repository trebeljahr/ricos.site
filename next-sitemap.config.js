const nextSitemapConfig = {
  siteUrl: "https://ricos.site",
  generateIndexSitemap: false,
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/" }],
  },
  exclude: [
    "https://ricos.site/email-signup-success",
    "https://ricos.site/email-signup-error",
    "https://ricos.site/emergency",
  ],
};

export default nextSitemapConfig;
