import Router from "next/router";
import type { CSSProperties, MouseEvent } from "react";
import { previousPath } from "src/lib/historyState";

// A card's cover morphs into the destination page's cover via the View
// Transitions API, and back again when the visitor returns to the list. Both
// ends share `view-transition-name: cover-<path>`. Page covers carry the name
// all the time; a card only gets it for one transition, because two elements
// with the same name on one page abort the whole transition. Cards mark their
// cover with `data-cover-name` so the way back can find them.

const toName = (path: string) => {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {}
  const ident = decoded.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `cover-${ident}`;
};

/** Marks a card's cover element, e.g. `<div {...coverTarget("/posts/my-slug")}>`. */
export const coverTarget = (link: string) => ({ "data-cover-name": toName(link.split(/[?#]/)[0]) });

/** Style for the destination page's cover. `path` is the page URL, e.g. `posts/my-slug`. */
export const coverTransitionStyle = (path: string): CSSProperties => ({
  viewTransitionName: toName(path),
  viewTransitionClass: "cover",
});

// Long enough for a prefetched page, short enough that a slow fetch never
// leaves the old page frozen for the browser's full 4s timeout.
const MAX_WAIT_MS = 1500;

const canMorph = () =>
  typeof document.startViewTransition === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const namedCovers = () =>
  [...document.querySelectorAll<HTMLElement>("[style*=view-transition-name]")].filter((el) =>
    el.style.viewTransitionName.startsWith("cover-"),
  );

const cardCover = (name: string) =>
  document.querySelector<HTMLElement>(`[data-cover-name="${CSS.escape(name)}"]`);

const onScreen = (el: HTMLElement) => {
  const { top, bottom } = el.getBoundingClientRect();
  return bottom > 0 && top < window.innerHeight;
};

const setName = (el: HTMLElement, name: string) => {
  el.style.viewTransitionName = name;
  el.style.viewTransitionClass = name && "cover";
};

/**
 * Runs a route change inside a view transition. `navigate` starts the change.
 * Covers named on the old page morph into the card or page cover with the
 * same name on the new page; a card only joins in when it is on screen.
 */
const morphCovers = (navigate: () => void, afterRender?: () => void) => {
  const leaving = namedCovers().map((el) => el.style.viewTransitionName);
  const namedCards = new Set<HTMLElement>();
  const clearCards = () => {
    for (const card of namedCards) setName(card, "");
  };

  // Resolves once the new page has rendered (Next.js has restored its scroll
  // position by then) and the covers taking part have decoded, so the morph
  // lands on the photo rather than the loading skeleton. No
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
        afterRender?.();
        const present = new Set(namedCovers().map((el) => el.style.viewTransitionName));
        for (const name of leaving) {
          const card = present.has(name) ? null : cardCover(name);
          if (!card || !onScreen(card)) continue;
          setName(card, name);
          namedCards.add(card);
        }
        const images = namedCovers().flatMap((el) => [...el.querySelectorAll("img")].slice(-1));
        Promise.all(images.map((img) => img.decode().catch(() => {}))).then(() =>
          setTimeout(finish),
        );
      };
      const timer = setTimeout(finish, MAX_WAIT_MS);
      Router.events.on("routeChangeComplete", rendered);
      Router.events.on("routeChangeError", finish);
      navigate();
    });

  try {
    // The callback runs after the old snapshot is taken, so the DOM swap
    // can't race it.
    const transition = document.startViewTransition(newPageReady);
    // `ready` rejects when the browser skips the transition; navigation still runs.
    transition.ready.catch(() => {});
    transition.finished.then(clearCards, clearCards);
  } catch {
    clearCards();
    navigate();
  }
};

const isPlainClick = (e: MouseEvent<HTMLAnchorElement>) => {
  const link = e.currentTarget;
  return !(
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    (link.target && link.target !== "_self")
  );
};

const sameOriginPath = (link: HTMLAnchorElement) => {
  const url = new URL(link.href, window.location.href);
  return url.origin === window.location.origin ? url : null;
};

const push = (url: URL) => {
  void Router.push(url.pathname + url.search + url.hash).catch(() => false);
};

/**
 * Click handler for a card link. Takes over plain left clicks when the browser
 * supports view transitions and the visitor allows motion; everything else
 * falls through to next/link untouched.
 */
export const startCoverTransition = (
  e: MouseEvent<HTMLAnchorElement>,
  cover: HTMLElement | null,
) => {
  const url = sameOriginPath(e.currentTarget);
  if (!cover || !url || url.pathname === window.location.pathname) return;
  if (!isPlainClick(e) || !canMorph()) return;

  e.preventDefault();

  // Snapshot the card flat: a hover lift would otherwise be baked into the
  // starting frame. The page is replaced right after, so no cleanup.
  const link = e.currentTarget;
  link.style.transition = "none";
  link.style.transform = "none";
  setName(cover, toName(url.pathname));
  morphCovers(() => push(url));
};

/**
 * Click handler for a link up to a parent page, e.g. a breadcrumb. When the
 * visitor came from that page, it goes back in history instead, so the list
 * returns with its search and scroll position and the cover flies back into
 * its card. Otherwise the cover still morphs if the card is on screen.
 */
export const returnWithCoverTransition = (e: MouseEvent<HTMLAnchorElement>) => {
  const url = sameOriginPath(e.currentTarget);
  if (!url || !isPlainClick(e)) return;

  if (!url.search && !url.hash && previousPath() === url.pathname) {
    e.preventDefault();
    window.history.back();
    return;
  }
  if (!canMorph() || namedCovers().length === 0) return;
  e.preventDefault();
  morphCovers(() => push(url));
};

type PopStateRouter = { onPopState: (e: PopStateEvent) => void };
type HistoryState = { as: string; key: string };

/**
 * Morphs covers on the browser's back and forward buttons. Skipped when the
 * browser animates the navigation itself, like a swipe back on iOS or
 * Android's predictive back. Call once on the client.
 */
export const installCoverTransitions = () => {
  const router = Router.router as unknown as PopStateRouter | null;
  if (!router) return () => {};
  let replaying = false;

  Router.beforePopState((state) => {
    // Called from inside the router's popstate listener, so the event is current.
    const event = window.event;
    if (replaying || !(event instanceof PopStateEvent)) return true;
    if (event.hasUAVisualTransition || !canMorph()) return true;

    // The URL has already changed; the router and the page haven't yet.
    const { as, key } = state as unknown as HistoryState;
    const to = new URL(as, window.location.href).pathname;
    if (Router.asPath.split(/[?#]/)[0] === to) return true;
    const card = cardCover(toName(to));
    const forward = card && onScreen(card) ? card : null;
    if (!forward && namedCovers().length === 0) return true;

    // The router has already read this entry's saved scroll position for the
    // navigation it is about to skip; the replay below would start at the top.
    let scroll: { x: number; y: number } | null = null;
    try {
      scroll = JSON.parse(sessionStorage.getItem(`__next_scroll_${key}`) ?? "null");
    } catch {}

    if (forward) setName(forward, toName(to));
    morphCovers(
      () => {
        replaying = true;
        try {
          router.onPopState(event);
        } finally {
          replaying = false;
        }
      },
      () => {
        if (scroll) window.scrollTo({ left: scroll.x, top: scroll.y, behavior: "instant" });
      },
    );
    return false;
  });
  return () => Router.beforePopState(() => true);
};
