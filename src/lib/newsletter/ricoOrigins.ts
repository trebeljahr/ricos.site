/**
 * The sites allowed to call /api/announce-signup from a browser: Rico's
 * own domains and their subdomains, over https. Add a domain here when a
 * new project gets its own; shared hosts (vercel.app, github.io, itch.io)
 * never belong here, since anyone can publish under them.
 */
export const RICO_DOMAINS = [
  "ricos.site",
  "trebeljahr.com",
  "ricoslabs.com",
  "playtiao.com",
  "fractal.garden",
  "collectionofbeauty.com",
  "trackyourtime.dev",
] as const;

/**
 * `true` for `https://<domain>` or `https://<sub>.<domain>` of a domain
 * above, on the default port. `requestHost` (the Host header) also lets
 * a page call its own deployment, so previews and dev servers work.
 */
export function isRicoOrigin(origin: string, requestHost?: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin) return false;
  if (requestHost && url.host === requestHost.toLowerCase()) return true;
  if (url.protocol !== "https:" || url.port !== "") return false;
  const host = url.hostname;
  return RICO_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
