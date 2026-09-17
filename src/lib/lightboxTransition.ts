import type { MouseEvent } from "react";
import { flushSync } from "react-dom";

// A gallery thumbnail morphs into the lightbox's current slide via the View
// Transitions API. Only the clicked thumbnail gets the name, because two
// elements with the same name on one page abort the whole transition. The
// closing direction is the FLIP clone in useCustomLightbox; the timing here
// and in globals.css (300ms ease-in-out) matches it.

const NAME = "lightbox-photo";
const ROOT_CLASS = "lightbox-transition";
// The lightbox chunk may still be loading and the full-size photo may still
// be downloading. Past this the morph starts anyway, over the thumbnail.
const MAX_WAIT_MS = 250;

const setName = (el: HTMLElement, name: string) => {
  el.style.viewTransitionName = name;
  el.style.viewTransitionClass = name && "lightbox";
};

// Resolves with the current slide's image once it exists and has decoded, or
// with whatever exists when the timer runs out. Only microtasks and timers:
// requestAnimationFrame never fires while the transition pauses rendering.
const slideImage = () =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const find = () => document.querySelector<HTMLImageElement>(".yarl__slide_current img");
    const done = () => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(find());
    };
    const decode = (img: HTMLImageElement) => {
      observer.disconnect();
      img
        .decode()
        .catch(() => {})
        .then(done);
    };
    const observer = new MutationObserver(() => {
      const img = find();
      if (img) decode(img);
    });
    const timer = setTimeout(done, MAX_WAIT_MS);
    const img = find();
    if (img) decode(img);
    else observer.observe(document.body, { childList: true, subtree: true });
  });

/**
 * Opens the lightbox. With view transition support, motion allowed and a plain
 * click, the clicked thumbnail morphs into the lightbox slide on the way.
 */
export const openWithLightboxTransition = (
  open: () => void,
  thumb: HTMLElement | null,
  event?: MouseEvent,
) => {
  if (
    !thumb ||
    typeof document.startViewTransition !== "function" ||
    (event &&
      (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    open();
    return;
  }

  const root = document.documentElement;
  let target: HTMLImageElement | null = null;
  const cleanup = () => {
    setName(thumb, "");
    thumb.style.removeProperty("visibility");
    if (target) setName(target, "");
    root.classList.remove(ROOT_CLASS);
  };

  try {
    setName(thumb, NAME);
    root.classList.add(ROOT_CLASS);
    const transition = document.startViewTransition(async () => {
      // The old snapshot is taken by now. The thumbnail stays in the DOM under
      // the lightbox, so it gives the name up to the slide and hides until the
      // morph lands instead of showing twice.
      setName(thumb, "");
      thumb.style.visibility = "hidden";
      flushSync(open);
      target = await slideImage();
      if (!target) return;
      // Until the full-size photo loads, show the already-cached thumbnail
      // behind it so the morph never lands on an empty box.
      const src = (thumb instanceof HTMLImageElement ? thumb : thumb.querySelector("img"))
        ?.currentSrc;
      if (src && !target.complete) {
        const img = target;
        img.style.backgroundImage = `url("${src}")`;
        img.style.backgroundSize = "100% 100%";
        img.addEventListener("load", () => img.style.removeProperty("background-image"), {
          once: true,
        });
      }
      setName(target, NAME);
    });
    // `ready` rejects when the browser skips the transition; the lightbox is open either way.
    transition.ready.catch(() => {});
    transition.finished.then(cleanup, cleanup);
  } catch {
    cleanup();
    open();
  }
};
