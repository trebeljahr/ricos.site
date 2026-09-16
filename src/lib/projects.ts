export type ProjectSection = "Games" | "Apps & tools" | "Art & 3D";

export type ProjectImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type Project = {
  slug: string;
  title: string;
  tagline: string;
  href: string;
  external: boolean;
  sourceUrl?: string;
  section: ProjectSection;
  year: string;
  image?: ProjectImage;
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

// Pre-sized 800x450 webp files committed under public/projects/. They are
// served straight from public/ (the image loader passes non-/assets/ paths
// through), so they behave the same in dev and production.
const screenshot = (slug: string, alt: string): ProjectImage => ({
  src: `/projects/${slug}.webp`,
  width: 800,
  height: 450,
  alt,
});

export const PROJECTS: Project[] = [
  // Games
  {
    slug: "tiao",
    title: "Tiao",
    tagline:
      "A board game for two. Play with a friend at the same screen, online, or against the computer.",
    href: "https://playtiao.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/tiao",
    section: "Games",
    year: "2026",
    image: screenshot("tiao", "Tiao start screen with options to play over the board or online"),
    featured: true,
  },
  {
    slug: "mesozoic-protocol",
    title: "Mesozoic Protocol",
    tagline:
      "A 3D tower defense game where you hold off waves of dinosaurs. The demo is playable now.",
    href: "https://protocol.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/extinction-protocol",
    section: "Games",
    year: "2026",
    image: screenshot(
      "mesozoic-protocol",
      "Mesozoic Protocol screenshot of turrets defending a forest path",
    ),
  },
  {
    slug: "raptor-runner",
    title: "Raptor Runner",
    tagline:
      "A small runner game inspired by the dinosaur on Chrome's offline page, with day, night and changing weather.",
    href: "https://raptor.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/raptor-runner",
    section: "Games",
    year: "2022",
    image: screenshot(
      "raptor-runner",
      "Raptor Runner start screen with a pixel-art raptor in a desert",
    ),
    featured: true,
  },
  {
    slug: "minecraft-clone",
    title: "Minecraft Clone",
    tagline:
      "My take on Minecraft in the browser, with generated landscapes, caves and blocks you can place.",
    href: "https://mc.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/minecraft-clone",
    section: "Games",
    year: "2021",
    image: screenshot("minecraft-clone", "Voxel landscape with grassy hills and a block toolbar"),
  },
  {
    slug: "asteroids",
    title: "Asteroids",
    tagline: "The classic asteroid shooter. Play on your own or against other people online.",
    href: "https://asteroids.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/asteroid-game",
    section: "Games",
    year: "2019",
    image: screenshot("asteroids", "Spaceship flying between asteroids in a dark starfield"),
  },
  {
    slug: "online-chess",
    title: "Online Chess",
    tagline: "Play chess online with a friend, with a lobby and a chat.",
    href: "https://chess.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/chess-app",
    section: "Games",
    year: "2019",
    image: screenshot("online-chess", "Online chess board next to match status and chat panels"),
  },

  // Apps & tools
  {
    slug: "track-your-time",
    title: "Track Your Time",
    tagline:
      "A simple time tracker for freelancers. It turns your hours into reports and invoices, and you can host it yourself.",
    href: "https://trackyourtime.dev",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/trackyourtime",
    section: "Apps & tools",
    year: "2026",
    image: screenshot(
      "track-your-time",
      "Track Your Time banner: time tracking on your own server",
    ),
    featured: true,
  },
  {
    slug: "hatchkit",
    title: "Hatchkit",
    tagline: "One command sets up a full-stack TypeScript app and puts it on your own server.",
    href: "https://hatchkit.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/hatchkit",
    section: "Apps & tools",
    year: "2026",
    image: screenshot("hatchkit", "Hatchkit landing page with a terminal running npx hatchkit"),
    featured: true,
  },
  {
    slug: "sprite-tools",
    title: "sprite-tools",
    tagline: "Turns sprite sheets into assets you can drop straight into a game.",
    href: "https://sprites.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/sprite-tools",
    section: "Apps & tools",
    year: "2026",
    image: screenshot("sprite-tools", "sprite-tools landing page with a sprite preview"),
  },
  {
    slug: "gamedev-asset-library",
    title: "GameDev Asset Library",
    tagline:
      "A searchable collection of free game assets. You can look at the 3D models and listen to the sounds right on the page.",
    href: "https://gamedev.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/gamedev",
    section: "Apps & tools",
    year: "2026",
    image: screenshot("gamedev-asset-library", "Grid of asset packs in the GameDev Asset Library"),
  },
  {
    slug: "conv3d",
    title: "conv3D",
    tagline: "Turns 3D models into small GLB files and ready-to-use React components.",
    href: "https://conv3d.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/conv3d",
    section: "Apps & tools",
    year: "2025",
    image: screenshot("conv3d", "Terminal output of conv3D converting a model to GLB and TSX"),
  },
  {
    slug: "quaternius-showcase",
    title: "Quaternius Showcase",
    tagline:
      "Browse the free 3D model packs by Quaternius and look at every model before you download it.",
    href: "https://quaternius.trebeljahr.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/quaternius-showcase",
    section: "Apps & tools",
    year: "2022",
    image: screenshot("quaternius-showcase", "Low-poly stegosaurus model in the 3D viewer"),
  },

  // Art & 3D
  {
    slug: "collection-of-beauty",
    title: "Collection of Beauty",
    tagline: "4,000+ handpicked public-domain artworks, with a walkable 3D museum.",
    href: "https://collectionofbeauty.com",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/collection-of-beauty",
    section: "Art & 3D",
    year: "2026",
    image: screenshot(
      "collection-of-beauty",
      "Collage of classic paintings next to the Collection of Beauty title",
    ),
    featured: true,
  },
  {
    slug: "fractal-garden",
    title: "Fractal Garden",
    tagline: "A garden of fractals you can explore, each with a short explanation of how it works.",
    href: "https://fractal.garden",
    external: true,
    sourceUrl: "https://github.com/trebeljahr/fractal-garden",
    section: "Art & 3D",
    year: "2021",
    image: screenshot("fractal-garden", "Mandelbrot set rendered in blue on a black background"),
    featured: true,
  },
  {
    slug: "interactive-3d-demos",
    title: "Interactive 3D Demos",
    tagline: "My playground for 3D experiments on this site, like shaders, oceans and particles.",
    href: "/r3f",
    external: false,
    sourceUrl: "https://github.com/trebeljahr/ricos.site",
    section: "Art & 3D",
    year: "2025",
    image: screenshot(
      "interactive-3d-demos",
      "Colourful concentric shader pattern from the 3D playground",
    ),
  },
];

export const FEATURED_PROJECTS: Project[] = PROJECTS.filter((p) => p.featured);

export const projectsInSection = (section: ProjectSection): Project[] =>
  PROJECTS.filter((p) => p.section === section);
