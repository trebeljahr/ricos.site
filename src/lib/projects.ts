import type { CommonMetadata } from "src/@types";

export type ProjectSprint = {
  // YYYY-MM-DD of the sprint's first commit.
  date: string;
  summary: string;
};

export type ProjectSection = "Games" | "Art & 3D" | "Dev tools" | "Everyday apps";

// Shaped like CardGalleryItem so projects render with the site's shared cards.
export type Project = Pick<CommonMetadata, "slug" | "title" | "link" | "cover"> & {
  subtitle: string;
  // YYYY-MM-DD the project started (first real commit). Places it on /timeline.
  date: string;
  // Later development sprints, each listed on /timeline as its own entry.
  sprints?: ProjectSprint[];
  section: ProjectSection;
  featured?: boolean;
};

// /projects is the one hub for everything Rico made, in the order he ranks the
// work: games and explorables first, then dev tools, then everyday apps.
export const PROJECT_SECTIONS: { title: ProjectSection; intro: string }[] = [
  {
    title: "Games",
    intro: "Games I made. They all run in your browser, so you can start playing right away.",
  },
  {
    title: "Art & 3D",
    intro:
      "Things that are mostly just nice to look at. Old paintings, fractals, 3D models and scenes.",
  },
  {
    title: "Dev tools",
    intro: "Tools I built, mostly to make building games and software a bit easier.",
  },
  {
    title: "Everyday apps",
    intro: "Apps for work and daily life, from time tracking to bookmarks.",
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
    slug: "mesozoic-protocol",
    date: "2026-04-21",
    title: "Mesozoic Protocol",
    subtitle:
      "A 3D tower defense game where you hold off waves of dinosaurs. The demo is playable now.",
    link: "https://play.mesozoicprotocol.com",
    section: "Games",
    cover: screenshot(
      "mesozoic-protocol",
      "Mesozoic Protocol screenshot of turrets defending a forest path",
    ),
  },
  {
    slug: "tiao",
    date: "2025-12-05",
    title: "Tiao",
    subtitle:
      "A board game for two. Play with a friend at the same screen, online, or against the computer.",
    link: "https://playtiao.com",
    section: "Games",
    cover: screenshot("tiao", "Tiao start screen with options to play over the board or online"),
    featured: true,
  },
  {
    slug: "raptor-runner",
    date: "2022-04-06",
    sprints: [
      {
        date: "2026-04-10",
        summary: "Came back to it with achievements, a shop, and desktop and mobile builds.",
      },
    ],
    title: "Raptor Runner",
    subtitle:
      "A small runner game inspired by the dinosaur on Chrome's offline page, with day, night and changing weather.",
    link: "https://raptorrunner.com",
    section: "Games",
    cover: screenshot(
      "raptor-runner",
      "Raptor Runner at dusk: a raptor in a cowboy hat runs toward a coin under a pterodactyl",
    ),
    featured: true,
  },
  {
    slug: "minecraft-clone",
    date: "2021-05-06",
    sprints: [
      {
        date: "2023-11-22",
        summary: "Made chunk generation faster and added a loading bar and saving.",
      },
    ],
    title: "Minecraft Clone",
    subtitle:
      "My take on Minecraft in the browser, with generated landscapes, caves and blocks you can place.",
    link: "https://mc.trebeljahr.com",
    section: "Games",
    cover: screenshot("minecraft-clone", "Voxel landscape with grassy hills and a block toolbar"),
  },
  {
    slug: "asteroids",
    date: "2019-11-17",
    sprints: [
      {
        date: "2026-03-23",
        summary:
          "Rebuilt the menus in React and added a battle royale mode with online multiplayer.",
      },
    ],
    title: "Asteroids",
    subtitle: "The classic asteroid shooter. Play on your own or against other people online.",
    link: "https://asteroids.trebeljahr.com",
    section: "Games",
    cover: screenshot("asteroids", "Spaceship flying between asteroids in a dark starfield"),
  },
  {
    slug: "online-chess",
    date: "2019-01-25",
    sprints: [
      { date: "2026-04-06", summary: "Added chess clocks, ELO ratings, spectating and rematches." },
    ],
    title: "Online Chess",
    subtitle: "Play chess online with a friend, with a lobby and a chat.",
    link: "https://chess.trebeljahr.com",
    section: "Games",
    cover: screenshot("online-chess", "Online chess board next to match status and chat panels"),
  },

  // Art & 3D
  {
    slug: "collection-of-beauty",
    date: "2026-04-19",
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
    slug: "interactive-3d-demos",
    date: "2025-01-05",
    title: "Interactive 3D Demos",
    subtitle: "My playground for 3D experiments on this site, like shaders, oceans and particles.",
    link: "/r3f",
    section: "Art & 3D",
    cover: screenshot(
      "interactive-3d-demos",
      "Colourful concentric shader pattern from the 3D playground",
    ),
  },
  {
    slug: "quaternius-showcase",
    date: "2022-12-03",
    title: "Quaternius Showcase",
    subtitle:
      "Browse the free 3D model packs by Quaternius and look at every model before you download it.",
    link: "https://quaternius.trebeljahr.com",
    section: "Art & 3D",
    cover: screenshot("quaternius-showcase", "Low-poly stegosaurus model in the 3D viewer"),
  },
  {
    slug: "fractal-garden",
    date: "2022-09-02",
    sprints: [
      {
        date: "2026-03-23",
        summary: "Added the Burning Ship fractal, new controls, and more polish on each fractal.",
      },
    ],
    title: "Fractal Garden",
    subtitle:
      "A garden of fractals you can explore, each with a short explanation of how it works.",
    link: "https://fractal.garden",
    section: "Art & 3D",
    cover: screenshot("fractal-garden", "Mandelbrot set rendered in blue on a black background"),
    featured: true,
  },

  // Dev tools
  {
    slug: "vibestats",
    date: "2026-09-30",
    title: "vibestats",
    subtitle:
      "Shows your Claude Code and Codex usage in a local dashboard, with a daily heatmap and token costs.",
    link: "https://vibestats.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot(
      "vibestats",
      "vibestats landing page: your Claude Code and Codex usage in one dashboard",
    ),
  },
  {
    slug: "gamedev-asset-library",
    date: "2026-05-06",
    title: "GameDev Asset Library",
    subtitle:
      "A searchable collection of free game assets. You can look at the 3D models and listen to the sounds right on the page.",
    link: "https://gamedev.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot("gamedev-asset-library", "Grid of asset packs in the GameDev Asset Library"),
  },
  {
    slug: "name-check",
    date: "2026-05-16",
    title: "name-check",
    subtitle:
      "Checks if a name is still free at trademark offices, domain registries, social networks, app stores and package registries.",
    link: "https://names.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot("name-check", "name-check landing page with a search box for a product name"),
  },
  {
    slug: "hatchkit",
    date: "2026-03-26",
    title: "Hatchkit",
    subtitle: "One command sets up a full-stack TypeScript app and puts it on your own server.",
    link: "https://hatchkit.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot("hatchkit", "Hatchkit landing page with a terminal running npx hatchkit"),
    featured: true,
  },
  {
    slug: "sprite-tools",
    date: "2026-03-22",
    title: "sprite-tools",
    subtitle: "Turns sprite sheets into assets you can drop straight into a game.",
    link: "https://sprites.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot("sprite-tools", "sprite-tools landing page with a sprite preview"),
  },
  {
    slug: "conv3d",
    date: "2025-03-05",
    sprints: [
      {
        date: "2026-05-01",
        summary: "Added init and doctor commands, a landing page, and prepared the first release.",
      },
    ],
    title: "conv3D",
    subtitle: "Turns 3D models into small GLB files and ready-to-use React components.",
    link: "https://conv3d.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot("conv3d", "Terminal output of conv3D converting a model to GLB and TSX"),
  },

  // Everyday apps
  {
    slug: "streaks",
    date: "2026-08-24",
    title: "Streaks",
    subtitle:
      "Tracks timed practice, like piano, writing or drawing. Two minutes are enough for the day to count.",
    link: "https://streaks.trebeljahr.com",
    section: "Everyday apps",
    cover: screenshot("streaks", "Streaks landing page headed Two minutes counts"),
  },
  {
    slug: "track-your-time",
    date: "2026-08-21",
    title: "Track Your Time",
    subtitle:
      "A simple time tracker for freelancers. It turns your hours into reports and invoices, and you can host it yourself.",
    link: "https://trackyourtime.dev",
    section: "Everyday apps",
    cover: screenshot(
      "track-your-time",
      "Track Your Time banner: time tracking on your own server",
    ),
    featured: true,
  },
  {
    slug: "mood-magic",
    date: "2026-05-19",
    title: "Mood Magic",
    subtitle:
      "A small app for quick mood check-ins and tiny rituals that help people come back to each other.",
    link: "https://mood-magic.trebeljahr.com",
    section: "Everyday apps",
    cover: screenshot(
      "mood-magic",
      "Mood Magic landing page next to a phone showing a Restless check-in",
    ),
  },
  {
    slug: "better-bookmarks",
    date: "2023-01-21",
    sprints: [
      {
        date: "2026-04-24",
        summary:
          "Came back to it with sync to Chrome's own bookmarks, search, links between bookmarks, and imports.",
      },
    ],
    title: "Better Bookmarks",
    subtitle:
      "A Chrome extension that adds tags, ratings and notes to the bookmarks you already have. For now you install it from source.",
    link: "https://bookmarks.trebeljahr.com",
    section: "Everyday apps",
    cover: screenshot("better-bookmarks", "Better Bookmarks landing page on a dark background"),
  },
  {
    // Hydroxyl was called Chemistry Sketcher. The slug stays, because the
    // editor links to /donate/chemistry-sketcher.
    slug: "chemistry-sketcher",
    date: "2020-04-12",
    sprints: [
      {
        date: "2026-09-01",
        summary: "Rebuilt it from scratch as Hydroxyl, an editor for figures in papers.",
      },
    ],
    title: "Hydroxyl",
    subtitle:
      "A chemical structure editor. Draw a molecule once and export its skeletal, Lewis and formula views as one figure.",
    link: "https://hydroxyl.app",
    section: "Everyday apps",
    cover: screenshot(
      "chemistry-sketcher",
      "Hydroxyl landing page with acetic acid drawn as skeletal, Lewis and formula views",
    ),
  },
];

export const FEATURED_PROJECTS: Project[] = PROJECTS.filter((p) => p.featured);

// Newest first, by the date each project started.
export const projectsInSection = (section: ProjectSection): Project[] =>
  PROJECTS.filter((p) => p.section === section).sort((a, b) => b.date.localeCompare(a.date));
