import clsx from "clsx";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COINS,
  coinPlacement,
  type DieShot,
  type DieSpot,
  dieSizeMm,
  fitView,
  formatLength,
  insetOutline,
  LABEL_HEIGHT_PIXELS,
  labelWidth,
  levelFor,
  mmPerPixel,
  openingView,
  PENTIUM_II_DIXON,
  type Rect,
  scaleBar,
  spotContains,
  type View,
  visibleTiles,
  worldBounds,
} from "src/lib/computer/dieShots";
import { nextImageUrl } from "src/lib/mapToImageProps";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import own from "./DieZoom.module.css";

// Stop where a 50 µm scale bar spans 100 CSS pixels, before detail gets rough.
const MIN_MICRONS_PER_SCREEN_PIXEL = 0.5;
const ANIMATION_MS = 750;
// A press that moves further than this is a drag, not a tap.
const TAP_SLOP_PIXELS = 5;
// Each outline is drawn this far inside its region, so neighbours never stack.
const OUTLINE_INSET_PIXELS = 1.5;

type Size = { width: number; height: number };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The view between `from` and `to` at `t`, zooming about the one point both share. */
function between(from: View, to: View, t: number): View {
  const scale = from.scale * (to.scale / from.scale) ** t;
  if (Math.abs(to.scale - from.scale) < 1e-9 * to.scale) {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, scale };
  }
  const fixedX = (to.x * to.scale - from.x * from.scale) / (to.scale - from.scale);
  const fixedY = (to.y * to.scale - from.y * from.scale) / (to.scale - from.scale);
  return {
    x: fixedX - ((fixedX - from.x) * from.scale) / scale,
    y: fixedY - ((fixedY - from.y) * from.scale) / scale,
    scale,
  };
}

/**
 * A real chip, zoomable from a coin beside it down to single wires: the
 * Pentium II die at 22,036 × 13,288 pixels, cut into tiles, with a coin photo
 * to scale. Usable in MDX articles.
 */
