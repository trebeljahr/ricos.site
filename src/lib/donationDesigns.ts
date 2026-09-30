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
  thanks: string;
  artworks?: { src: string; alt: string }[];
  image?: { src: string; alt: string };
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
  thanks: "Thank you for supporting this project.",
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
    cardTitle: "Keep the collection growing",
    thanks:
      "Thank you for supporting the collection and the next work of art someone will discover here.",
    artworks: [
      {
        src: "/donate/sources/hokusai-wave.webp",
        alt: "A great blue wave curls over fishing boats with Mount Fuji in the distance",
      },
      {
        src: "/donate/sources/vermeer-pearl.webp",
        alt: "Vermeer's portrait of a girl in a blue and gold headscarf with a pearl earring",
      },
      {
        src: "/donate/sources/audubon-flamingo.webp",
        alt: "Audubon's American flamingo bends its long neck toward the water",
      },
    ],
    image: {
      src: "/donate/sources/collection-museum.webp",
      alt: "Paintings on the warm stone walls of the Collection of Beauty virtual museum",
    },
  },
  "fractal-garden": {
    ...night,
    invitation:
      "There is always more to explore. Your support gives me time to tend this garden of fractals.",
    cardTitle: "Help the garden grow",
    thanks:
      "Thank you for supporting more paths through the garden. There is plenty left to explore.",
    image: {
      src: "/donate/sources/mandelbrot.webp",
      alt: "The branching edge of the Mandelbrot set glows blue and gold",
    },
  },
  "track-your-time": {
    ...studio,
    accent: "#4f46e5",
    invitation:
      "Keep time on your side. Support the tracker you use to turn your work into invoices.",
    cardTitle: "Support Track Your Time",
    thanks: "Thank you for supporting the next improvement to Track Your Time.",
  },
  "sprite-tools": {
    ...night,
    layout: "studio",
    accent: "#74d99b",
    headingFont: "mono",
    invitation:
      "More time making games. Less time preparing sprite sheets. Support the tools in between.",
    cardTitle: "Support sprite-tools",
    thanks: "Thank you for supporting the tools behind your next sprite.",
  },
  conv3d: {
    ...night,
    layout: "studio",
    accent: "#5eead4",
    headingFont: "mono",
    invitation:
      "From a 3D model to something you can use on the web. Support the tools that get it there.",
    cardTitle: "Support conv3D",
    thanks: "Thank you for supporting the next improvement to conv3D.",
  },
  "gamedev-asset-library": {
    ...night,
    layout: "studio",
    accent: "#ffd84d",
    invitation: "Find the assets for your next game. Help keep the library useful.",
    cardTitle: "Support the asset library",
    thanks: "Thank you for supporting the library and the games people make with it.",
  },
  hatchkit: {
    ...studio,
    accent: "#4f46e5",
    headingFont: "mono",
    invitation:
      "More time for your app. Less time setting it up. Support the toolkit that gets you started.",
    cardTitle: "Support Hatchkit",
    thanks: "Thank you for supporting the toolkit behind the next app.",
  },
  asteroids: {
    ...night,
    accent: "#8edfff",
    headingFont: "mono",
    invitation: "One more wave. One more close call. Help keep this little space shooter going.",
    cardTitle: "Support Asteroids",
    thanks: "Thank you for supporting the next round. See you in the asteroid field.",
  },
  "minecraft-clone": {
    ...night,
    accent: "#8acb83",
    headingFont: "mono",
    invitation: "A world of blocks, built one piece at a time. Help me keep working on it.",
    cardTitle: "Support this blocky world",
    thanks: "Thank you for supporting more places to explore and build.",
  },
  "online-chess": {
    ...studio,
    background: "#f4efe6",
    accent: "#0f766e",
    headingFont: "serif",
    invitation: "A board, a friend, and the next move. Support this place to play.",
    cardTitle: "Support Online Chess",
    thanks: "Thank you for supporting the next game. Your board is waiting.",
  },
  tiao: {
    ...studio,
    background: "#f5eee4",
    accent: "#8b482b",
    headingFont: "serif",
    invitation:
      "A small board. A good opponent. Plenty to think about. Support the next game of Tiao.",
    cardTitle: "Support Tiao",
    thanks: "Thank you for supporting Tiao. Enjoy your next game.",
  },
  "mesozoic-protocol": {
    ...night,
    accent: "#becb91",
    headingFont: "mono",
    invitation: "Hold the line against the next wave. Support the work behind Mesozoic Protocol.",
    cardTitle: "Support Mesozoic Protocol",
    thanks: "Thank you for supporting the next defense. See you on the field.",
  },
  "quaternius-showcase": {
    ...studio,
    accent: "#44694a",
    invitation: "Find a model. Take a closer look. Support a better way to browse the packs.",
    cardTitle: "Support the showcase",
    thanks: "Thank you for supporting the showcase and its next improvement.",
  },
  "interactive-3d-demos": {
    ...night,
    accent: "#d3b4fa",
    invitation: "A place to play with light, water, and code. Support the next experiment.",
    cardTitle: "Support the experiments",
    thanks: "Thank you for making room for the next experiment.",
  },
  "chemistry-sketcher": {
    ...studio,
    image: {
      src: "/donate/sources/chemistry-benzene.svg",
      alt: "Skeletal diagram of benzene with alternating double bonds",
    },
    accent: "#343b49",
    headingFont: "mono",
    invitation: "Draw a molecule. Make the figure you need. Support the tools on your workbench.",
    cardTitle: "Support Chemistry Sketcher",
    thanks: "Thank you for supporting Chemistry Sketcher and your next figure.",
  },
};

export function getDonationDesign(source: DonationSource): DonationDesign {
  return (
    DONATION_DESIGNS[source.slug] ?? { ...studio, accent: source.brand?.accent ?? studio.accent }
  );
}
