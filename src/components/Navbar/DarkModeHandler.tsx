import { useTheme } from "next-themes";
import { type MouseEvent, useId } from "react";
import { flushSync } from "react-dom";

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// Sun morphs into a moon: the core grows, the rays spin away, and a masked
// circle slides in to carve the crescent. Everything is driven by the `dark`
// class on <html>, so the icon is correct on first paint without a mount gate.
const SunMoonIcon = () => {
  const maskId = `moon-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 transition-transform duration-500 ease-out dark:rotate-[40deg] motion-reduce:transition-none"
    >
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <circle
          cx="17"
          cy="7"
          r="6.5"
          fill="black"
          className="translate-x-[10px] -translate-y-[10px] transition-[translate] duration-500 ease-out dark:translate-x-0 dark:translate-y-0 motion-reduce:transition-none"
        />
      </mask>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="currentColor"
        mask={`url(#${maskId})`}
        className="origin-center scale-[0.5] transition-[scale] duration-500 ease-out [transform-box:fill-box] dark:scale-100 motion-reduce:transition-none"
      />
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="origin-center transition-[opacity,scale,rotate] duration-500 ease-out [transform-box:view-box] dark:scale-50 dark:rotate-45 dark:opacity-0 motion-reduce:transition-none"
      >
        {RAY_ANGLES.map((angle) => (
          <line key={angle} x1="12" y1="2" x2="12" y2="4" transform={`rotate(${angle} 12 12)`} />
        ))}
      </g>
    </svg>
  );
};

// Switching to light spreads the light page out of the button as a circle;
// switching back shrinks it into the button again, the same motion reversed.
// Like an Android ripple, the circle's centre drifts from the click point to
// the middle of the screen while it grows, so it reaches every corner at the
// same moment instead of hitting the nearest edge first and crawling to the
// far one. The `theme-reveal` class scopes the CSS (globals.css) to this
// transition, so the card cover morph keeps its default root crossfade.
const revealTheme = (e: MouseEvent<HTMLButtonElement>, toLight: boolean, apply: () => void) => {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    apply();
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  // Keyboard activation has no pointer position (detail 0): use the button centre.
  const x = e.detail ? e.clientX : rect.left + rect.width / 2;
  const y = e.detail ? e.clientY : rect.top + rect.height / 2;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const root = document.documentElement;

  root.classList.add("theme-reveal");
  root.classList.toggle("theme-reveal-in", !toLight);
  let clip: Animation | undefined;
  const cleanUp = () => {
    // `fill: both` keeps the animation alive on <html> after the pseudo
    // element is gone; cancel it so toggles don't pile up animations.
    clip?.cancel();
    root.classList.remove("theme-reveal", "theme-reveal-in");
  };
  try {
    // flushSync so next-themes has swapped the `dark` class before the new
    // snapshot is taken.
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready
      .then(() => {
        clip = root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${Math.hypot(width, height) / 2}px at ${width / 2}px ${height / 2}px)`,
            ],
          },
          {
            duration: 600,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            // Shrinking runs the growing animation backwards on the outgoing
            // light page, which sits on top (globals.css).
            direction: toLight ? "normal" : "reverse",
            fill: "both",
            pseudoElement: toLight ? "::view-transition-new(root)" : "::view-transition-old(root)",
          },
        );
      })
      .catch(() => {});
    transition.finished.finally(cleanUp);
  } catch {
    cleanUp();
    apply();
  }
};

export const DarkModeHandler = () => {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <button
      type="button"
      className="inline-flex size-9 items-center justify-center rounded-md transition-colors duration-300 ease-out hover:bg-accent/10 hover:text-accent motion-reduce:transition-none"
      onClick={(e) => {
        const toLight = resolvedTheme === "dark";
        revealTheme(e, toLight, () => setTheme(toLight ? "light" : "dark"));
      }}
      aria-label="Toggle dark mode"
    >
      <SunMoonIcon />
    </button>
  );
};
