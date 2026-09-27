/**
 * Thousands-separated integers for text that is rendered on the server and
 * then hydrated in the browser.
 *
 * The locale is pinned rather than left ambient because `toLocaleString()`
 * with no argument resolves against whoever is running it, and that is two
 * different machines for the same string. The build box prints "4,900" into
 * the HTML; a visitor whose browser is set to de-DE prints "4.900" on the
 * first client render, and React reports a hydration mismatch and throws the
 * server markup away for that subtree. Nothing on this site is localised —
 * the prose around these numbers is English — so pinning en-US is the whole
 * fix, and it is one call rather than a `suppressHydrationWarning` on every
 * count.
 *
 * Verified in this session: a Node process with LC_ALL=de_DE.UTF-8 prints
 * "4.900" from the bare call and "4,900" from this one.
 *
 * Shared by the photography colour pages (the wheel's centre number, the
 * family counts, the spectrum copy and its per-tile labels), which is why it
 * sits in src/lib/utils rather than next to any one of them: the spectrum is a
 * client component and must not import from src/lib/photographyColors, whose
 * module scope reads the 2.8 MB metadata.json.
 */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}
