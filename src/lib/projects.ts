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
  // The same picture with the project's name and tagline set on it: the
  // og:image shape, for link previews and anywhere the HTML title is absent.
  // `cover` is the text-free twin that sits above a card's own title.
  wordmarkCover?: CommonMetadata["cover"];
  featured?: boolean;
  // Still in the works: left off /projects, the home page and /timeline, while
  // the project's own donation link keeps working.
  unlisted?: boolean;
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
    intro: "Apps for work and daily life.",
  },
];

// 1200x630 webp files (the og:image shape) committed under public/projects/,
// shown with coverAspect="og". Each project has a text-free <slug>.webp and,
// where one exists, <slug>-wordmark.webp: the project's GitHub social-preview
// or store card with its name and tagline on it, re-rendered at 1200x630.
// Both come from the project's own marketing assets. They are served straight
// from public/ (the image loader passes non-/assets/ paths through), so they
// behave the same in dev and production.
const screenshot = (slug: string, alt: string): Project["cover"] => ({
  src: `/projects/${slug}.webp`,
  width: 1200,
  height: 630,
  alt,
});

const wordmark = (slug: string, alt: string): Project["cover"] => ({
  src: `/projects/${slug}-wordmark.webp`,
  width: 1200,
  height: 630,
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
      "A velociraptor in a sunlit forest beside an orange turret",
    ),
    wordmarkCover: wordmark(
      "mesozoic-protocol",
      "Mesozoic Protocol logo beside a velociraptor in a sunlit forest and an orange turret",
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
    cover: screenshot("tiao", "Tiao board at an angle with black and white stones"),
    wordmarkCover: wordmark(
      "tiao",
      "Tiao logo beside a board at an angle with black and white stones",
    ),
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
      "Raptor Runner art: a raptor in a cowboy hat runs across desert dunes",
    ),
    wordmarkCover: wordmark(
      "raptor-runner",
      "Raptor Runner logo above a raptor in a cowboy hat running across desert dunes",
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
    cover: screenshot("minecraft-clone", "Grassy voxel hill with a stone path under a blue sky"),
    wordmarkCover: wordmark(
      "minecraft-clone",
      "A voxel world in a browser tab: the headline over generated terrain",
    ),
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
    cover: screenshot(
      "asteroids",
      "Spaceship trailing sparks between asteroids and heart pickups in deep space",
    ),
    wordmarkCover: wordmark(
      "asteroids",
      "Asteroids title beside a spaceship flying between asteroids",
    ),
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
    cover: screenshot(
      "online-chess",
      "Online Chess game screen with the board, match status and move list",
    ),
    wordmarkCover: wordmark(
      "online-chess",
      "Online Chess title beside the game screen with its board and move list",
    ),
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
      "Collage of classic paintings, including The Great Wave and Girl with a Pearl Earring",
    ),
    wordmarkCover: wordmark(
      "collection-of-beauty",
      "Collection of Beauty title beside a collage of paintings by Caravaggio, Botticelli, Vermeer and Monet",
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
      "Six 3D demos: a plasma ball, a shader pattern, a glowing sword, a snow forest, a lightning strike and an animated soldier",
    ),
    wordmarkCover: wordmark(
      "interactive-3d-demos",
      "Interactive 3D Demos title over a plasma ball, a shader pattern, a glowing sword, a snow forest, lightning and a soldier",
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
    cover: screenshot(
      "quaternius-showcase",
      "Four low-poly models: a T-rex, a cow, a spaceship and a mech",
    ),
    wordmarkCover: wordmark(
      "quaternius-showcase",
      "Four low-poly Quaternius models above the line See each free Quaternius model in 3D before you download it",
    ),
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
    cover: screenshot(
      "fractal-garden",
      "Eight fractals, among them the Mandelbrot set, a Barnsley fern and a Menger sponge",
    ),
    wordmarkCover: wordmark(
      "fractal-garden",
      "Fractal Garden title and the line An Exhibition Of Mathematical Beauty over six fractals",
    ),
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
    unlisted: true,
    cover: screenshot(
      "vibestats",
      "vibestats dashboard with usage totals and a year-long activity heatmap",
    ),
    wordmarkCover: wordmark(
      "vibestats",
      "vibestats logo and the line Your AI coding history, day by day, above an activity heatmap",
    ),
  },
  {
    slug: "name-check",
    date: "2026-05-16",
    title: "name-check",
    subtitle:
      "Checks if a name is still free at trademark offices, domain registries, social networks, app stores and package registries.",
    link: "https://names.trebeljahr.com",
    section: "Dev tools",
    unlisted: true,
    cover: screenshot(
      "name-check",
      "name-check results for one name: trademarks, domains and social handles marked available or taken",
    ),
    wordmarkCover: wordmark(
      "name-check",
      "name-check logo, the headline Don't ship a name you'll have to rebrand, and a search box",
    ),
  },
  {
    slug: "hatchkit",
    date: "2026-03-26",
    title: "Hatchkit",
    subtitle: "One command sets up a full-stack TypeScript app and puts it on your own server.",
    link: "https://hatchkit.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot(
      "hatchkit",
      "hatchkit create fanning out to a repo, DNS, server, app, error tracking, analytics, email, backups and secrets",
    ),
    wordmarkCover: wordmark(
      "hatchkit",
      "hatchkit logo and the line Automates the drudgery of starting a new project, beside the nine services hatchkit create sets up",
    ),
    featured: true,
  },
  {
    slug: "sprite-tools",
    date: "2026-03-22",
    title: "Sprite Tools",
    subtitle: "Turns sprite sheets into assets you can drop straight into a game.",
    link: "https://sprites.trebeljahr.com",
    section: "Dev tools",
    cover: screenshot(
      "sprite-tools",
      "Mouse swordsman sprite outlined by its collision polygon on a dark grid",
    ),
    wordmarkCover: wordmark(
      "sprite-tools",
      "Sprite Tools title beside a mouse sprite outlined by its collision polygon",
    ),
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
    cover: screenshot(
      "conv3d",
      "A mage model turned flat yellow by FBX2glTF, next to 18 textured models converted by conv3D",
    ),
    wordmarkCover: wordmark(
      "conv3d",
      "conv3d logo and FBX packs in, textured GLBs out, beside 18 converted models",
    ),
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
    unlisted: true,
    cover: screenshot(
      "streaks",
      "Streaks Today screen on a phone with four practices and their streak rings",
    ),
    wordmarkCover: wordmark(
      "streaks",
      "Streaks wordmark and the line Two minutes counts, beside the Today screen on a phone",
    ),
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
      "Track Your Time reports screen on a laptop, with the phone timer in front",
    ),
    wordmarkCover: wordmark(
      "track-your-time",
      "Track Your Time logo and the headline Time tracking on your own server",
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
    unlisted: true,
    cover: screenshot(
      "mood-magic",
      "A phone showing a Restless mood check-in over soft blue bands",
    ),
    wordmarkCover: wordmark(
      "mood-magic",
      "Mood Magic title next to a phone showing a Restless mood check-in",
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
    unlisted: true,
    cover: screenshot(
      "better-bookmarks",
      "Better Bookmarks overview with folders, tags and rated bookmarks",
    ),
    wordmarkCover: wordmark(
      "better-bookmarks",
      "Better Bookmarks logo and the headline Same page, one bookmark, over three tracking links reduced to one",
    ),
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
    unlisted: true,
    cover: screenshot(
      "chemistry-sketcher",
      "Acetic acid drawn as four panels: skeletal, explicit H, Lewis and condensed formula",
    ),
    wordmarkCover: wordmark(
      "chemistry-sketcher",
      "Hydroxyl headline Draw the molecule once beside acetic acid in four views",
    ),
  },
];

export const LISTED_PROJECTS: Project[] = PROJECTS.filter((p) => !p.unlisted);

export const FEATURED_PROJECTS: Project[] = LISTED_PROJECTS.filter((p) => p.featured);

// Newest first, by the date each project started.
export const projectsInSection = (section: ProjectSection): Project[] =>
  LISTED_PROJECTS.filter((p) => p.section === section).sort((a, b) => b.date.localeCompare(a.date));
