import Router from "next/router";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

// UI state per browser history entry (a search term, a selected filter), so
// going back to a list shows it as the visitor left it. Next.js gives every
// entry a key in history.state; values live in sessionStorage under that key.
// Scroll positions are restored by Next.js itself (experimental.scrollRestoration).

const entryKey = () => (window.history.state as { key?: string } | null)?.key;

// The server render can't know the entry, so hydration always starts from
// the default. Restoring only applies to pages rendered after that.
let hydrated = false;

const read = <T>(name: string, fallback: T): T => {
  const key = entryKey();
  if (!hydrated || !key) return fallback;
  try {
    const saved = sessionStorage.getItem(`history-state:${key}:${name}`);
    return saved === null ? fallback : (JSON.parse(saved) as T);
  } catch {
    return fallback;
  }
};

const write = (name: string, value: unknown) => {
  const key = entryKey();
  if (!key) return;
  try {
    sessionStorage.setItem(`history-state:${key}:${name}`, JSON.stringify(value));
  } catch {}
};

/** The value saved for `name` on the current history entry, or `fallback`. */
export const readHistoryState = <T>(name: string, fallback: T) =>
  typeof window === "undefined" ? fallback : read(name, fallback);

/** Saves `value` for `name` on the current history entry. */
export const writeHistoryState = write;

/** useState that comes back with its last value when the visitor returns to this history entry. */
export function useHistoryState<T>(name: string, initial: T) {
  const [value, setValue] = useState(() => readHistoryState(name, initial));
  useEffect(() => write(name, value), [name, value]);
  return [value, setValue] as const;
}

type Previous = { path: string };

/**
 * The path of the page this history entry was pushed from, if the visitor
 * came here by a link on this site. Going back there restores that page.
 */
export const previousPath = () => read<Previous | null>("previous", null)?.path ?? null;

/** Records where each pushed history entry came from. Call once on the client. */
export const installHistoryTracking = () => {
  hydrated = true;
  let popping = false;
  let from: string | null = null;
  const onPopState = () => {
    popping = true;
  };
  const beforeHistoryChange = () => {
    from = Router.asPath.split(/[?#]/)[0];
  };
  const complete = () => {
    if (!popping && from && from !== window.location.pathname) {
      write("previous", { path: from } satisfies Previous);
    }
    popping = false;
    from = null;
  };
  window.addEventListener("popstate", onPopState, true);
  Router.events.on("beforeHistoryChange", beforeHistoryChange);
  Router.events.on("routeChangeComplete", complete);
  Router.events.on("routeChangeError", complete);
  return () => {
    window.removeEventListener("popstate", onPopState, true);
    Router.events.off("beforeHistoryChange", beforeHistoryChange);
    Router.events.off("routeChangeComplete", complete);
    Router.events.off("routeChangeError", complete);
  };
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

/**
 * Click handler for a link up to a parent page, e.g. a breadcrumb. When the
 * visitor came from that page, it goes back in history instead of pushing a
 * new entry, so the list returns with its search, filters and scroll position.
 * Otherwise the link navigates normally.
 */
export const returnToPreviousPath = (e: MouseEvent<HTMLAnchorElement>) => {
  if (!isPlainClick(e)) return;
  const url = new URL(e.currentTarget.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (url.search || url.hash || previousPath() !== url.pathname) return;
  e.preventDefault();
  window.history.back();
};
