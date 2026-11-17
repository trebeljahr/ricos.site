import sindreSlugify from "@sindresorhus/slugify";

// @sindresorhus/slugify 3 dropped superscript and subscript digits and
// vulgar fractions; 4 transliterates them ("Software²" became "software2").
// Published URLs were made with the old output, so these stay dropped.
const DROPPED_BY_SLUGIFY_3 = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎¼½¾";

const customReplacements: [string, string][] = [...DROPPED_BY_SLUGIFY_3].map((char) => [char, ""]);

/** URL slug for a title or file name; every route and redirect uses this one. */
export const slugify = (text: string) => sindreSlugify(text, { customReplacements });
