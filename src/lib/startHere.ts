// Hand-picked content for /start-here. Keep it small: this page is a glimpse
// of what the site is about, not an index of everything on it.

// Gallery name from the trips list in src/pages/photography.tsx.
export const BEST_OF_GALLERY = "best-of";

export const DEMO_PICKS: { name: string; title: string; href: string; note: string }[] = [
  {
    name: "shader-art-demo",
    title: "Shader Art",
    href: "/r3f/scenes/shader-art-demo",
    note: "Fractal patterns you can play with and make art from.",
  },
  {
    name: "plasma-ball",
    title: "Plasma Ball",
    href: "/r3f/scenes/plasma-ball",
    note: "A glowing plasma ball in 3D.",
  },
];

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
