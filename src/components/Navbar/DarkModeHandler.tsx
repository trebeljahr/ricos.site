import { useTheme } from "next-themes";
import { useId } from "react";
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

// Switching to light is a lamp switching on: the light page spreads down from
// the top centre of the screen as a circle until it reaches both bottom
// corners. Switching back runs the same motion reversed, pulling the light up
// into the top again. The `theme-reveal` class scopes the CSS (globals.css) to this
// transition, so the card cover morph keeps its default root crossfade.
//
// Phones skip the glowing edge: its ring is a full-screen gradient repainted on
// every frame, which stutters on a phone GPU at 3x pixel density.
const revealTheme = (toLight: boolean, apply: () => void) => {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    apply();
    return;
  }

  const x = window.innerWidth / 2;
  const radius = Math.hypot(x, window.innerHeight);
  const root = document.documentElement;
  const withGlow = !window.matchMedia("(pointer: coarse)").matches;

  root.classList.add("theme-reveal");
  root.classList.toggle("theme-reveal-in", !toLight);
  // Empty overlay whose transition group draws the glowing edge (globals.css).
  // A quick second toggle can start before the first one cleans up, and two
  // elements with the same transition name abort the transition.
  document.querySelectorAll(".theme-reveal-glow").forEach((el) => el.remove());
  const glowElement = document.createElement("div");
  glowElement.className = "theme-reveal-glow";
  if (withGlow) document.body.append(glowElement);
  let clip: Animation | undefined;
  let glow: Animation | undefined;
  let dim: Animation | undefined;
  const cleanUp = () => {
    // `fill: both` keeps the animations alive on <html> after the pseudo
    // elements are gone; cancel them so toggles don't pile up animations.
    clip?.cancel();
    glow?.cancel();
    dim?.cancel();
    glowElement.remove();
    root.classList.remove("theme-reveal", "theme-reveal-in", "theme-reveal-swap");
  };
  try {
    // flushSync so next-themes has swapped the `dark` class before the new
    // snapshot is taken. The new snapshot is live, so `theme-reveal-swap`
    // turns off CSS transitions first: otherwise navbar and cards fade from
    // their old colours inside the lit circle. Set here rather than before the
    // transition so the whole page restyles once, not twice.
    const transition = document.startViewTransition(() => {
      root.classList.add("theme-reveal-swap");
      flushSync(apply);
    });
    transition.ready
      .then(() => {
        const timing: KeyframeAnimationOptions = {
          duration: 600,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          // Shrinking runs the growing animation backwards on the outgoing
          // light page, which sits on top (globals.css).
          direction: toLight ? "normal" : "reverse",
          fill: "both",
        };
        clip = root.animate(
          {
            clipPath: [`circle(0px at ${x}px 0px)`, `circle(${radius}px at ${x}px 0px)`],
          },
          {
            ...timing,
            pseudoElement: toLight ? "::view-transition-new(root)" : "::view-transition-old(root)",
          },
        );
        // Same timing, so the ring stays on the clip edge. It fades at both
        // ends so no glowing dot lingers at the top of the screen.
        glow = withGlow
          ? root.animate(
              {
                "--theme-reveal-r": ["0px", `${radius}px`],
                opacity: [0, 1, 1, 0],
              },
              { ...timing, pseudoElement: "::view-transition-group(theme-reveal-glow)" },
            )
          : undefined;
        // Images look the same in both themes, so the edge alone crosses them
        // unseen. Dimming the dark page while the light moves splits each image
        // into a lit and an unlit part. The dark page starts at full brightness
        // when it is on screen, so nothing jumps: switching to light, it dims
        // as it gets covered; switching to dark, it recovers as it is revealed.
        dim = root.animate(
          { filter: ["brightness(1)", "brightness(0.55)"] },
          {
            ...timing,
            pseudoElement: toLight ? "::view-transition-old(root)" : "::view-transition-new(root)",
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
      onClick={() => {
        const toLight = resolvedTheme === "dark";
        revealTheme(toLight, () => setTheme(toLight ? "light" : "dark"));
      }}
      aria-label="Toggle dark mode"
    >
      <SunMoonIcon />
    </button>
  );
};
