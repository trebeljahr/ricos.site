// The /piano demos, in the order of the curriculum so far. Every demo page is
// development-only (404 in production) until the chapter it belongs to is out;
// see src/pages/piano/.

export const pianoDemos = [
  // Chapter 1: sound → 12 notes → keyboard.
  { slug: "play", title: "Play the piano" },
  { slug: "pluck-a-string", title: "Pluck a string" },
  { slug: "octave-doubling", title: "Double the frequency" },
  { slug: "overtones", title: "The tones inside one note" },
  { slug: "consonance", title: "Which two notes sound smooth" },
  { slug: "stack-fifths", title: "Stack fifths until they close" },
  { slug: "intervals", title: "Hear the distance between two notes" },
  { slug: "chord-builder", title: "Stack another third" },
] as const;

export type PianoDemoSlug = (typeof pianoDemos)[number]["slug"];

/** Where a demo page links back to. Only the dev server serves these pages. */
export const pianoDemosHome = { href: "/piano/demos", label: "All piano demos" };
