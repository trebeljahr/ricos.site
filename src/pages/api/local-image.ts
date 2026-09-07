/**
 * Flat, query-param entry point for the local image pipeline.
 *
 * The implementation lives in ./img/[...slug]. This route exists because the
 * catch-all cannot carry a key as a single opaque value: Next splits the path
 * on "/" and decodes each segment, so keys containing spaces or other
 * characters that need escaping round-trip inconsistently. Passing the whole
 * key as one encodeURIComponent'd `slug` query param avoids that entirely.
 *
 * `config` has to be re-declared here rather than inherited from the
 * re-exported module — Next reads it statically, per route file.
 *
 * /api/img/* still works: next.config.mjs rewrites it here (beforeFiles) so
 * URLs already baked into built pages keep resolving.
 */
export { default } from "./img/[...slug]";

export const config = {
  api: {
    responseLimit: false,
  },
};
