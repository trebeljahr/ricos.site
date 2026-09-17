import Router from "next/router";
import type { CSSProperties, MouseEvent } from "react";

// A card's cover morphs into the destination page's cover via the View
// Transitions API. Both ends share `view-transition-name: cover-<path>`; the
// card only gets its name on click, because two elements with the same name
// on one page abort the whole transition.

const toName = (path: string) => {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {}
  const ident = decoded.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `cover-${ident}`;
};

/** Style for the destination page's cover. `path` is the page URL, e.g. `posts/my-slug`. */
export const coverTransitionStyle = (path: string): CSSProperties => ({
  viewTransitionName: toName(path),
  viewTransitionClass: "cover",
});

// Long enough for a prefetched page, short enough that a slow fetch never
// leaves the old page frozen for the browser's full 4s timeout.
const MAX_WAIT_MS = 1500;

/**
 * Click handler for a card link. Takes over plain left clicks when the browser
 * supports view transitions and the visitor allows motion; everything else
 * falls through to next/link untouched.
 */
export const startCoverTransition = (
  e: MouseEvent<HTMLAnchorElement>,
  cover: HTMLElement | null,
) => {
  const link = e.currentTarget;
  if (
    !cover ||
    typeof document.startViewTransition !== "function" ||
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    (link.target && link.target !== "_self") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;

  e.preventDefault();

  // Snapshot the card flat: a hover lift or tilt would otherwise be baked into
  // the starting frame. The page is replaced right after, so no cleanup.
  link.style.transition = "none";
  link.style.transform = "none";
  link.style.setProperty("--rx", "0deg");
  link.style.setProperty("--ry", "0deg");
  const name = toName(url.pathname);
  cover.style.viewTransitionName = name;
  cover.style.viewTransitionClass = "cover";

  const href = url.pathname + url.search + url.hash;
  const navigate = () => Router.push(href).catch(() => false);

  // Resolves once the new page has rendered and its cover image has decoded,
  // so the morph lands on the photo rather than the loading skeleton. No
  // requestAnimationFrame here: rendering is paused until this resolves.
  const newPageReady = () =>
    new Promise<void>((resolve) => {
      const finish = () => {
        Router.events.off("routeChangeComplete", rendered);
        Router.events.off("routeChangeError", finish);
        clearTimeout(timer);
        resolve();
      };
      const rendered = () => {
        const target = [...document.querySelectorAll<HTMLElement>("[style*=view-transition]")].find(
          (el) => el.style.viewTransitionName === name,
        );
        const img = target?.querySelector("img");
        (img ? img.decode() : Promise.resolve()).catch(() => {}).then(() => setTimeout(finish));
      };
      const timer = setTimeout(finish, MAX_WAIT_MS);
      Router.events.on("routeChangeComplete", rendered);
      Router.events.on("routeChangeError", finish);
      void navigate();
    });

  try {
    // The callback runs after the old snapshot is taken, so the DOM swap
    // can't race it.
    const transition = document.startViewTransition(newPageReady);
    // `ready` rejects when the browser skips the transition; navigation still runs.
    transition.ready.catch(() => {});
  } catch {
    cover.style.viewTransitionName = "";
    void navigate();
  }
};
