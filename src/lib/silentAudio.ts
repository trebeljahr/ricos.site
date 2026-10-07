/**
 * True when the page should make no sound at all: a `?mute` query, a browser
 * driven by WebDriver, or the Claude desktop app's browser pane, where agents
 * click through dev previews and every click would reach the speakers.
 */
export function audioSilenced(
  nav: Pick<Navigator, "webdriver" | "userAgent"> | undefined = globalThis.navigator,
  search: string | undefined = globalThis.location?.search,
) {
  if (search && new URLSearchParams(search).has("mute")) return true;
  if (!nav) return false;
  return nav.webdriver === true || /\bClaude\//.test(nav.userAgent);
}
