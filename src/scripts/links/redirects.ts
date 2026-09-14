/**
 * Resolve a path through the redirect table Next.js emitted for the build.
 *
 * Kept free of filesystem and manifest access so it can be tested directly:
 * everything it needs is the `{ source, destination, regex }` triples out of
 * routes-manifest.json, or the same triples built by `compileRedirect`.
 */

export type RedirectRule = {
  source: string;
  destination: string;
  regex: string;
  /** Next's own trailing-slash normalisation, not something a link can fix. */
  internal?: boolean;
};

/** `:id`, `:id*`, `:path+`, `:slug?` — in the order they appear in `source`. */
const PARAM = /:([A-Za-z0-9_]+)[+*?]?/g;

function paramNames(source: string): string[] {
  return Array.from(source.matchAll(PARAM), (match) => match[1]);
}

function tidy(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

/**
 * The destination `rule` sends `path` to, or undefined when it does not match.
 * Params are filled positionally: the nth `:name` in `source` corresponds to
 * the nth capture group in `regex`, which is how Next builds the pair.
 */
export function applyRedirect(path: string, rule: RedirectRule): string | undefined {
  const match = new RegExp(rule.regex).exec(path);
  if (!match) return undefined;

  let destination = rule.destination;
  paramNames(rule.source).forEach((name, index) => {
    // The lookahead keeps `:id` from eating the start of `:idx`.
    const placeholder = new RegExp(`:${name}[+*?]?(?![A-Za-z0-9_])`, "g");
    destination = destination.replace(placeholder, match[index + 1] ?? "");
  });

  return tidy(destination);
}

const REGEX_SPECIAL = /[.+*?=^!:${}()[\]|\\]/g;
const SEGMENT_PARAM = /^:[A-Za-z0-9_]+([+*?]?)$/;
const ONE_SEGMENT = "([^/]+?)";
const MANY_SEGMENTS = "((?:[^/]+?)(?:/(?:[^/]+?))*)";

/**
 * Compile a next.config `{ source, destination }` into the regex Next writes
 * to routes-manifest.json, so code that runs before `next build` (the markdown
 * build) resolves redirects exactly like the manifest does. Only whole-segment
 * params are supported — that is all the table uses — and anything else throws
 * rather than silently diverging from Next.
 */
export function compileRedirect({
  source,
  destination,
}: {
  source: string;
  destination: string;
}): RedirectRule {
  let body = "";
  for (const segment of source.split("/").slice(1)) {
    const param = SEGMENT_PARAM.exec(segment);
    if (!param) {
      if (segment.includes(":") || segment.includes("(")) {
        throw new Error(`compileRedirect: unsupported source pattern ${source}`);
      }
      body += `/${segment.replace(REGEX_SPECIAL, "\\$&")}`;
      continue;
    }
    const modifier = param[1];
    if (modifier === "") body += `/${ONE_SEGMENT}`;
    else if (modifier === "?") body += `(?:/${ONE_SEGMENT})?`;
    else if (modifier === "+") body += `/${MANY_SEGMENTS}`;
    else body += `(?:/${MANY_SEGMENTS})?`;
  }
  return { source, destination, regex: `^(?!/_next)${body}(?:/)?$` };
}

export type RedirectChain = {
  /** Every hop after the original path; the last entry is the final target. */
  hops: string[];
  /** True when the chain ran into a loop or exceeded `maxHops`. */
  truncated: boolean;
};

/**
 * Follow `path` through the table the way Next does — first matching rule
 * wins, then re-match the result — and report the hops it takes. Returns
 * undefined when `path` is already canonical, which is the common case.
 */
export function resolveRedirectChain(
  path: string,
  rules: RedirectRule[],
  maxHops = 10,
): RedirectChain | undefined {
  const hops: string[] = [];
  const seen = new Set<string>([path]);
  let current = path;

  while (hops.length < maxHops) {
    let next: string | undefined;
    for (const rule of rules) {
      if (rule.internal) continue;
      next = applyRedirect(current, rule);
      if (next !== undefined) break;
    }
    if (next === undefined || next === current) break;
    hops.push(next);
    if (seen.has(next)) return { hops, truncated: true };
    seen.add(next);
    current = next;
  }

  if (hops.length === 0) return undefined;
  return { hops, truncated: hops.length >= maxHops };
}
