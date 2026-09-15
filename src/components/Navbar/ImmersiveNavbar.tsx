import { FiChevronDown } from "@components/Icons";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PlaygroundCrumb, PlaygroundDrawer, PlaygroundScenesButton } from "./PlaygroundNav";
import { MobileMenu, RicosSiteBanner, SiteNavControls, useSiteMenu } from "./TailwindNavbar";

// Long enough to read the bar on arrival, short enough to stay out of the way.
const INITIAL_HIDE_MS = 2500;
const LEAVE_HIDE_MS = 700;
// Mouse within this many px of the top edge reveals the bar.
const TOP_EDGE_PX = 6;

/**
 * The site navbar for fullscreen canvas pages. It shows the same bar as
 * every other page on arrival, then tucks itself away and leaves a small
 * pill with the way home, the playground index and the scene list.
 *
 * It never covers the canvas with an invisible hit area: the top-edge reveal
 * is a window pointermove check, not an overlay element. Interacting with the
 * scene hides the bar and drops focus out of it, so keys like Space go to
 * the scene's controls instead of re-pressing the last nav button.
 */
export function ImmersiveNavbar() {
  const [expanded, setExpanded] = useState(true);
  const menu = useSiteMenu();
  const { open: menuOpen, close: closeMenu } = menu;
  const [scenesOpen, setScenesOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const hovering = useRef(false);

  const cancelHide = useCallback(() => window.clearTimeout(hideTimer.current), []);

  const scheduleHide = useCallback(
    (delay: number) => {
      cancelHide();
      hideTimer.current = window.setTimeout(() => {
        const active = document.activeElement;
        const focusInside = barRef.current?.contains(active);
        // Site search opens a portaled dialog from the bar; keep the bar for its focus return.
        const inDialog = active?.closest("[role='dialog']");
        if (!hovering.current && !focusInside && !inDialog) setExpanded(false);
      }, delay);
    },
    [cancelHide],
  );

  const show = useCallback(() => {
    cancelHide();
    setExpanded(true);
  }, [cancelHide]);

  const closeScenes = useCallback(() => setScenesOpen(false), []);

  // Both callbacks are stable, so this runs once on arrival. Later hides are
  // driven by the pointer or focus leaving the bar.
  useEffect(() => {
    scheduleHide(INITIAL_HIDE_MS);
    return cancelHide;
  }, [scheduleHide, cancelHide]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || document.pointerLockElement) return;
      if (e.clientY > TOP_EDGE_PX) return;
      show();
      // Hide again unless the pointer actually moves onto the bar.
      scheduleHide(LEAVE_HIDE_MS * 2);
    };

    // Capture phase so scenes that stop propagation still collapse the bar.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (barRef.current?.contains(target) || pillRef.current?.contains(target)) return;
      // Portaled UI opened from the bar (site search) or the scene drawer.
      if (target.closest?.("[role='dialog']")) return;

      cancelHide();
      setExpanded(false);
      closeMenu();
      const active = document.activeElement;
      const navHasFocus = barRef.current?.contains(active) || pillRef.current?.contains(active);
      if (active instanceof HTMLElement && navHasFocus) active.blur();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [show, scheduleHide, cancelHide, closeMenu]);

  const hideFromKeyboard = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape" || menuOpen) return;
    cancelHide();
    flushSync(() => setExpanded(false));
    pillRef.current?.querySelector<HTMLElement>("[data-reveal]")?.focus();
  };

  const barHidden = !expanded && !menuOpen;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover and focus only drive auto-hide; every action inside is a real link or button. */}
      <header
        ref={barRef}
        id="immersive-navbar"
        inert={barHidden}
        onPointerEnter={() => {
          hovering.current = true;
          cancelHide();
        }}
        onPointerLeave={() => {
          hovering.current = false;
          if (!menuOpen) scheduleHide(LEAVE_HIDE_MS);
        }}
        onFocus={show}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node) && !menuOpen) {
            scheduleHide(LEAVE_HIDE_MS);
          }
        }}
        onKeyDown={hideFromKeyboard}
        className={clsx(
          "not-prose fixed inset-x-0 top-0 z-1001 bg-white/85 py-2 text-gray-900 shadow-sm backdrop-blur-md transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900/85 dark:text-gray-100",
          barHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <nav
          aria-label="Site"
          className="mx-auto flex items-center justify-between gap-4 px-3 xl:px-10"
        >
          <div className="flex min-w-0 items-center gap-1 xl:shrink-0">
            <RicosSiteBanner />
            <span className="hidden min-w-0 items-center gap-1 sm:flex">
              <PlaygroundCrumb />
            </span>
            <PlaygroundScenesButton
              open={scenesOpen}
              onClick={() => setScenesOpen((p) => !p)}
              className="ml-1"
            />
          </div>
          <SiteNavControls menu={menu} />
        </nav>
        <MobileMenu open={menuOpen} close={closeMenu} />
      </header>

      <div
        ref={pillRef}
        inert={!barHidden}
        className={clsx(
          "not-prose fixed left-2 top-2 z-1001 flex items-center gap-1 rounded-full bg-white/85 py-1 pl-3 pr-1 text-sm text-gray-900 shadow-md ring-1 ring-black/5 backdrop-blur-md transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900/85 dark:text-gray-100 dark:ring-white/10",
          barHidden ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none",
        )}
      >
        <RicosSiteBanner iconOnly />
        <PlaygroundCrumb />
        <PlaygroundScenesButton open={scenesOpen} onClick={() => setScenesOpen((p) => !p)} />
        <button
          type="button"
          data-reveal=""
          aria-expanded={!barHidden}
          aria-controls="immersive-navbar"
          onClick={() => {
            // Commit the un-inert bar before moving focus into it.
            flushSync(show);
            barRef.current?.querySelector<HTMLElement>("a, button")?.focus();
          }}
          className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="sr-only">Show site navigation</span>
          <FiChevronDown className="size-3.5" />
        </button>
      </div>

      <PlaygroundDrawer open={scenesOpen} onClose={closeScenes} />
    </>
  );
}
