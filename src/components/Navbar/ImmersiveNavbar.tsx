import clsx from "clsx";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PlaygroundCrumb, PlaygroundScenesButton, PlaygroundScenesPanel } from "./PlaygroundNav";
import { MobileMenu, RicosSiteBanner, SiteNavControls, useSiteMenu } from "./TailwindNavbar";

// Long enough to read the bar on arrival, short enough to stay out of the way.
const INITIAL_HIDE_MS = 2500;
const LEAVE_HIDE_MS = 700;
// Mouse within this many px of the top edge reveals the bar.
const TOP_EDGE_PX = 6;

// Pill geometry. The bar is 52px tall (8px padding around 36px controls) and
// the pill keeps exactly that height, floating 8px in from the top and left.
// Collapsed, the left group moves 8px down and to PILL_CONTENT_LEFT, with
// 12px of room on the left and 8px on the right. The surface is BAR_HEIGHT +
// PILL_OFFSET tall so the pill has room below the bar; expanded, the clip
// hides that extra strip. The left-group shift classes below must match.
const BAR_HEIGHT = 52;
const PILL_OFFSET = 8;
const PILL_CONTENT_LEFT = 20;
const PILL_PAD_RIGHT = 8;

/**
 * The site navbar for fullscreen canvas pages. It shows the same bar as
 * every other page on arrival, then shrinks into a pill around its own left
 * group: logo (home), "3D Playground" (index) and the "scenes" toggle. The
 * pill is not a copy of that group; it is the same elements, and the bar's
 * background morphs between pill and full width around them while the
 * search, theme and menu controls fade out.
 *
 * "scenes" is the one way back in: it brings the full bar back with the
 * scene list dropped down underneath it.
 *
 * It never covers the canvas with an invisible hit area: the header ignores
 * the pointer except on the visible pill or bar, and the top-edge reveal is
 * a window pointermove check. Interacting with the scene collapses the nav
 * and drops focus out of it, so keys like Space go to the scene's controls
 * instead of re-pressing the last nav button.
 */
export function ImmersiveNavbar() {
  const [expanded, setExpanded] = useState(true);
  const menu = useSiteMenu();
  const { open: menuOpen, close: closeMenu } = menu;
  const [scenesOpen, setScenesOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(0);
  const barRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const hovering = useRef(false);

  const collapsed = !expanded && !menuOpen && !scenesOpen;
  const keepOpen = menuOpen || scenesOpen;

  const cancelHide = useCallback(() => window.clearTimeout(hideTimer.current), []);

  const scheduleHide = useCallback(
    (delay: number) => {
      cancelHide();
      hideTimer.current = window.setTimeout(() => {
        const active = document.activeElement;
        // Only the parts that disappear keep the bar open; the left group stays in the pill.
        const focusInside = controlsRef.current?.contains(active);
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

  /** Close menus and shrink back into the pill. */
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
    leftRef.current?.querySelector<HTMLElement>("[data-scenes-toggle]")?.focus();
  }, []);

  // The mobile menu and the scene list share the space under the bar.
  useEffect(() => {
    if (menuOpen) setScenesOpen(false);
  }, [menuOpen]);

  // The pill's right edge follows the left group's width (the wordmark shows from sm up).
  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setLeftWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    // Clicks on the header's transparent parts never reach here as header
    // targets: it ignores the pointer outside the visible pill or bar.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (barRef.current?.contains(target)) return;
      // Portaled UI opened from the bar (site search).
      if (target.closest?.("[role='dialog']")) return;

      const active = document.activeElement;
      if (active instanceof HTMLElement && barRef.current?.contains(active)) active.blur();
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

  const pillRight = PILL_CONTENT_LEFT + leftWidth + PILL_PAD_RIGHT;
  const surfaceStyle: CSSProperties = {
    clipPath:
      collapsed && leftWidth
        ? `inset(${PILL_OFFSET}px calc(100% - ${pillRight}px) 0px ${PILL_OFFSET}px round ${BAR_HEIGHT / 2}px)`
        : `inset(0px 0px ${PILL_OFFSET}px 0px round 0px)`,
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: blur and Escape only drive auto-hide; every action inside is a real link or button.
    <header
      ref={barRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !keepOpen) {
          scheduleHide(LEAVE_HIDE_MS);
        }
      }}
      onKeyDown={hideFromKeyboard}
      className="not-prose pointer-events-none fixed inset-x-0 top-0 z-1001 text-gray-900 dark:text-gray-100"
    >
      {/* Shadow on a wrapper: the clip on the surface itself would cut it off. */}
      <div aria-hidden className="absolute inset-0 drop-shadow-md">
        <div
          style={surfaceStyle}
          className={clsx(
            "pointer-events-auto absolute inset-x-0 top-0 h-[60px] transition-[clip-path,background-color] duration-300 ease-out motion-reduce:transition-none",
            // Solid while a panel hangs off the bar, so both read as one surface.
            keepOpen ? "bg-white dark:bg-gray-900" : "bg-white/90 dark:bg-gray-900/90",
          )}
        />
      </div>

      {/* Hover counts on the pill or bar itself only, not on the panels and backdrop hanging below it. */}
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
        className="relative mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:gap-4 xl:px-10"
      >
        <div
          ref={leftRef}
          className={clsx(
            "pointer-events-auto flex min-w-0 items-center gap-0.5 transition-transform sm:gap-1 duration-300 ease-out motion-reduce:transition-none xl:shrink-0",
            // Moves the group from the bar's padding (12px, 40px from xl) to
            // PILL_CONTENT_LEFT, and down by PILL_OFFSET into the pill.
            collapsed
              ? "translate-x-2 translate-y-2 xl:-translate-x-5"
              : "translate-x-0 translate-y-0",
          )}
        >
          <RicosSiteBanner compact />
          <PlaygroundCrumb round={collapsed} />
          <PlaygroundScenesButton
            open={scenesOpen}
            onClick={toggleScenes}
            round={collapsed}
            className="sm:ml-1"
          />
        </div>
        <div
          ref={controlsRef}
          inert={collapsed}
          className={clsx(
            "transition-opacity duration-200 ease-out motion-reduce:transition-none",
            collapsed ? "opacity-0" : "pointer-events-auto opacity-100",
          )}
        >
          <SiteNavControls menu={menu} />
        </div>
      </nav>

      <div className="pointer-events-auto">
        <MobileMenu open={menuOpen} close={closeMenu} />
        <PlaygroundScenesPanel open={scenesOpen} onClose={closeScenes} restoreFocus={focusToggle} />
      </div>
    </header>
  );
}
