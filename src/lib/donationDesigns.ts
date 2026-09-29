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
  purpose: string;
  thanks: string;
  share: string;
  artworks?: { src: string; alt: string; caption: string }[];
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
  purpose: "Your donation gives me time to maintain and improve this project.",
  thanks: "Thank you for supporting this project.",
  share: "Sharing the project with a friend helps, too.",
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
    purpose:
      "I find and catalogue public-domain art, check its details, and build new ways to explore it. Your donation gives me time for that work.",
    thanks:
      "Thank you for supporting the collection and the next work of art someone will discover here.",
    share: "Send a favourite painting to someone you love.",
    artworks: [
      {
        src: "/donate/sources/hokusai-wave.webp",
        alt: "A great blue wave curls over fishing boats with Mount Fuji in the distance",
        caption: "Katsushika Hokusai · The Great Wave off Kanagawa",
      },
      {
        src: "/donate/sources/vermeer-pearl.webp",
        alt: "Vermeer's portrait of a girl in a blue and gold headscarf with a pearl earring",
        caption: "Johannes Vermeer · Girl with a Pearl Earring",
      },
      {
        src: "/donate/sources/audubon-flamingo.webp",
        alt: "Audubon's American flamingo bends its long neck toward the water",
        caption: "John James Audubon · American Flamingo",
      },
    ],
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
    cardTitle: "Help the garden grow",
    purpose:
      "I build the fractal explorers and write the explanations. Your donation gives me time for new fractals and better ways to explore them.",
    thanks:
      "Thank you for supporting more paths through the garden. There is plenty left to explore.",
    share: "Found a pattern you love? Share it with a friend.",
    image: {
      src: "/donate/sources/mandelbrot.webp",
      alt: "The branching edge of the Mandelbrot set glows blue and gold",
      caption: "The Mandelbrot set · A small window into infinity",
    },
  },
  "track-your-time": {
    ...studio,
    accent: "#4f46e5",
    invitation:
      "Keep time on your side. Support the tracker you use to turn your work into invoices.",
    cardTitle: "Support Track Your Time",
    purpose: "Your donation gives me time to improve time tracking, reports, and invoices.",
    thanks: "Thank you for supporting the next improvement to Track Your Time.",
    share: "Know someone who tracks their hours? Send them Track Your Time.",
  },
  "sprite-tools": {
    ...night,
    layout: "studio",
    accent: "#74d99b",
    headingFont: "mono",
    invitation:
      "More time making games. Less time preparing sprite sheets. Support the tools in between.",
    cardTitle: "Support sprite-tools",
    purpose:
      "I work on sprite-sheet previews and exports so your assets are ready for a game. Your donation gives me time for that work.",
    thanks: "Thank you for supporting the tools behind your next sprite.",
    share: "Share sprite-tools with another game maker.",
  },
  conv3d: {
    ...night,
    layout: "studio",
    accent: "#5eead4",
    headingFont: "mono",
    invitation:
      "From a 3D model to something you can use on the web. Support the tools that get it there.",
    cardTitle: "Support conv3D",
    purpose:
      "Your donation gives me time to improve model conversion, smaller GLB files, and React component exports.",
    thanks: "Thank you for supporting the next improvement to conv3D.",
    share: "Know someone working with 3D on the web? Send them conv3D.",
  },
  "gamedev-asset-library": {
    ...night,
    layout: "studio",
    accent: "#ffd84d",
    invitation: "Find the assets for your next game. Help keep the library useful.",
    cardTitle: "Support the asset library",
    purpose:
      "I catalogue asset packs, check licenses, and build previews. Your donation gives me time to maintain the library.",
    thanks: "Thank you for supporting the library and the games people make with it.",
    share: "Share a useful asset pack with another game maker.",
  },
  hatchkit: {
    ...studio,
    accent: "#4f46e5",
    headingFont: "mono",
    invitation:
      "More time for your app. Less time setting it up. Support the toolkit that gets you started.",
    cardTitle: "Support Hatchkit",
    purpose:
      "Your donation gives me time to maintain the scaffolding, deployment tools, and documentation.",
    thanks: "Thank you for supporting the toolkit behind the next app.",
    share: "Share Hatchkit with someone starting a project.",
  },
  asteroids: {
    ...night,
    accent: "#8edfff",
    headingFont: "mono",
    invitation: "One more wave. One more close call. Help keep this little space shooter going.",
    cardTitle: "Support Asteroids",
    purpose:
      "Your donation gives me time to improve the controls and online matches, and fix the bugs between rounds.",
    thanks: "Thank you for supporting the next round. See you in the asteroid field.",
    share: "Invite a friend for a round of Asteroids.",
  },
  "minecraft-clone": {
    ...night,
    accent: "#8acb83",
    headingFont: "mono",
    invitation: "A world of blocks, built one piece at a time. Help me keep working on it.",
    cardTitle: "Support this blocky world",
    purpose: "Your donation gives me time to improve world generation, building, and performance.",
    thanks: "Thank you for supporting more places to explore and build.",
    share: "Show a friend what you built.",
  },
  "online-chess": {
    ...studio,
    background: "#f4efe6",
    accent: "#0f766e",
    headingFont: "serif",
    invitation: "A board, a friend, and the next move. Support this place to play.",
    cardTitle: "Support Online Chess",
    purpose: "Your donation gives me time to maintain online games, clocks, and the lobby.",
    thanks: "Thank you for supporting the next game. Your board is waiting.",
    share: "Invite a friend to a game of chess.",
  },
  tiao: {
    ...studio,
    background: "#f5eee4",
    accent: "#8b482b",
    headingFont: "serif",
    invitation:
      "A small board. A good opponent. Plenty to think about. Support the next game of Tiao.",
    cardTitle: "Support Tiao",
    purpose: "Your donation gives me time to improve online play and the computer opponent.",
    thanks: "Thank you for supporting Tiao. Enjoy your next game.",
    share: "Teach a friend to play Tiao.",
  },
  "mesozoic-protocol": {
    ...night,
    accent: "#becb91",
    headingFont: "mono",
    invitation: "Hold the line against the next wave. Support the work behind Mesozoic Protocol.",
    cardTitle: "Support Mesozoic Protocol",
    purpose:
      "Your donation gives me time to work on the dinosaurs, defenses, and battles in the game.",
    thanks: "Thank you for supporting the next defense. See you on the field.",
    share: "Send the demo to a friend who enjoys strategy games.",
  },
  "raptor-runner": {
    ...night,
    accent: "#f0c391",
    headingFont: "mono",
    invitation: "Another run. Another near miss. Help this little raptor keep going.",
    cardTitle: "Support Raptor Runner",
    purpose:
      "Your donation gives me time to work on the levels, controls, and the small details along the way.",
    thanks: "Thank you for supporting Raptor Runner. Good luck on your next run.",
    share: "Challenge a friend to beat your run.",
  },
  "quaternius-showcase": {
    ...studio,
    accent: "#44694a",
    invitation: "Find a model. Take a closer look. Support a better way to browse the packs.",
    cardTitle: "Support the showcase",
    purpose:
      "Your donation supports my work on the viewer and catalogue. Quaternius creates the models.",
    thanks: "Thank you for supporting the showcase and its next improvement.",
    share: "Share a model pack with someone making a game.",
  },
  "interactive-3d-demos": {
    ...night,
    accent: "#d3b4fa",
    invitation: "A place to play with light, water, and code. Support the next experiment.",
    cardTitle: "Support the experiments",
    purpose: "Your donation gives me time to build and maintain these interactive 3D scenes.",
    thanks: "Thank you for making room for the next experiment.",
    share: "Send a favourite scene to a curious friend.",
  },
  "chemistry-sketcher": {
    ...studio,
    image: {
      src: "/donate/sources/chemistry-benzene.svg",
      alt: "Skeletal diagram of benzene with alternating double bonds",
      caption: "From a molecule to a figure",
    },
    accent: "#343b49",
    headingFont: "mono",
    invitation: "Draw a molecule. Make the figure you need. Support the tools on your workbench.",
    cardTitle: "Support Chemistry Sketcher",
    purpose: "Your donation gives me time to improve molecule drawing and figure exports.",
    thanks: "Thank you for supporting Chemistry Sketcher and your next figure.",
    share: "Share Chemistry Sketcher with someone who draws molecules.",
  },
};

export function getDonationDesign(source: DonationSource): DonationDesign {
  return (
    DONATION_DESIGNS[source.slug] ?? { ...studio, accent: source.brand?.accent ?? studio.accent }
  );
}
