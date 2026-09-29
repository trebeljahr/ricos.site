import type { DonationSource } from "./donation";

export type DonationDesign = {
  layout: "gallery" | "immersive" | "studio";
  background: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
  dark: boolean;
  headingFont?: "serif" | "mono";
  invitation: string;
  cardTitle: string;
  image?: { src: string; alt: string; caption: string };
};

const studio: DonationDesign = {
  layout: "studio",
  background: "#f5f6fa",
  surface: "#ffffff",
  ink: "#202633",
  muted: "#596171",
  border: "#d9dce5",
  accent: "#4f46e5",
  dark: false,
  invitation: "If this project was useful to you, a donation gives me time to keep working on it.",
  cardTitle: "Support this project",
};

const night: DonationDesign = {
  ...studio,
  layout: "immersive",
  background: "#0a1116",
  surface: "#101d25",
  ink: "#f5f1d1",
  muted: "#b6c3c7",
  border: "#35464d",
  accent: "#f5cc75",
  dark: true,
};

// Full-page design choices live here, separate from the compact source badges.
// All images are local. Unknown slugs never reach this registry.
export const DONATION_DESIGNS: Record<string, DonationDesign> = {
  "collection-of-beauty": {
    ...studio,
    layout: "gallery",
    background: "#f8f5ee",
    surface: "#fffdf8",
    ink: "#302720",
    muted: "#73675b",
    border: "#ded5c7",
    accent: "#873753",
    headingFont: "serif",
    invitation:
      "More art to discover. More time to build the collection. Your support makes room for both.",
    cardTitle: "Support the collection",
    image: {
      src: "/donate/sources/collection-museum.webp",
      alt: "Paintings on the warm stone walls of the Collection of Beauty virtual museum",
      caption: "Inside the museum · The Impressionist gallery",
    },
  },
  "fractal-garden": {
    ...night,
    invitation:
      "There is always more to explore. Your support gives me time to tend this garden of fractals.",
    cardTitle: "Support the garden",
    image: {
      src: "/donate/sources/mandelbrot.webp",
      alt: "The branching edge of the Mandelbrot set glows blue and gold",
      caption: "The Mandelbrot set · A small window into infinity",
    },
  },
  "track-your-time": { ...studio, accent: "#4f46e5" },
  "sprite-tools": { ...night, layout: "studio", accent: "#74d99b", headingFont: "mono" },
  conv3d: { ...night, layout: "studio", accent: "#5eead4", headingFont: "mono" },
  "gamedev-asset-library": { ...night, layout: "studio", accent: "#ffd84d" },
  hatchkit: { ...studio, accent: "#4f46e5", headingFont: "mono" },
  asteroids: { ...night, accent: "#8edfff", headingFont: "mono" },
  "minecraft-clone": { ...night, accent: "#8acb83", headingFont: "mono" },
  "online-chess": { ...studio, background: "#f4efe6", accent: "#0f766e", headingFont: "serif" },
  tiao: { ...studio, background: "#f5eee4", accent: "#8b482b", headingFont: "serif" },
  "mesozoic-protocol": { ...night, accent: "#becb91", headingFont: "mono" },
  "raptor-runner": { ...night, accent: "#f0c391", headingFont: "mono" },
  "quaternius-showcase": { ...studio, accent: "#44694a" },
  "interactive-3d-demos": { ...night, accent: "#d3b4fa" },
  "chemistry-sketcher": { ...studio, accent: "#343b49", headingFont: "mono" },
};

export function getDonationDesign(source: DonationSource): DonationDesign {
  return (
    DONATION_DESIGNS[source.slug] ?? { ...studio, accent: source.brand?.accent ?? studio.accent }
  );
}