export function DieZoom({
  shot = PENTIUM_II_DIXON,
  coin: initialCoin = "nickel",
}: {
  shot?: DieShot;
  /** Which coin sits next to the die: "nickel", "euro" or "aud". */
  coin?: string;
}) {
  const screen = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [view, setViewState] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  const [coinId, setCoinId] = useState(initialCoin);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);
  const engagedRef = useRef(false);
  const [hint, setHint] = useState("DRAG TO MOVE · PINCH, SCROLL OR + TO ZOOM");
  const [pixelRatio, setPixelRatio] = useState(1);
  const animation = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // Where the current press began, until it turns into a drag or a pinch.
  const press = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useRef(false);

  const coin = COINS.find((item) => item.id === coinId) ?? COINS[0];
  const bounds = useMemo(() => worldBounds(shot, coin), [shot, coin]);
  const perPixel = mmPerPixel(shot);
  const die = dieSizeMm(shot);
  const maxScale = (perPixel * 1000) / MIN_MICRONS_PER_SCREEN_PIXEL;

  const opening = useMemo(() => (size ? openingView(shot, size) : null), [shot, size]);
  const minScale = size ? fitView(bounds, size).scale * 0.6 : 0;

  const clamp = useCallback(
    (next: View): View => {
      const scale = Math.min(maxScale, Math.max(minScale, next.scale));
      return {
        scale,
        x: Math.min(bounds.x + bounds.width, Math.max(bounds.x, next.x)),
        y: Math.min(bounds.y + bounds.height, Math.max(bounds.y, next.y)),
      };
    },
    [bounds, maxScale, minScale],
  );

  const setView = useCallback(
    (next: View) => {
      const clamped = clamp(next);
      viewRef.current = clamped;
      setViewState(clamped);
    },
    [clamp],
  );

  const stopAnimation = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }, []);

  const animateTo = useCallback(
    (target: View) => {
      stopAnimation();
      const from = viewRef.current;
      const to = clamp(target);
      if (!from || reducedMotion.current) {
        setView(to);
        return;
      }
      const start = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / ANIMATION_MS);
        setView(between(from, to, ease(t)));
        animation.current = t < 1 ? requestAnimationFrame(frame) : null;
      };
      animation.current = requestAnimationFrame(frame);
    },
    [clamp, setView, stopAnimation],
  );

  /** Zoom by `factor` about a point on screen, which stays where it is. */
  const zoomAbout = useCallback(
    (screenX: number, screenY: number, factor: number, animate = false) => {
      const current = viewRef.current;
      if (!current || !size) return;
      const scale = Math.min(maxScale, Math.max(minScale, current.scale * factor));
      const worldX = current.x + (screenX - size.width / 2) / current.scale;
      const worldY = current.y + (screenY - size.height / 2) / current.scale;
      const next = {
        scale,
        x: worldX - (screenX - size.width / 2) / scale,
        y: worldY - (screenY - size.height / 2) / scale,
      };
      if (animate) animateTo(next);
      else setView(next);
    },
    [animateTo, maxScale, minScale, setView, size],
  );

  // Size of the screen, and the first view once it is known.
  useEffect(() => {
    reducedMotion.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setPixelRatio(window.devicePixelRatio || 1);
    const element = screen.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width, height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (opening && !viewRef.current) setView(opening);
  }, [opening, setView]);

  useEffect(() => stopAnimation, [stopAnimation]);

  // Scrolling zooms only once the reader has pressed the photo, so the page
  // still scrolls past it. A trackpad pinch (ctrl + wheel) always zooms.
  useEffect(() => {
    const element = screen.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!engagedRef.current && !event.ctrlKey) {
        setHint("PRESS THE PHOTO, THEN SCROLL TO ZOOM");
        return;
      }
      event.preventDefault();
      stopAnimation();
      const box = element.getBoundingClientRect();
      const speed = event.ctrlKey ? 0.01 : 0.0018;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAbout(event.clientX - box.left, event.clientY - box.top, Math.exp(-delta * speed));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [stopAnimation, zoomAbout]);

  // Pressing anywhere else on the page lets the wheel scroll the page again.
  useEffect(() => {
    if (!engaged) return;
    const release = (event: PointerEvent) => {
      if (!screen.current?.contains(event.target as Node)) {
        engagedRef.current = false;
        setEngaged(false);
      }
    };
    document.addEventListener("pointerdown", release);
    return () => document.removeEventListener("pointerdown", release);
  }, [engaged]);

  function engage() {
    engagedRef.current = true;
    setEngaged(true);
    setHint("");
  }

  function local(event: { clientX: number; clientY: number }) {
    const box = screen.current?.getBoundingClientRect();
    return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    stopAnimation();
    engage();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = local(event);
    // A second finger makes this a pinch, not a tap.
    press.current = pointers.current.size === 0 ? point : null;
    pointers.current.set(event.pointerId, point);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    const current = viewRef.current;
    if (!previous || !current || !size) return;
    const point = local(event);
    if (
      press.current &&
      Math.hypot(point.x - press.current.x, point.y - press.current.y) > TAP_SLOP_PIXELS
    ) {
      press.current = null;
    }
    if (pointers.current.size === 1) {
      setView({
        ...current,
        x: current.x - (point.x - previous.x) / current.scale,
        y: current.y - (point.y - previous.y) / current.scale,
      });
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(point.x - other.x, point.y - other.y);
        if (before > 0) zoomAbout((point.x + other.x) / 2, (point.y + other.y) / 2, after / before);
      }
    }
    pointers.current.set(event.pointerId, point);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (press.current) deselectOutside(local(event));
    press.current = null;
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    press.current = null;
  }

  /** A tap outside the selected block clears it and leaves the view where it is. */
  function deselectOutside(point: { x: number; y: number }) {
    const current = viewRef.current;
    const selected = shot.spots.find((item) => item.id === spotId);
    if (!current || !size || !selected) return;
    const worldX = current.x + (point.x - size.width / 2) / current.scale;
    const worldY = current.y + (point.y - size.height / 2) / current.scale;
    if (spotContains(selected, worldX, worldY)) return;
    setSpotId(null);
  }

  function keyZoom(factor: number) {
    if (!size) return;
    zoomAbout(size.width / 2, size.height / 2, factor, true);
  }

  function goTo(rect: Rect, id: string | null, margin = 0.12) {
    if (!size) return;
    setSpotId(id);
    animateTo(fitView(rect, size, margin));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = viewRef.current;
    if (!current || !size) return;
    const step = 80 / current.scale;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key === "+" || event.key === "=") keyZoom(2);
    else if (event.key === "-" || event.key === "_") keyZoom(0.5);
    else if (event.key === "0") goTo(bounds, null, 0.08);
    else if (moves[event.key]) {
      setView({
        ...current,
        x: current.x + moves[event.key][0],
        y: current.y + moves[event.key][1],
      });
    } else return;
    event.preventDefault();
  }

  const placed = coinPlacement(shot, coin);
  const level = view ? levelFor(shot, view.scale, pixelRatio) : 0;
  const coarse = Math.max(0, level - 2);
  const tiles =
    view && size
      ? [
          ...(coarse < level ? visibleTiles(shot, coarse, view, size) : []),
          ...visibleTiles(shot, level, view, size),
        ]
      : [];
  const toScreen = (x: number, y: number) =>
    view && size
      ? {
          x: size.width / 2 + (x - view.x) * view.scale,
          y: size.height / 2 + (y - view.y) * view.scale,
        }
      : { x: 0, y: 0 };
  const dieCorner = toScreen(0, 0);
  // Rounded like the tiles in visibleTiles, so the two line up exactly.
  const clip =
    view && size
      ? {
          left: Math.round(dieCorner.x),
          top: Math.round(dieCorner.y),
          width: Math.round(dieCorner.x + shot.width * view.scale) - Math.round(dieCorner.x),
          height: Math.round(dieCorner.y + shot.height * view.scale) - Math.round(dieCorner.y),
        }
      : null;
  const coinCorner = toScreen(placed.x, placed.y);
  const coinSize = view ? placed.diameter * view.scale : 0;
  const spot = shot.spots.find((item) => item.id === spotId) ?? null;
  // Every region stays on the map; the selected one's close-ups join them.
  const openParent = spot?.parentId ?? spot?.id;
  const outlinedSpots = shot.spots
    .filter((item) => item.id !== spot?.id && (!item.parentId || item.parentId === openParent))
    // Smaller regions stay clickable inside larger ones.
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
  const spotCorner = spot ? toScreen(spot.rect.x, spot.rect.y) : null;

  /** The part of a photo rectangle that is on screen, in screen pixels. */
  function visiblePart(rect: Rect) {
    if (!view || !size) return null;
    const corner = toScreen(rect.x, rect.y);
    return {
      left: Math.max(0, corner.x),
      top: Math.max(0, corner.y),
      right: Math.min(size.width, corner.x + rect.width * view.scale),
      bottom: Math.min(size.height, corner.y + rect.height * view.scale),
    };
  }

  /**
   * A name goes inside the top-left of the part of its box on screen, or just
   * outside when it does not fit.
   */
  function spotLabel(item: DieSpot, label: string, always: boolean) {
    if (!size || !view) return null;
    const preferred = visiblePart(item.labelRect ?? item.rect);
    const whole = visiblePart(item.rect);
    if (!preferred || !whole) return null;
    if (whole.right <= whole.left || whole.bottom <= whole.top) return null;
    const part =
      preferred.right > preferred.left && preferred.bottom > preferred.top ? preferred : whole;
    const { left, top, right, bottom } = part;
    const width = labelWidth(label);
    const fitsInside = right - left >= width + 6 && bottom - top >= LABEL_HEIGHT_PIXELS + 6;
    let labelLeft = left + 3;
    let labelTop = top + 3;
    if (!fitsInside && always) {
      labelLeft = Math.max(3, Math.min(size.width - width - 3, left));
      const above = top - LABEL_HEIGHT_PIXELS - 3;
      const below = bottom + 3;
      if (above >= 3) labelTop = above;
      else if (below + LABEL_HEIGHT_PIXELS <= size.height - 3) labelTop = below;
    }
    return (
      <span
        key={`label-${item.id}`}
        className={clsx(own.spotLabel, item.candidate && own.candidateLabel)}
        style={{ left: labelLeft, top: labelTop, maxWidth: size.width - 6 }}
      >
        {label}
      </span>
    );
  }

  /** A region's drawn outline in screen pixels, measured from the corner of its bounding box. */
  function shapeOf(item: DieSpot) {
    if (!view) return [];
    const { x, y, width, height } = item.rect;
    const corners: readonly (readonly [number, number])[] = item.outline ?? [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ];
    return insetOutline(
      corners.map(
        ([cornerX, cornerY]) => [(cornerX - x) * view.scale, (cornerY - y) * view.scale] as const,
      ),
      OUTLINE_INSET_PIXELS,
    );
  }

  const spotShape = spot ? shapeOf(spot) : null;
  const micronsPerScreenPixel = view ? (perPixel * 1000) / view.scale : 1;
  const bar = scaleBar(micronsPerScreenPixel);
  // How much closer than the first view.
  const magnification = view && opening ? view.scale / opening.scale : 1;

  return (
    <DemoMachine
      title="ZOOM INTO A CHIP"
      label={`A ${shot.chip.toLowerCase()} die next to a coin, zoomable`}
      className={own.demo}
    >
      <div className={own.body}>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, own.head)}>
            <span>
              {shot.chip} · {shot.detail}
            </span>
            <div className={styles.segmented} role="group" aria-label="Coin beside the die">
              {COINS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === coin.id}
                  onClick={() => {
                    setCoinId(item.id);
                    // Show the die and the new coin side by side.
                    goTo(worldBounds(shot, item), null, 0.08);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div
            ref={screen}
            className={clsx(own.screen, engaged && own.engaged)}
            role="application"
            aria-roledescription="zoomable photo"
            aria-label={`Photo of the ${shot.chip.toLowerCase()} die, about ${formatLength(die.width)} by ${formatLength(die.height)}, with a ${coin.label.toLowerCase()} to scale. Arrow keys move, plus and minus zoom, 0 shows everything.`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the application region takes arrow and zoom keys
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onDoubleClick={(event) => {
              const point = local(event);
              zoomAbout(point.x, point.y, 2, true);
            }}
            onKeyDown={onKeyDown}
            onFocus={engage}
          >
            {/* The die's own box clips the black padding of the edge tiles. */}
            {clip && (
              <div
                className={own.dieClip}
                style={{ left: clip.left, top: clip.top, width: clip.width, height: clip.height }}
              >
                {tiles.map((tile) => (
                  <img
                    key={tile.key}
                    src={nextImageUrl(
                      `${shot.folder}/${tile.level}/${tile.column}_${tile.row}.jpg`,
                      640,
                    )}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    decoding="async"
                    className={clsx(own.tile, tile.level !== level && own.coarse)}
                    style={{
                      left: tile.left - clip.left,
                      top: tile.top - clip.top,
                      width: tile.width,
                      height: tile.height,
                    }}
                    onLoad={(event) => {
                      event.currentTarget.dataset.loaded = "true";
                    }}
                  />
                ))}
              </div>
            )}
            {view && coinSize > 2 && (
              <div
                className={own.coin}
                style={{ left: coinCorner.x, top: coinCorner.y, width: coinSize, height: coinSize }}
              >
                <img
                  src={coin.image}
                  alt={`Photograph of a ${coin.name}`}
                  draggable={false}
                  width={1024}
                  height={1024}
                />
              </div>
            )}
            {view &&
              outlinedSpots.map((item) => {
                const corner = toScreen(item.rect.x, item.rect.y);
                const width = item.rect.width * view.scale;
                const height = item.rect.height * view.scale;
                const shape = shapeOf(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={clsx(own.spotTarget, item.candidate && own.candidateSpot)}
                    aria-label={`Zoom to ${item.candidate ? "candidate " : ""}${item.label.toLowerCase()}`}
                    style={{
                      left: corner.x,
                      top: corner.y,
                      width,
                      height,
                      // Only the outline takes clicks, so neighbours inside the bounding box still can.
                      clipPath: `polygon(${shape.map(([x, y]) => `${x}px ${y}px`).join(",")})`,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      goTo(item.rect, item.id);
                    }}
                  >
                    <svg className={own.shape} aria-hidden="true">
                      <polygon points={shape.map((point) => point.join(",")).join(" ")} />
                    </svg>
                  </button>
                );
              })}
            {spot && spotCorner && view && (
              <div
                className={clsx(own.spot, spot.candidate && own.candidateSpot)}
                style={{
                  left: spotCorner.x,
                  top: spotCorner.y,
                  width: spot.rect.width * view.scale,
                  height: spot.rect.height * view.scale,
                }}
              >
                {spotShape && (
                  <svg className={own.shape} aria-hidden="true">
                    {/* Dims everything outside the outline, as the box shadow does for a box. */}
                    <path
                      className={own.dim}
                      d={`M-99999 -99999H99999V99999H-99999Z M${spotShape.map((point) => point.join(" ")).join("L")}Z`}
                    />
                    <polygon points={spotShape.map((point) => point.join(",")).join(" ")} />
                  </svg>
                )}
              </div>
            )}
            {/* Their own layer: inside a target, its clip path would cut them off. */}
            {/* Zoomed out past the first view they go together, so no odd few remain. */}
            {view &&
              !(opening && view.scale < opening.scale * 0.999) &&
              outlinedSpots.map((item) =>
                spotLabel(
                  item,
                  item.mapLabel ?? item.label,
                  !!item.parentId || !!item.labelOutside,
                ),
              )}
            {spot && spotLabel(spot, `${spot.candidate ? "CANDIDATE · " : ""}${spot.label}`, true)}
            <div className={own.scaleBar} aria-hidden="true">
              <i style={{ width: bar.pixels }} />
              <span>{bar.label}</span>
            </div>
            <div className={own.zoomTag} aria-hidden="true">
              ×
              {magnification >= 10
                ? Math.round(magnification).toLocaleString("en-US")
                : magnification.toFixed(1)}
            </div>
            {hint && <div className={own.hint}>{hint}</div>}
            <details
              className={own.credits}
              onPointerDown={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <summary>CREDITS</summary>
              <div className={own.creditsPanel}>
                <p>
                  Photo:{" "}
                  <a href={shot.credit.url} target="_blank" rel="noreferrer">
                    {shot.credit.author}, {shot.credit.license.toLowerCase()}, via{" "}
                    {shot.credit.source}
                  </a>
                  .
                </p>
                {spot?.matchedSource && (
                  <p>
                    Region matched to the{" "}
                    <a href={spot.matchedSource.url} target="_blank" rel="noreferrer">
                      {spot.matchedSource.label}
                    </a>
                    {spot.candidate
                      ? ". Candidate identification; function and location unconfirmed."
                      : ". Outline approximate."}
                  </p>
                )}
              </div>
            </details>
          </div>
          <span className="sr-only" aria-live="polite">
            {spot ? `${spot.candidate ? "Candidate: " : ""}${spot.label}` : ""}
          </span>
        </div>
      </div>
    </DemoMachine>
  );
}
