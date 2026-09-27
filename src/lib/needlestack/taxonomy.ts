/**
 * The needlestack navigation: six doors, each holding a handful of paths.
 *
 * A path answers "what does the reader want right now", not "what format is
 * this". That is the whole point of the rewrite: a stranger without Rico's
 * brain can pick an intent and get an ordered list with notes, instead of
 * scrolling 500 links grouped by whether they happen to be videos.
 *
 * This file is the closed vocabulary a classification pass must choose from.
 * Adding a path is a deliberate edit here; the pass may only propose one
 * through `guess.reason`, never invent one.
 *
 * Per-path ordering and intros live in src/content/needlestack/paths.json,
 * because they are curation data that changes far more often than this list.
 */

export const DOORS = [
  {
    id: "understand",
    title: "Understand",
    blurb: "How brains, bodies, matter, maths and machines actually work.",
  },
  {
    id: "build",
    title: "Build",
    blurb: "Learn to make things with code, silicon and a soldering iron.",
  },
  {
    id: "live",
    title: "Live",
    blurb: "Direction, habits, attention, health, people and long journeys.",
  },
  {
    id: "work",
    title: "Work",
    blurb: "Earning a living on your own terms, and getting better at the craft.",
  },
  {
    id: "world",
    title: "The World",
    blurb: "Power, money, progress, the internet and where AI is taking us.",
  },
  {
    id: "wonder",
    title: "Wonder",
    blurb: "Things that are simply beautiful, strange or astonishing.",
  },
] as const;

export type DoorId = (typeof DOORS)[number]["id"];

export type PathDefinition = {
  id: string;
  door: DoorId;
  title: string;
  /** One sentence in reader-intent voice; shown under the path title. */
  blurb: string;
};

