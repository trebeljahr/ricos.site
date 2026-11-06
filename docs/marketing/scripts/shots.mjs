// The screenshots of ricos.site, shared by capture-screenshots.mjs and
// write-manifest.mjs.
export const baseUrl = (process.env.BASE_URL ?? "https://ricos.site").replace(/\/$/, "");

const desktop = { width: 1600, height: 1000 };
const mobile = { width: 390, height: 844 };

// theme: next-themes reads localStorage "theme"; the site defaults to dark.
export const shots = [
  { name: "home-dark", path: "/", viewport: desktop, theme: "dark" },
  { name: "home-light", path: "/", viewport: desktop, theme: "light" },
  { name: "full-adder-dark", path: "/computer/full-adder", viewport: desktop, theme: "dark" },
  { name: "die-zoom-dark", path: "/computer/die-zoom", viewport: desktop, theme: "dark" },
  // Scrolled so the "Games" heading sits under the header and the cards show.
  {
    name: "projects-dark",
    path: "/projects",
    viewport: desktop,
    theme: "dark",
    scrollTo: "h2:has-text('Games')",
  },
  { name: "photography-dark", path: "/photography", viewport: desktop, theme: "dark" },
  { name: "home-mobile-dark", path: "/", viewport: mobile, theme: "dark", mobile: true },
];
