import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PlaygroundCrumb, PlaygroundScenesButton, PlaygroundScenesPanel } from "./PlaygroundNav";
import { MobileMenu, RicosSiteBanner, SiteNavControls, useSiteMenu } from "./TailwindNavbar";

// Long enough to read the bar on arrival, short enough to stay out of the way.
const INITIAL_HIDE_MS = 2500;
const LEAVE_HIDE_MS = 700;
// Mouse within this many px of the top edge reveals the bar.
const TOP_EDGE_PX = 6;

/**
 * The site navbar for fullscreen canvas pages. It shows the same bar as
 * every other page on arrival, then tucks itself away and leaves a small
 * pill: logo (home), "3D Playground" (index) and a "scenes" toggle. The
 * toggle is the one way back into the nav: it brings the full bar back with
 * the scene list dropped down underneath it.
 *
 * It never covers the canvas with an invisible hit area: the top-edge reveal
 * is a window pointermove check, not an overlay element. Interacting with the
 * scene hides everything and drops focus out of the nav, so keys like Space
 * go to the scene's controls instead of re-pressing the last nav button.
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

  const barHidden = !expanded && !menuOpen && !scenesOpen;

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

  /** Close menus and tuck the bar back into the pill. */
  const collapse = useCallback(() => {
    cancelHide();
    setScenesOpen(false);
    closeMenu();
    setExpanded(false);
  }, [cancelHide, closeMenu]);

  // Closing the list leaves the nav entirely, unless the pointer is on the bar.
  const closeScenes = useCallback(() => {
    setScenesOpen(false);
    if (!hovering.current) setExpanded(false);
  }, []);

  const toggleScenes = () => {
    if (scenesOpen) {
      closeScenes();
      return;
    }
    closeMenu();
    show();
    setScenesOpen(true);
  };

  const focusToggle = useCallback(() => {
    const target = barRef.current?.inert ? pillRef.current : barRef.current;
    target?.querySelector<HTMLElement>("[data-scenes-toggle]")?.focus();
  }, []);

  // The mobile menu and the scene list share the space under the bar.
  useEffect(() => {
    if (menuOpen) setScenesOpen(false);
  }, [menuOpen]);

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
      // Portaled UI opened from the bar (site search).
      if (target.closest?.("[role='dialog']")) return;

      const active = document.activeElement;
      const navHasFocus = barRef.current?.contains(active) || pillRef.current?.contains(active);
      if (active instanceof HTMLElement && navHasFocus) active.blur();
      collapse();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [show, scheduleHide, collapse]);

  const hideFromKeyboard = (e: React.KeyboardEvent) => {
    // The mobile menu handles its own Escape and returns focus to its toggle.
    if (e.key !== "Escape" || menuOpen) return;
    flushSync(collapse);
    focusToggle();
  };

  const keepOpen = menuOpen || scenesOpen;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focus only drives auto-hide; every action inside is a real link or button. */}
      <header
        ref={barRef}
        inert={barHidden}
        onFocus={show}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node) && !keepOpen) {
            scheduleHide(LEAVE_HIDE_MS);
          }
        }}
        onKeyDown={hideFromKeyboard}
        className={clsx(
          "not-prose fixed inset-x-0 top-0 z-1001 py-2 text-gray-900 transition-[translate,opacity,background-color] duration-300 ease-out motion-reduce:transition-none dark:text-gray-100",
          // Solid while a panel hangs off the bar, so both read as one surface.
          keepOpen
            ? "bg-white shadow-sm dark:bg-gray-900"
            : "bg-white/85 shadow-sm backdrop-blur-md dark:bg-gray-900/85",
          barHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        {/* Hover counts on the bar itself only, not on the panels and backdrop hanging below it. */}
        <nav
          aria-label="Site"
          onPointerEnter={() => {
            hovering.current = true;
            cancelHide();
          }}
          onPointerLeave={() => {
            hovering.current = false;
            if (!keepOpen) scheduleHide(LEAVE_HIDE_MS);
          }}
          className="mx-auto flex items-center justify-between gap-4 px-3 xl:px-10"
        >
          <div className="flex min-w-0 items-center gap-1 xl:shrink-0">
            <RicosSiteBanner compact />
            {/* No room on phones next to search, theme and menu; the pill and the scene panel link the index. */}
            <span className="hidden min-w-0 items-center gap-1 sm:flex">
              <PlaygroundCrumb />
            </span>
            <PlaygroundScenesButton open={scenesOpen} onClick={toggleScenes} className="ml-1" />
          </div>
          <SiteNavControls menu={menu} />
        </nav>
        <MobileMenu open={menuOpen} close={closeMenu} />
        <PlaygroundScenesPanel open={scenesOpen} onClose={closeScenes} restoreFocus={focusToggle} />
      </header>

      <div
        ref={pillRef}
        inert={!barHidden}
        className={clsx(
          "not-prose fixed top-2 left-2 z-1001 flex items-center gap-1 rounded-full bg-white/85 py-0.5 pr-0.5 pl-3 text-sm text-gray-900 shadow-md ring-1 ring-black/5 backdrop-blur-md transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900/85 dark:text-gray-100 dark:ring-white/10",
          barHidden ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <RicosSiteBanner iconOnly />
        <PlaygroundCrumb />
        <span aria-hidden className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-700" />
        <PlaygroundScenesButton open={scenesOpen} onClick={toggleScenes} round />
      </div>
    </>
  );
}
