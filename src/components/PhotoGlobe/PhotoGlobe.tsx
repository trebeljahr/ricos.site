import { Canvas } from "@react-three/fiber";
import clsx from "clsx";
import { useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { TripLocation } from "src/lib/photoGeo";
import { Globe } from "./Globe";
import { GlobeControls } from "./GlobeControls";
import { DEFAULT_CAMERA_DISTANCE } from "./geo";
import { Markers } from "./Markers";
import { LEGEND_REGIONS, REGION_CSS_VARIABLES, useGlobePalette } from "./palette";
import { useInViewport } from "./useGlobeInteraction";

/**
 * Framed over the Caribbean at 17°N, which is where most of the EXIF data sits, so the
 * first frame already shows real point clouds rather than empty ocean.
 */
const CAMERA_POSITION: [number, number, number] = [
  0.35 * DEFAULT_CAMERA_DISTANCE,
  0.3 * DEFAULT_CAMERA_DISTANCE,
  0.88 * DEFAULT_CAMERA_DISTANCE,
];

export type PhotoGlobeProps = {
  /** Every trip from `photo-locations.json`, including the `best-of` collection. */
  trips: TripLocation[];
  /** Folder name of the highlighted trip, or `null`. */
  selected?: string | null;
  /** Fires with a folder name on click, and with `null` when the globe is cleared. */
  onSelectTrip?: (tripName: string | null) => void;
  /** Sizing and placement. The component fills whatever box this gives it. */
  className?: string;
  /**
   * The built-in keyboard strip of trip chips. On by default so the globe is operable on
   * its own; set false on a page that already renders its own list of trips, otherwise a
   * keyboard user tabs through every trip twice.
   */
  showTripList?: boolean;
};

function describeTrip(trip: TripLocation): string {
  const photos = `${trip.photoCount} photo${trip.photoCount === 1 ? "" : "s"}`;
  const gps = trip.points.length > 0 ? `, ${trip.gpsCount} with GPS` : ", position set by hand";
  return `${photos}${gps}`;
}

/**
 * A hand-written three.js globe of every photography trip. No mapping library: the land is
 * triangulated from Natural Earth outlines at mount and drawn as one mesh, the trips are
 * one pin each, and the EXIF positions are one `Points` object per folder.
 *
 * The page owns the `next/dynamic` wrapper — nothing here touches `window` at import time,
 * but three.js has no business in the eager bundle of a text page.
 */
export function PhotoGlobe({
  trips,
  selected = null,
  onSelectTrip,
  className,
  showTripList = true,
}: PhotoGlobeProps) {
  const container = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);

  const palette = useGlobePalette();
  const reduceMotion = useReducedMotion() ?? false;
  const visible = useInViewport(container);

  const [pointerHover, setPointerHover] = useState<string | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState<string | null>(null);

  /** `best-of` duplicates the other folders, so it is never a place you can pick. */
  const placeTrips = useMemo(() => trips.filter((trip) => trip.kind !== "collection"), [trips]);
  const collection = useMemo(() => trips.find((trip) => trip.kind === "collection"), [trips]);

  const active = pointerHover ?? keyboardFocus ?? selected;
  const activeTrip = useMemo(
    () => placeTrips.find((trip) => trip.name === active) ?? null,
    [active, placeTrips],
  );

  // Pointer hover only shows a label; keyboard focus and selection turn the globe.
  const focusName = keyboardFocus ?? selected;
  const focus = useMemo(() => {
    const trip = placeTrips.find((candidate) => candidate.name === focusName);
    return trip ? { lat: trip.lat, lng: trip.lng } : null;
  }, [focusName, placeTrips]);

  const handleSelect = useCallback(
    (tripName: string) => onSelectTrip?.(tripName === selected ? null : tripName),
    [onSelectTrip, selected],
  );

  const summary = `Interactive globe with ${placeTrips.length} photography trips. Drag to turn it, scroll to zoom, and pick a trip from the list below the globe.`;

  return (
    <div
      ref={container}
      className={clsx("relative isolate min-h-80 w-full overflow-hidden", className)}
    >
      <div className="absolute inset-0" role="img" aria-label={summary}>
        <Canvas
          camera={{ position: CAMERA_POSITION, fov: 38, near: 0.1, far: 40 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          // Nothing renders while the globe is scrolled out of the viewport.
          frameloop={visible ? "always" : "never"}
          onPointerMissed={() => onSelectTrip?.(null)}
        >
          <Globe palette={palette} />
          <Markers
            trips={trips}
            palette={palette}
            active={active}
            selected={selected}
            onHover={setPointerHover}
            onSelect={handleSelect}
            labelRef={label}
          />
          <GlobeControls
            autoRotate={!reduceMotion && active === null}
            damping={!reduceMotion}
            focus={focus}
            instantFocus={reduceMotion}
          />
        </Canvas>
      </div>

      {/* Moved by Markers each frame; the inner box does the centring. */}
      <div
        ref={label}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 z-20 opacity-0 transition-opacity duration-150"
      >
        {activeTrip && (
          <div className="-translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg border border-black/10 bg-white/95 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg dark:border-white/15 dark:bg-nightBlue/95">
            <span className="flex items-center gap-1.5 font-semibold">
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${REGION_CSS_VARIABLES[activeTrip.region]})` }}
              />
              {activeTrip.label}
            </span>
            <span className="text-black/60 dark:text-white/60">{describeTrip(activeTrip)}</span>
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[60%] flex-col gap-1 text-[11px] leading-tight text-black/70 dark:text-white/70"
      >
        <ul className="flex flex-wrap gap-x-2.5 gap-y-1">
          {LEGEND_REGIONS.map((region) => (
            <li key={region} className="flex items-center gap-1">
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${REGION_CSS_VARIABLES[region]})` }}
              />
              {region}
            </li>
          ))}
        </ul>
        {collection && (
          <p className="text-black/45 dark:text-white/45">
            {collection.label} spans every trip, so it has no pin — its {collection.points.length}{" "}
            located photos are the faint grey dots.
          </p>
        )}
      </div>

      {/*
        The keyboard path into the scene. The list is hidden until something inside it
        takes focus, then it becomes a visible strip of chips, so a sighted keyboard user
        can see where they are instead of watching the globe turn on its own.

        A page that renders its own trip buttons turns this off and keeps only the read-only
        summary below, so the trips are still described but not tabbed through twice.
      */}
      {!showTripList && (
        <ul className="sr-only" aria-label="Photography trips on the globe">
          {placeTrips.map((trip) => (
            <li key={trip.name}>
              {trip.label} — {trip.region}, {describeTrip(trip)}
            </li>
          ))}
        </ul>
      )}

      {showTripList && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <ul
            aria-label="Photography trips on the globe"
            className="pointer-events-auto sr-only focus-within:not-sr-only focus-within:flex focus-within:flex-wrap focus-within:gap-1.5 focus-within:border-black/10 focus-within:border-t focus-within:bg-white/95 focus-within:p-2 dark:focus-within:border-white/15 dark:focus-within:bg-nightBlue/95"
          >
            {placeTrips.map((trip) => (
              <li key={trip.name}>
                <button
                  type="button"
                  aria-pressed={selected === trip.name}
                  onFocus={() => setKeyboardFocus(trip.name)}
                  onBlur={() => setKeyboardFocus(null)}
                  onClick={() => handleSelect(trip.name)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
                    selected === trip.name
                      ? "border-accent text-accent"
                      : "border-black/15 dark:border-white/20",
                  )}
                >
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(${REGION_CSS_VARIABLES[trip.region]})` }}
                  />
                  {trip.label}
                  <span className="sr-only">
                    {" — "}
                    {trip.region}, {describeTrip(trip)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
