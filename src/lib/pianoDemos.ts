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
  // Next: chords and scales (Rico's picks, 2026-11-09; order not settled).
  { slug: "chord-inversions", title: "Same notes, new order" },
  { slug: "chord-family", title: "Find the chords inside a scale" },
  { slug: "pentatonic-blues", title: "Five notes, then a blue one" },
  { slug: "mode-rotator", title: "Seven modes, bright to dark" },
  { slug: "circle-of-fifths", title: "Turn the circle of fifths" },
  { slug: "chord-pad", title: "Play the chords of a key" },
  // How a piano works: from plucking to the grand action, one part at a time.
  { slug: "pluck-with-a-quill", title: "Pluck the string with a quill" },
  { slug: "press-a-tangent", title: "Strike the string and stay on it" },
  { slug: "fix-the-hammer", title: "Push a hammer with the key" },
  { slug: "let-the-hammer-fly", title: "Let the hammer fly" },
  { slug: "catch-the-hammer", title: "Catch the falling hammer" },
  { slug: "damp-the-string", title: "Stop the string when the key comes up" },
  { slug: "strike-again", title: "Strike again before the key is up" },
  { slug: "hammer-heads", title: "Wood, leather and felt hammers" },
  { slug: "grand-action", title: "Every part of a grand action" },
  { slug: "upright-action", title: "Stand the action upright" },
] as const;

export type PianoDemoSlug = (typeof pianoDemos)[number]["slug"];

/** Where a demo page links back to. Only the dev server serves these pages. */
export const pianoDemosHome = { href: "/piano/demos", label: "All piano demos" };
