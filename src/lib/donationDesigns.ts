import type { DonationOption, DonationSource } from "./donation";

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
  paymentOptions: Record<string, Pick<DonationOption, "note" | "emoji">>;
  thanks: string;
  artworks?: { src: string; alt: string }[];
  image?: { src: string; alt: string };
};

type PaymentLabel = [emoji: string, note: string];

function paymentOptions(
  ...options: [PaymentLabel, PaymentLabel, PaymentLabel, PaymentLabel]
): DonationDesign["paymentOptions"] {
  return Object.fromEntries(
    ["EUR 3", "EUR 5", "EUR 10", "EUR 25"].map((amount, index) => [
      amount,
      { emoji: options[index][0], note: options[index][1] },
    ]),
  );
}

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
  paymentOptions: paymentOptions(
    ["🍪", "A few cookies"],
    ["☕", "A cup of coffee"],
    ["🍕", "Pizza for a coding night"],
    ["💛", "A very generous thank you"],
  ),
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
    paymentOptions: paymentOptions(
      ["🎨", "A little colour"],
      ["🖌️", "Another brushstroke"],
      ["🖼️", "Room for more art"],
      ["🏛️", "For the whole collection"],
    ),
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
    paymentOptions: paymentOptions(
      ["🌱", "Plant a seed"],
      ["🌿", "A little new growth"],
      ["🌸", "Room to bloom"],
      ["🌳", "Help the garden grow"],
    ),
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
    paymentOptions: paymentOptions(
      ["⏱️", "A moment of support"],
      ["☕", "A well-timed coffee"],
      ["🕰️", "Time for the next fix"],
      ["💛", "For the hours ahead"],
    ),
    accent: "#4f46e5",
    invitation:
      "Keep time on your side. Support the tracker you use to turn your work into invoices.",
    cardTitle: "Support Track Your Time",
    thanks: "Thank you for supporting the next improvement to Track Your Time.",
  },
  "sprite-tools": {
    ...night,
    paymentOptions: paymentOptions(
      ["👾", "A little pixel love"],
      ["🎞️", "One more frame"],
      ["🎮", "For the next game"],
      ["🕹️", "For the whole sprite sheet"],
    ),
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
    paymentOptions: paymentOptions(
      ["🧊", "A little 3D love"],
      ["🔺", "A few more polygons"],
      ["🛠️", "For the next conversion"],
      ["🌐", "More 3D on the web"],
    ),
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
    paymentOptions: paymentOptions(
      ["🧩", "One more piece"],
      ["📦", "For the next asset pack"],
      ["🎮", "For the next game"],
      ["📚", "For the whole library"],
    ),
    layout: "studio",
    accent: "#ffd84d",
    invitation: "Find the assets for your next game. Help keep the library useful.",
    cardTitle: "Support the asset library",
    thanks: "Thank you for supporting the library and the games people make with it.",
  },
  hatchkit: {
    ...studio,
    paymentOptions: paymentOptions(
      ["🥚", "A small beginning"],
      ["🐣", "Help an idea hatch"],
      ["🛠️", "For the next build"],
      ["🚀", "For the next launch"],
    ),
    accent: "#4f46e5",
    headingFont: "mono",
    invitation:
      "More time for your app. Less time setting it up. Support the toolkit that gets you started.",
    cardTitle: "Support Hatchkit",
    thanks: "Thank you for supporting the toolkit behind the next app.",
  },
  asteroids: {
    ...night,
    paymentOptions: paymentOptions(
      ["☄️", "A little space dust"],
      ["🛰️", "Keep us in orbit"],
      ["🚀", "Fuel for another round"],
      ["🌌", "For the whole asteroid field"],
    ),
    accent: "#8edfff",
    headingFont: "mono",
    invitation: "One more wave. One more close call. Help keep this little space shooter going.",
    cardTitle: "Support Asteroids",
    thanks: "Thank you for supporting the next round. See you in the asteroid field.",
  },
  "minecraft-clone": {
    ...night,
    paymentOptions: paymentOptions(
      ["🧱", "One more block"],
      ["⛏️", "Dig a little deeper"],
      ["🏡", "Room for another build"],
      ["🌍", "For the whole world"],
    ),
    accent: "#8acb83",
    headingFont: "mono",
    invitation: "A world of blocks, built one piece at a time. Help me keep working on it.",
    cardTitle: "Support this blocky world",
    thanks: "Thank you for supporting more places to explore and build.",
  },
  "online-chess": {
    ...studio,
    paymentOptions: paymentOptions(
      ["♟️", "A pawn of support"],
      ["♞", "A thoughtful move"],
      ["♜", "A solid defense"],
      ["♛", "A grand gesture"],
    ),
    background: "#f4efe6",
    accent: "#0f766e",
    headingFont: "serif",
    invitation: "A board, a friend, and the next move. Support this place to play.",
    cardTitle: "Support Online Chess",
    thanks: "Thank you for supporting the next game. Your board is waiting.",
  },
  tiao: {
    ...studio,
    paymentOptions: paymentOptions(
      ["🟤", "A piece of support"],
      ["🎯", "For the next move"],
      ["🤝", "For another match"],
      ["🏆", "For many games to come"],
    ),
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
    paymentOptions: paymentOptions(
      ["🥚", "A little dino support"],
      ["🦕", "For the next dinosaur"],
      ["🛡️", "Hold the line"],
      ["🦖", "A mighty contribution"],
    ),
    accent: "#becb91",
    headingFont: "mono",
    invitation: "Hold the line against the next wave. Support the work behind Mesozoic Protocol.",
    cardTitle: "Support Mesozoic Protocol",
    thanks: "Thank you for supporting the next defense. See you on the field.",
  },
  "quaternius-showcase": {
    ...studio,
    paymentOptions: paymentOptions(
      ["🧊", "A little model love"],
      ["🔎", "A closer look"],
      ["📦", "For the next preview"],
      ["🗂️", "For the whole catalogue"],
    ),
    accent: "#44694a",
    invitation: "Find a model. Take a closer look. Support a better way to browse the packs.",
    cardTitle: "Support the showcase",
    thanks: "Thank you for supporting the showcase and its next improvement.",
  },
  "interactive-3d-demos": {
    ...night,
    paymentOptions: paymentOptions(
      ["💡", "A spark of an idea"],
      ["🧪", "For another experiment"],
      ["🌊", "Make a few ripples"],
      ["✨", "For the next scene"],
    ),
    accent: "#d3b4fa",
    invitation: "A place to play with light, water, and code. Support the next experiment.",
    cardTitle: "Support the experiments",
    thanks: "Thank you for making room for the next experiment.",
  },
  "chemistry-sketcher": {
    ...studio,
    paymentOptions: paymentOptions(
      ["⚛️", "A little atomic support"],
      ["🔗", "Another bond"],
      ["🧪", "For the next molecule"],
      ["🔬", "For the whole workbench"],
    ),
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
