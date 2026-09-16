// Hand-picked content for /start-here. Order matters: it is the order a new
// visitor sees things in. Everything here is looked up in the Velite data at
// build time, so titles and covers stay in sync with the content itself.
// `note` is the one line that says why a piece is worth someone's time.

export type StartHerePick = {
  kind: "post" | "newsletter" | "travel";
  // Post slug, newsletter number, or travel series folder name.
  id: string;
  note: string;
};

// Step 1: the few pieces I'd hand a friend who asks "what should I read?".
// The first one gets the big slot.
export const FIRST_READS: StartHerePick[] = [
  {
    kind: "travel",
    id: "transat",
    note: "I hitchhiked onto an 11 metre sailboat without ever having sailed before. This is the diary I kept during 18 days on the Atlantic, with three people on board.",
  },
  {
    kind: "newsletter",
    id: "78",
    note: "A postcard from Vietnam. Tet dinner with a family in Hanoi, hitchhiking to Cat Ba Island, and why I find it so hard to accept kindness without paying it back.",
  },
  {
    kind: "post",
    id: "on-the-beauty-of-living",
    note: "Written alone in my room at night while FKJ played on a salt flat in Bolivia. About why things matter, even though everything ends.",
  },
];

// Travel series shown as photo tiles, in this order. Series from FIRST_READS
// are skipped automatically.
export const TRAVEL_SERIES = ["dominica", "guadeloupe", "portugal-2024", "martinique-2024"];

// Essays for the "how to live" lane.
export const ESSAYS: StartHerePick[] = [
  {
    kind: "post",
    id: "computer-games",
    note: "Why playing games feels good and bad at the same time, from somebody who plays too much.",
  },
  {
    kind: "post",
    id: "my-productivity-system",
    note: "I have almost no willpower. These are the habits and systems that get things done anyway.",
  },
  {
    kind: "post",
    id: "the-people-i-have-learned-from-the-most",
    note: "The blogs, podcasts and writers that shaped how I think. A map of where my ideas come from.",
  },
  {
    kind: "post",
    id: "why-do-i-like-traveling",
    note: "Reading my old travel notes and trying to work out what keeps pulling me away from home.",
  },
];

// Booknotes slugs, shown as a shelf of covers. All 10/10 with long notes.
export const BOOKSHELF = [
  "the-beginning-of-infinity",
  "how-to-live",
  "the-art-of-learning",
  "the-selfish-gene",
  "zen-and-the-art",
  "almanack-of-naval-ravikant",
  "why-we-sleep",
  "free-agents",
];

// Photography galleries (names from src/pages/photography.tsx). First one is large.
export const PHOTO_GALLERIES = ["best-of", "alps", "vietnam", "sri-lanka", "italy"];

// Project slugs from src/lib/projects.ts.
export const PROJECT_PICKS = ["tiao", "mesozoic-protocol"];

export const DEMO_PICKS: { name: string; title: string; href: string }[] = [
  { name: "shader-art-demo", title: "Shader Art", href: "/r3f/scenes/shader-art-demo" },
  { name: "plasma-ball", title: "Plasma Ball", href: "/r3f/scenes/plasma-ball" },
  { name: "ocean", title: "Ocean", href: "/r3f/scenes/ocean" },
];

// Small, odd things. Covers are given here because not all of these are posts.
export const RABBIT_HOLES: {
  href: string;
  title: string;
  note: string;
  cover: { src: string; alt: string };
}[] = [
  {
    href: "/posts/diatoms",
    title: "Diatom Arrangements",
    note: "Single-celled algae with glass shells, arranged into patterns under a microscope.",
    cover: {
      src: "/assets/blog/diatoms/klaus-kemp-15.jpg",
      alt: "a diatom arrangement by Klaus Kemp",
    },
  },
  {
    href: "/posts/the-best-yellow",
    title: "The Best Yellow",
    note: "I bought 11 brands of yellow acrylic paint to find one that covers black. One did.",
    cover: {
      src: "/assets/blog/best-yellow/all-the-yellows.jpeg",
      alt: "a bunch of different yellow colors I bought from Amazon",
    },
  },
  {
    href: "/needlestack",
    title: "Needlestack",
    note: "The best things I've found on the internet. Lectures, blogs, videos, music and a lot of random stuff.",
    cover: { src: "/assets/midjourney/a-stack-of-needles.jpg", alt: "A stack of needles" },
  },
];
