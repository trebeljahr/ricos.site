import type { CommonMetadata } from "src/@types";

export type ProjectSection = "Games" | "Apps & tools" | "Art & 3D";

// Shaped like CardGalleryItem so projects render with the site's shared cards.
export type Project = Pick<CommonMetadata, "slug" | "title" | "link" | "cover"> & {
  subtitle: string;
  section: ProjectSection;
  featured?: boolean;
};

export const PROJECT_SECTIONS: { title: ProjectSection; intro: string }[] = [
  {
    title: "Games",
    intro: "Games I made. They all run in your browser, so you can start playing right away.",
  },
  {
    title: "Apps & tools",
    intro: "Tools for making games and websites, and a time tracker for freelancers.",
  },
  {
    title: "Art & 3D",
    intro: "Things that are mostly just nice to look at. Old paintings, fractals and 3D scenes.",
  },
];

// 16:9 webp files committed under public/projects/ (1280x720, cropped from
// each project's own screenshots), shown with coverAspect="video". They are
// served straight from public/ (the image loader passes non-/assets/ paths
// through), so they behave the same in dev and production.
const screenshot = (slug: string, alt: string): Project["cover"] => ({
  src: `/projects/${slug}.webp`,
  width: 1280,
  height: 720,
  alt,
});

export const PROJECTS: Project[] = [
  // Games
  {
    slug: "tiao",
    title: "Tiao",
    subtitle:
      "A board game for two. Play with a friend at the same screen, online, or against the computer.",
    link: "https://playtiao.com",
    section: "Games",
    cover: screenshot("tiao", "Tiao start screen with options to play over the board or online"),
    featured: true,
  },
  {
    slug: "mesozoic-protocol",
    title: "Mesozoic Protocol",
    subtitle:
      "A 3D tower defense game where you hold off waves of dinosaurs. The demo is playable now.",
    link: "https://protocol.trebeljahr.com",
    section: "Games",
    cover: screenshot(
      "mesozoic-protocol",
      "Mesozoic Protocol screenshot of turrets defending a forest path",
    ),
  },
  {
    slug: "raptor-runner",
    title: "Raptor Runner",
    subtitle:
      "A small runner game inspired by the dinosaur on Chrome's offline page, with day, night and changing weather.",
    link: "https://raptor.trebeljahr.com",
    section: "Games",
    cover: screenshot(
      "raptor-runner",
      "Raptor Runner start screen with a pixel-art raptor in a desert",
    ),
    featured: true,
  },
  {
    slug: "minecraft-clone",
    title: "Minecraft Clone",
    subtitle:
      "My take on Minecraft in the browser, with generated landscapes, caves and blocks you can place.",
    link: "https://mc.trebeljahr.com",
    section: "Games",
    cover: screenshot("minecraft-clone", "Voxel landscape with grassy hills and a block toolbar"),
  },
  {
    slug: "asteroids",
    title: "Asteroids",
    subtitle: "The classic asteroid shooter. Play on your own or against other people online.",
    link: "https://asteroids.trebeljahr.com",
    section: "Games",
    cover: screenshot("asteroids", "Spaceship flying between asteroids in a dark starfield"),
  },
  {
    slug: "online-chess",
    title: "Online Chess",
    subtitle: "Play chess online with a friend, with a lobby and a chat.",
    link: "https://chess.trebeljahr.com",
    section: "Games",
    cover: screenshot("online-chess", "Online chess board next to match status and chat panels"),
  },

  // Apps & tools
  {
    slug: "track-your-time",
    title: "Track Your Time",
    subtitle:
      "A simple time tracker for freelancers. It turns your hours into reports and invoices, and you can host it yourself.",
    link: "https://trackyourtime.dev",
    section: "Apps & tools",
    cover: screenshot(
      "track-your-time",
      "Track Your Time banner: time tracking on your own server",
    ),
    featured: true,
  },
  {
    slug: "hatchkit",
    title: "Hatchkit",
    subtitle: "One command sets up a full-stack TypeScript app and puts it on your own server.",
    link: "https://hatchkit.trebeljahr.com",
    section: "Apps & tools",
    cover: screenshot("hatchkit", "Hatchkit landing page with a terminal running npx hatchkit"),
    featured: true,
  },
  {
    slug: "sprite-tools",
    title: "sprite-tools",
    subtitle: "Turns sprite sheets into assets you can drop straight into a game.",
    link: "https://sprites.trebeljahr.com",
    section: "Apps & tools",
    cover: screenshot("sprite-tools", "sprite-tools landing page with a sprite preview"),
  },
  {
    slug: "gamedev-asset-library",
    title: "GameDev Asset Library",
    subtitle:
      "A searchable collection of free game assets. You can look at the 3D models and listen to the sounds right on the page.",
    link: "https://gamedev.trebeljahr.com",
    section: "Apps & tools",
    cover: screenshot("gamedev-asset-library", "Grid of asset packs in the GameDev Asset Library"),
  },
  {
    slug: "conv3d",
    title: "conv3D",
    subtitle: "Turns 3D models into small GLB files and ready-to-use React components.",
    link: "https://conv3d.trebeljahr.com",
    section: "Apps & tools",
    cover: screenshot("conv3d", "Terminal output of conv3D converting a model to GLB and TSX"),
  },
  {
    slug: "quaternius-showcase",
    title: "Quaternius Showcase",
    subtitle:
      "Browse the free 3D model packs by Quaternius and look at every model before you download it.",
    link: "https://quaternius.trebeljahr.com",
    section: "Apps & tools",
    cover: screenshot("quaternius-showcase", "Low-poly stegosaurus model in the 3D viewer"),
  },

  // Art & 3D
  {
    slug: "collection-of-beauty",
    title: "Collection of Beauty",
    subtitle: "4,000+ handpicked public-domain artworks, with a walkable 3D museum.",
    link: "https://collectionofbeauty.com",
    section: "Art & 3D",
    cover: screenshot(
      "collection-of-beauty",
      "Collage of classic paintings next to the Collection of Beauty title",
    ),
    featured: true,
  },
  {
    slug: "fractal-garden",
    title: "Fractal Garden",
    subtitle:
      "A garden of fractals you can explore, each with a short explanation of how it works.",
    link: "https://fractal.garden",
    section: "Art & 3D",
    cover: screenshot("fractal-garden", "Mandelbrot set rendered in blue on a black background"),
    featured: true,
  },
  {
    slug: "interactive-3d-demos",
    title: "Interactive 3D Demos",
    subtitle: "My playground for 3D experiments on this site, like shaders, oceans and particles.",
    link: "/r3f",
    section: "Art & 3D",
    cover: screenshot(
      "interactive-3d-demos",
      "Colourful concentric shader pattern from the 3D playground",
    ),
  },
];

export const FEATURED_PROJECTS: Project[] = PROJECTS.filter((p) => p.featured);

export const projectsInSection = (section: ProjectSection): Project[] =>
  PROJECTS.filter((p) => p.section === section);