export const PATHS = [
  // Understand
  {
    id: "how-brains-work",
    door: "understand",
    title: "Understand how brains work",
    blurb: "Behaviour, perception and memory, from biology up.",
  },
  {
    id: "consciousness-and-reality",
    door: "understand",
    title: "What consciousness is, and what is real",
    blurb: "The hard question, and why perception is not a window.",
  },
  {
    id: "life-is-molecular-machinery",
    door: "understand",
    title: "Life is molecular machinery",
    blurb: "Cells as engineering, from ATP synthase to regeneration.",
  },
  {
    id: "how-the-physical-world-works",
    door: "understand",
    title: "How the physical world works",
    blurb: "Magnets, light, heat, precision and the people who demo it best.",
  },
  {
    id: "fall-in-love-with-math",
    door: "understand",
    title: "Fall in love with maths again",
    blurb: "Start with the beautiful bits, then learn it properly.",
  },
  {
    id: "how-llms-work",
    door: "understand",
    title: "Understand how LLMs work",
    blurb: "From one neuron to a transformer that writes.",
  },
  {
    id: "think-more-clearly",
    door: "understand",
    title: "Think more clearly",
    blurb: "Biases, beliefs, models and arguments worth having.",
  },

  // Build
  {
    id: "learn-programming-from-zero",
    door: "build",
    title: "Learn programming from zero",
    blurb: "A path that works without a degree or a bootcamp.",
  },
  {
    id: "go-deep-as-a-developer",
    door: "build",
    title: "Go deep as a developer",
    blurb: "Algorithms, language design and the talks that change how you code.",
  },
  {
    id: "how-a-computer-works",
    door: "build",
    title: "How a computer really works",
    blurb: "From transistors and DRAM up to an operating system.",
  },
  {
    id: "shaders-and-art-with-code",
    door: "build",
    title: "Make beautiful things with code",
    blurb: "Shaders, curves, noise and browser graphics.",
  },
  {
    id: "make-a-game",
    door: "build",
    title: "Make a game",
    blurb: "Physics, tooling, scope and shipping something playable.",
  },
  {
    id: "build-hardware-at-home",
    door: "build",
    title: "Build hardware at home",
    blurb: "Electronics, PCBs, high voltage and machines you can touch.",
  },
  {
    id: "your-own-corner-of-the-web",
    door: "build",
    title: "Build your own corner of the web",
    blurb: "Personal sites, digital gardens, typography and owning your writing.",
  },
  {
    id: "build-with-ai-agents",
    door: "build",
    title: "Build with AI agents",
    blurb: "What actually works when you let models write code.",
  },

  // Live
  {
    id: "stuck-on-direction",
    door: "live",
    title: "Stuck on career or direction",
    blurb: "Choosing what to work on, and when to leave.",
  },
  {
    id: "how-to-live-well",
    door: "live",
    title: "How to live well",
    blurb: "Meaning, guilt, time and what people wish they had known earlier.",
  },
  {
    id: "start-meditating",
    door: "live",
    title: "Start meditating",
    blurb: "Practice and Buddhist thinking, without the woo.",
  },
  {
    id: "friendship-and-love",
    door: "live",
    title: "Friendship, love and being social",
    blurb: "Finding people, keeping them, and hosting well.",
  },
  {
    id: "take-care-of-your-body",
    door: "live",
    title: "Take care of your body",
    blurb: "Strength, sleep, food and metabolism, from people who read studies.",
  },
  {
    id: "leave-for-a-long-journey",
    door: "live",
    title: "Leave for a long journey",
    blurb: "Bikes, boats and years away, plus the boring logistics.",
  },
  {
    id: "learn-how-to-learn",
    door: "live",
    title: "Learn how to learn",
    blurb: "Memory, spacing, note systems and why books often fail.",
  },
  {
    id: "pick-up-a-creative-hobby",
    door: "live",
    title: "Pick up a creative hobby",
    blurb: "Drawing, painting and colour, for people who start from nothing.",
  },
  {
    id: "understand-music",
    door: "live",
    title: "Understand music",
    blurb: "Tuning, notation, harmony and playing by ear.",
  },

  // Work
  {
    id: "build-a-small-business-alone",
    door: "work",
    title: "Build a small business alone",
    blurb: "Solo economics, side projects and staying independent.",
  },
  {
    id: "get-your-first-customers",
    door: "work",
    title: "Get your first customers",
    blurb: "Copywriting, positioning, SEO and honest growth.",
  },
  {
    id: "lead-and-hire-a-team",
    door: "work",
    title: "Lead and hire a team",
    blurb: "Hiring, culture documents and management that is not theatre.",
  },
  {
    id: "write-and-speak-better",
    door: "work",
    title: "Write and speak better",
    blurb: "Structure, typography, habits and talks worth studying.",
  },
  {
    id: "land-a-dev-job",
    door: "work",
    title: "Land a developer job",
    blurb: "Interview prep, system design and negotiating the offer.",
  },

  // The World
  {
    id: "how-power-and-money-work",
    door: "world",
    title: "How power and money work",
    blurb: "Rulers, incentives, credit and the machine behind the economy.",
  },
  {
    id: "how-the-world-order-works",
    door: "world",
    title: "How the world order works",
    blurb: "Empires, supply chains, chips and the conflicts over materials.",
  },
  {
    id: "is-the-world-getting-better",
    door: "world",
    title: "Is the world getting better?",
    blurb: "Progress studies, and the case against doomscrolling.",
  },
  {
    id: "what-happened-to-the-internet",
    door: "world",
    title: "What happened to the internet",
    blurb: "Search decay, attention markets and the small web's answer.",
  },
  {
    id: "where-ai-is-heading",
    door: "world",
    title: "Where AI is heading",
    blurb: "Takeoff arguments, safety, and both sides of the optimism.",
  },
  {
    id: "how-exposed-am-i",
    door: "world",
    title: "How exposed am I?",
    blurb: "Surveillance, tracking and hardening what you run.",
  },

  // Wonder
  {
    id: "twenty-minutes-amazed",
    door: "wonder",
    title: "20 minutes, want to be amazed",
    blurb: "Short things that are worth the time, every time.",
  },
  {
    id: "feel-small-in-a-good-way",
    door: "wonder",
    title: "Feel small, in a good way",
    blurb: "Scale, time and the pale blue dot feeling.",
  },
  {
    id: "humans-doing-impossible-things",
    door: "wonder",
    title: "Humans doing impossible things",
    blurb: "Parkour, freediving, skiing and absurd craft.",
  },
  {
    id: "play-with-it",
    door: "wonder",
    title: "Play with it",
    blurb: "Explorables and toys that teach by being poked.",
  },
] as const satisfies readonly PathDefinition[];

export type PathId = (typeof PATHS)[number]["id"];

export const DOOR_IDS = DOORS.map((door) => door.id) as DoorId[];
export const PATH_IDS = PATHS.map((path) => path.id) as PathId[];

export const doorById = (id: string) => DOORS.find((door) => door.id === id);
export const pathById = (id: string) => PATHS.find((path) => path.id === id);
export const pathsInDoor = (door: DoorId) => PATHS.filter((path) => path.door === door);

export const isDoorId = (value: unknown): value is DoorId =>
  typeof value === "string" && DOOR_IDS.includes(value as DoorId);
export const isPathId = (value: unknown): value is PathId =>
  typeof value === "string" && PATH_IDS.includes(value as PathId);

/** Compact list for a model prompt: every path, its door and its intent. */
export const taxonomyForPrompt = (): string =>
  DOORS.map((door) => {
    const paths = pathsInDoor(door.id)
      .map((path) => `    ${path.id} — ${path.title}: ${path.blurb}`)
      .join("\n");
    return `${door.id} (${door.title}): ${door.blurb}\n${paths}`;
  }).join("\n");
