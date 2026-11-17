import { useEffect, useSyncExternalStore } from "react";

// Where a reader of the "how computers work" series left off: the last chapter
// they opened and, per chapter, how far down they had scrolled. It lives only
// in this browser's localStorage, with no login, cookie or server. Storage may
// be missing, blocked or full; every read and write is guarded and the page
// works the same without it.

export const READING_KEY = "ricos-computer-reading-v1";

export type ReadingState = {
  /** Slug of the chapter opened last. */
  last: string | null;
  /** Scroll offset in CSS pixels per chapter slug; 0 once read to the end. */
  chapters: Readonly<Record<string, number>>;
};

export const EMPTY_READING: ReadingState = { last: null, chapters: {} };

/** Readers this close to the end have finished the chapter: open it at the top next time. */
const END_FRACTION = 0.95;
const SAVE_EVERY_MS = 500;
/** How long a restore waits for lazy demos to make the page tall enough. */
const RESTORE_FOR_MS = 4000;

export function parseReading(raw: string | null): ReadingState {
  if (!raw) return EMPTY_READING;
  try {
    const value = JSON.parse(raw) as Partial<ReadingState> | null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_READING;
    const chapters: Record<string, number> = {};
    if (value.chapters && typeof value.chapters === "object") {
      for (const [slug, y] of Object.entries(value.chapters)) {
        if (typeof y === "number" && Number.isFinite(y) && y >= 0) chapters[slug] = Math.round(y);
      }
    }
    const last = typeof value.last === "string" && value.last in chapters ? value.last : null;
    return { last, chapters };
  } catch {
    return EMPTY_READING;
  }
}

let cachedRaw: string | null | undefined;
let cached: ReadingState = EMPTY_READING;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(READING_KEY);
  } catch {
    return null;
  }
}

function getReading(): ReadingState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseReading(raw);
  }
  return cached;
}

function writeReading(next: ReadingState) {
  try {
    localStorage.setItem(READING_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked or full: the reader simply starts at the top next time.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === READING_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const serverReading = () => EMPTY_READING;

/** Saved reading state for the series index; empty during server rendering and hydration. */
export const useReadingState = () => useSyncExternalStore(subscribe, getReading, serverReading);

export function saveChapterPosition(slug: string, y: number) {
  const current = getReading();
  writeReading({
    last: slug,
    chapters: { ...current.chapters, [slug]: Math.max(0, Math.round(y)) },
  });
}

function scrollRange() {
  const root = document.scrollingElement ?? document.documentElement;
  return Math.max(0, root.scrollHeight - window.innerHeight);
}

/** Offset to remember for the current scroll position: 0 when the reader is at the end. */
export function positionToSave(y: number, range: number) {
  if (range <= 0 || y >= range * END_FRACTION) return 0;
  return y;
}

/**
 * On a chapter page: marks the chapter as the last one opened, remembers the
 * scroll position while the reader scrolls, and brings them back to it when
 * they open the chapter again. No restore when the URL has a #hash or when
 * something else (back button, browser restore) already scrolled the page.
 */
export function useReadingPosition(slug: string) {
  useEffect(() => {
    const saved = getReading().chapters[slug] ?? 0;
    saveChapterPosition(slug, saved);

    let restoring = saved > 0 && !window.location.hash && window.scrollY < 50;
    let frame = 0;
    const started = performance.now();

    const stopRestoring = () => {
      restoring = false;
      cancelAnimationFrame(frame);
    };
    // Demos above the saved offset load lazily and change height after the
    // first jump, so keep the reader at the offset until the page settles or
    // they scroll, click or type themselves.
    const tryRestore = () => {
      if (!restoring) return;
      if (performance.now() - started > RESTORE_FOR_MS) {
        stopRestoring();
        return;
      }
      if (scrollRange() >= saved && Math.abs(window.scrollY - saved) > 2) {
        window.scrollTo({ top: saved, behavior: "instant" });
      }
      frame = requestAnimationFrame(tryRestore);
    };
    if (restoring) frame = requestAnimationFrame(tryRestore);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      timer = null;
      if (restoring) return;
      saveChapterPosition(slug, positionToSave(window.scrollY, scrollRange()));
    };
    const onScroll = () => {
      if (timer === null) timer = setTimeout(save, SAVE_EVERY_MS);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    const userInput = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    for (const type of userInput) window.addEventListener(type, stopRestoring, { passive: true });
    return () => {
      const wasRestoring = restoring;
      stopRestoring();
      if (timer !== null && !wasRestoring) {
        clearTimeout(timer);
        save();
      }
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      for (const type of userInput) window.removeEventListener(type, stopRestoring);
    };
  }, [slug]);
}
