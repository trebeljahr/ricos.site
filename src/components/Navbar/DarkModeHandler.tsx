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

// The new theme spreads out as a circle from the button. The `theme-reveal`
// class scopes the CSS (globals.css) to this transition, so the card cover
// morph keeps its default root crossfade.
const revealTheme = (e: MouseEvent<HTMLButtonElement>, apply: () => void) => {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    apply();
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;

  root.classList.add("theme-reveal");
  try {
    // flushSync so next-themes has swapped the `dark` class before the new
    // snapshot is taken.
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 500,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        ),
      )
      .catch(() => {});
    transition.finished.finally(() => root.classList.remove("theme-reveal"));
  } catch {
    root.classList.remove("theme-reveal");
    apply();
  }
};

export const DarkModeHandler = () => {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <button
      type="button"
      className="inline-flex size-9 items-center justify-center rounded-md transition-colors duration-300 ease-out hover:bg-accent/10 hover:text-accent motion-reduce:transition-none"
      onClick={(e) => revealTheme(e, () => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
      aria-label="Toggle dark mode"
    >
      <SunMoonIcon />
    </button>
  );
};
