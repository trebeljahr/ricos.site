// Which projects may send donors to /donate?from=<slug>, and how each one
// looks. Kept apart from src/lib/donation.ts so the post strip, which imports
// that file, does not pull the whole project catalogue into every post.
import type { DonationBrand, DonationSource } from "./donation";
import { PROJECTS } from "./projects";

// Projects that link to /donate but have no entry on /projects yet.
const UNLISTED_SOURCES: DonationSource[] = [
  {
    slug: "chemistry-sketcher",
    name: "Chemistry Sketcher",
    url: "https://chemistry.trebeljahr.com",
    subtitle: "Draw a molecule once, then export it for a paper in the form the figure needs.",
  },
];

// Each project's colour and icon, taken from its own repo (file noted per
// entry). Links on the card use the accent as text, so where a project's own
// colour fails 4.5:1 on the white or the dark card, the entry uses the nearest
// darker or lighter shade of the same colour and says so. A project without an
// entry, such as Chemistry Sketcher (neutral black and white, no icon), still
// gets its name and screenshot, in the site's own blue.
const icon = (file: string) => `/donate/sources/${file}`;

export const SOURCE_BRANDS: Record<string, DonationBrand> = {
  // Gold highlight #f5cc75 (styles/ExplorerPanel.module.css), deepened for white.
  "fractal-garden": { accent: "#8a6414", accentDark: "#f5cc75", icon: icon("fractal-garden.webp") },
  // Plum of the crest (src/app/icon-source.svg), lightened for dark.
  "collection-of-beauty": {
    accent: "#c93b65",
    accentDark: "#f08aa8",
    icon: icon("collection-of-beauty.svg"),
    iconBackground: "#fdfcf8",
  },
  // --brand, light and dark (packages/client/src/styles/globals.css).
  "track-your-time": {
    accent: "#4f46e5",
    accentDark: "#818cf8",
    icon: icon("track-your-time.svg"),
  },
  // Green of the generated icon (src/app/apple-icon.tsx), darkened for white.
  "sprite-tools": { accent: "#15803d", accentDark: "#22c55e", icon: icon("sprite-tools.svg") },
  // Landing --c3-accent #0d9488 darkened a step for white; dark as is.
  conv3d: { accent: "#0f766e", accentDark: "#5eead4", icon: icon("conv3d.svg") },
  // Icon gold #8a7222 (src/app/icon-source.svg) on white, --accent on dark.
  "gamedev-asset-library": {
    accent: "#8a7222",
    accentDark: "#ffd84d",
    icon: icon("gamedev-asset-library.svg"),
  },
  // Landing --hk-accent, light and dark (docs/app/(home)/page.module.css).
  hatchkit: { accent: "#4f46e5", accentDark: "#a5b4fc", icon: icon("hatchkit.svg") },
  // Primary button blue #276790 on white, link cyan #8edfff on dark (client/src/style.css).
  asteroids: { accent: "#276790", accentDark: "#8edfff", icon: icon("asteroids.svg") },
  // Progress green #4caf50 (public/styles/main.css), darkened for white.
  "minecraft-clone": {
    accent: "#2e7d32",
    accentDark: "#4caf50",
    icon: icon("minecraft-clone.webp"),
  },
  // --accent teal (src/styles.css), lightened for dark: the site has no dark mode.
  "online-chess": {
    accent: "#0f766e",
    accentDark: "#2dd4bf",
    icon: icon("online-chess.svg"),
    iconBackground: "#f4efe6",
  },
};

export function getDonationSource(slug: unknown): DonationSource | null {
  if (typeof slug !== "string") return null;
  const brand = SOURCE_BRANDS[slug];
  const project = PROJECTS.find((entry) => entry.slug === slug);
  if (project) {
    // An on-site link such as /r3f needs no way back: the donor is already here.
    const url = /^https?:\/\//.test(project.link) ? project.link : undefined;
    return {
      slug,
      name: project.title,
      url,
      subtitle: project.subtitle,
      cover: { src: project.cover.src, alt: project.cover.alt },
      brand,
    };
  }
  const unlisted = UNLISTED_SOURCES.find((source) => source.slug === slug);
  return unlisted ? { ...unlisted, brand } : null;
}
