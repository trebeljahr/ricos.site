import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A page that renders `<meta name="robots" content="noindex">` has no business
 * being in the sitemap: it lands in Ahrefs as an orphan (in the sitemap, no
 * inlinks) forever, because nothing is supposed to link to it. Reading it back
 * out of the prerendered HTML means the sitemap follows whatever the page
 * actually declares, instead of a second list that drifts from it.
 */
function isNoindex(url) {
  const relative = url === "/" ? "index" : url.replace(/^\//, "");
  try {
    const html = readFileSync(resolve(".next", "server", "pages", `${relative}.html`), "utf-8");
    return /<meta name="robots" content="noindex/.test(html);
  } catch {
    // Not prerendered (SSR or dynamic) — nothing to read, so keep the entry.
    return false;
  }
}

function loadHiddenR3fRoutes() {
  // Demos that exist as routes but aren't finished yet. next.config.mjs keeps
  // them out of the nav and the timeline; keep them out of the sitemap too.
  try {
    const data = JSON.parse(
      readFileSync(resolve("src", "content", "r3f-hidden-routes.json"), "utf-8"),
    );
    return new Set(data.hidden ?? []);
  } catch {
    return new Set();
  }
}

function loadContentDates() {
  const dateMap = {};
  const collections = [
    { file: "posts.json", prefix: "/posts/" },
    { file: "newsletters.json", prefix: "/newsletters/" },
    { file: "booknotes.json", prefix: "/booknotes/" },
    { file: "travelblogs.json", prefix: "/travel/" },
    { file: "podcastnotes.json", prefix: "/podcastnotes/" },
  ];

  for (const { file } of collections) {
    try {
      const data = JSON.parse(readFileSync(resolve(".velite", file), "utf-8"));
      for (const item of data) {
        if (item.link) {
          dateMap[item.link] = item["date-last-updated"] || item.date || null;
        }
      }
    } catch {
      // velite data may not exist yet during first build
    }
  }

  return dateMap;
}

const contentDates = loadContentDates();
const hiddenR3fRoutes = loadHiddenR3fRoutes();

/** @type {import('next-sitemap').IConfig} */
const nextSitemapConfig = {
  siteUrl: "https://ricos.site",
  generateIndexSitemap: false,
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/" }],
    additionalSitemaps: [],
  },
  exclude: ["/email-signup-success", "/email-signup-error", "/emergency", "/sub", "/midjourney"],
  changefreq: null,
  priority: null,
  transform: async (_config, url) => {
    // Exclude anything the page itself marks noindex — stub booknotes with no
    // summary written yet, and the placeholder shelves (/art, /photography/essays,
    // /photography/prints) that exist as routes but have no content yet.
    if (isNoindex(url)) return null;

    // Exclude unfinished R3F demos (see src/content/r3f-hidden-routes.json)
    if (hiddenR3fRoutes.has(url)) return null;

    const contentDate = contentDates[url];
    const lastmod = contentDate ? new Date(contentDate).toISOString() : new Date().toISOString();

    // Homepage
    if (url === "/") {
      return {
        loc: url,
        changefreq: "weekly",
        priority: 1.0,
        lastmod: new Date().toISOString(),
      };
    }

    // Listing/index pages
    const listingPages = [
      "/posts",
      "/newsletters",
      "/booknotes",
      "/photography",
      "/travel",
      "/podcastnotes",
      "/categories",
      "/quotes",
    ];
    if (listingPages.includes(url)) {
      return {
        loc: url,
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date().toISOString(),
      };
    }

    // Individual content pages
    if (
      url.startsWith("/posts/") ||
      url.startsWith("/newsletters/") ||
      url.startsWith("/booknotes/") ||
      url.startsWith("/travel/") ||
      url.startsWith("/podcastnotes/") ||
      url.startsWith("/photography/")
    ) {
      return {
        loc: url,
        changefreq: "monthly",
        priority: 0.6,
        lastmod,
      };
    }

    // R3F demo gallery: an index plus one page per finished demo. Real content,
    // but secondary to the writing, and it changes rarely once a demo is done.
    if (url === "/r3f") {
      return {
        loc: url,
        changefreq: "monthly",
        priority: 0.6,
        lastmod: new Date().toISOString(),
      };
    }
    if (url.startsWith("/r3f/")) {
      return {
        loc: url,
        changefreq: "monthly",
        priority: 0.5,
        lastmod: new Date().toISOString(),
      };
    }

    // Static pages (about, now, principles, etc.)
    return {
      loc: url,
      changefreq: "monthly",
      priority: 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};

export default nextSitemapConfig;
