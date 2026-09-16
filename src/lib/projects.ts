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
    intro:
      "Games that run in the browser, from a two-player board game to a 3D tower defense. All of them are open source.",
  },
  {
    title: "Apps & tools",
    intro:
      "Developer tools, 3D asset viewers and a time tracker. Each one has a live site and public source code.",
  },
  {
    title: "Art & 3D",
    intro: "Interactive art, fractals and React Three Fiber scenes in the browser.",
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
      "Two-player board game in the browser, with online matches, AI opponents and tournaments.",
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
      "3D roguelite tower defense game where sci-fi turrets defend outposts against waves of dinosaurs.",
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
      "Pixel-art endless runner based on Chrome's offline dinosaur game, with a day/night cycle, weather and cosmetics.",
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
      "Browser voxel sandbox in Three.js with procedural terrain, biomes, caves, lighting and block placing.",
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
    tagline:
      "Browser asteroid shooter with single-player mode and real-time online 1v1 and battle-royale modes.",
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
    tagline:
      "Multiplayer chess site with accounts, a lobby and live board updates over WebSockets.",
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
      "Open-source time tracker for freelancers that turns tracked hours into reports and invoices, hosted or self-hosted.",
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
    tagline: "CLI that scaffolds a full-stack TypeScript app and deploys it to your own server.",
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
    tagline: "Web app, npm CLI and MCP server that turn sprite sheets into game-ready assets.",
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
      "Searchable catalog of free game assets with 3D preview, audio playback, license and creator info.",
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
    tagline:
      "npm CLI that converts FBX, OBJ and glTF models to GLB and generates React Three Fiber components.",
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
      "Browser viewer for previewing Quaternius's free 3D model packs before downloading them.",
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
    tagline:
      "Interactive fractals in the browser, rendered with WebGL shaders and L-systems, each with a written explanation.",
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
    tagline: "Gallery of React Three Fiber scenes with custom GLSL shaders, hosted on this site.",
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
