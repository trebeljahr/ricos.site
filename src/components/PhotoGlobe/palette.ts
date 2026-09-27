import { useEffect, useState } from "react";
import type { TripRegion } from "src/lib/photoGeo";

/**
 * Colours for the globe, read from the CSS custom properties declared in
 * `src/styles/globals.css`. Keeping them in CSS means light and dark mode are defined in
 * one place with the rest of the site, and the page can paint a legend swatch with the
 * same `var(--globe-region-…)` the 3D scene uses.
 */
export type GlobePalette = {
  ocean: string;
  land: string;
  coast: string;
  graticule: string;
  atmosphere: string;
  region: Record<TripRegion, string>;
};

/** CSS variable name per region — handy for DOM legend swatches on the page. */
export const REGION_CSS_VARIABLES: Record<TripRegion, string> = {
  Europe: "--globe-region-europe",
  "South Asia": "--globe-region-south-asia",
  "Southeast Asia": "--globe-region-southeast-asia",
  Caribbean: "--globe-region-caribbean",
  "South America": "--globe-region-south-america",
  "Africa/Middle East": "--globe-region-africa-middle-east",
  Atlantic: "--globe-region-atlantic",
  Global: "--globe-region-global",
};

/**
 * Regions that earn a legend swatch. `Global` is only ever the `best-of` collection,
 * which is a curation rather than a place and is drawn as a dimmed scatter.
 */
export const LEGEND_REGIONS: TripRegion[] = [
  "Europe",
  "South Asia",
  "Southeast Asia",
  "Caribbean",
  "South America",
  "Africa/Middle East",
  "Atlantic",
];

const SURFACE_CSS_VARIABLES = {
  ocean: "--globe-ocean",
  land: "--globe-land",
  coast: "--globe-coast",
  graticule: "--globe-graticule",
  atmosphere: "--globe-atmosphere",
} as const;

/**
 * Used for the first render and whenever the stylesheet has not landed yet. These are the
 * dark values because `_app.tsx` sets `defaultTheme="dark"`, so a wrong first frame is
 * far less likely to flash.
 */
export const FALLBACK_PALETTE: GlobePalette = {
  ocean: "rgb(11, 20, 34)",
  land: "rgb(32, 45, 63)",
  coast: "rgb(72, 99, 132)",
  graticule: "rgb(30, 44, 64)",
  atmosphere: "rgb(76, 138, 214)",
  region: {
    Europe: "rgb(126, 166, 255)",
    "South Asia": "rgb(246, 174, 92)",
    "Southeast Asia": "rgb(80, 200, 183)",
    Caribbean: "rgb(242, 132, 190)",
    "South America": "rgb(154, 208, 96)",
    "Africa/Middle East": "rgb(243, 133, 117)",
    Atlantic: "rgb(181, 149, 252)",
    Global: "rgb(148, 159, 176)",
  },
};

function readPalette(): GlobePalette {
  const styles = getComputedStyle(document.documentElement);
  const read = (variable: string, fallback: string) =>
    styles.getPropertyValue(variable).trim() || fallback;

  const region = {} as Record<TripRegion, string>;
  for (const key of Object.keys(REGION_CSS_VARIABLES) as TripRegion[]) {
    region[key] = read(REGION_CSS_VARIABLES[key], FALLBACK_PALETTE.region[key]);
  }

  return {
    ocean: read(SURFACE_CSS_VARIABLES.ocean, FALLBACK_PALETTE.ocean),
    land: read(SURFACE_CSS_VARIABLES.land, FALLBACK_PALETTE.land),
    coast: read(SURFACE_CSS_VARIABLES.coast, FALLBACK_PALETTE.coast),
    graticule: read(SURFACE_CSS_VARIABLES.graticule, FALLBACK_PALETTE.graticule),
    atmosphere: read(SURFACE_CSS_VARIABLES.atmosphere, FALLBACK_PALETTE.atmosphere),
    region,
  };
}

/**
 * The palette for the current theme, re-read whenever the `dark` class on `<html>`
 * changes.
 *
 * It watches the class rather than `useTheme()` from next-themes because
 * `DarkModeHandler` flips the theme inside a View Transition: the class is the thing that
 * actually drives the CSS, so watching it keeps the scene in step with the rest of the
 * page.
 */
export function useGlobePalette(): GlobePalette {
  const [palette, setPalette] = useState<GlobePalette>(FALLBACK_PALETTE);

  useEffect(() => {
    // Keep the old object when nothing actually changed. Several unrelated features write
    // classes onto <html> mid-transition — the theme reveal, the lightbox, the list
    // transition — and a fresh palette identity per mutation would rebuild every marker
    // geometry that memoises on it, several times, during the transition.
    const update = () => setPalette((previous) => reuseIfEqual(previous, readPalette()));
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return palette;
}

/** Structural equality on a palette, so an unchanged theme keeps the same object. */
function reuseIfEqual(previous: GlobePalette, next: GlobePalette): GlobePalette {
  if (
    previous.ocean !== next.ocean ||
    previous.land !== next.land ||
    previous.coast !== next.coast ||
    previous.graticule !== next.graticule ||
    previous.atmosphere !== next.atmosphere
  ) {
    return next;
  }
  for (const region of Object.keys(next.region) as TripRegion[]) {
    if (previous.region[region] !== next.region[region]) return next;
  }
  return previous;
}
