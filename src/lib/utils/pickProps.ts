/**
 * Copy only the listed fields out of a velite entry.
 *
 * getStaticProps serialises whatever it returns into __NEXT_DATA__, so handing
 * a velite document straight through ships every field the collection happens
 * to carry — including build-only ones like the absolute source `path`, and
 * bulky ones the page never renders (`markdownExcerpt`, unused excerpts).
 * Listing the fields a route actually reads keeps the payload honest.
 *
 * `undefined` values are dropped rather than copied: Next refuses to serialise
 * them, and omitting an optional field renders identically.
 *
 * The return type stays `T` on purpose. The generated velite types are already
 * incomplete (e.g. `hasMath` is missing from them), so a precise `Pick<T, K>`
 * would fail to compile on fields the pages demonstrably render.
 */
export function pickProps<T extends object>(source: T, fields: readonly string[]): T {
  const output: Record<string, unknown> = {};
  const record = source as Record<string, unknown>;

  for (const field of fields) {
    const value = record[field];
    if (value !== undefined) output[field] = value;
  }

  return output as T;
}
