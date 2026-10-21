import clsx from "clsx";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  COINS,
  coinPlacement,
  type DieShot,
  dieSizeMm,
  fitView,
  formatLength,
  levelFor,
  mmPerPixel,
  PENTIUM_II_DIXON,
  type Rect,
  scaleBar,
  type View,
  visibleTiles,
  worldBounds,
} from "src/lib/computer/dieShots";
import { nextImageUrl } from "src/lib/mapToImageProps";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine, MiniButton } from "./CodebookParts";
import own from "./DieZoom.module.css";

// Stop where a 50 µm scale bar spans 100 CSS pixels, before detail gets rough.
const MIN_MICRONS_PER_SCREEN_PIXEL = 0.5;
const ANIMATION_MS = 750;

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
  const { soundEnabled, toggleSound, playButton } = usePanelSound();
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
  const reducedMotion = useRef(false);

  const coin = COINS.find((item) => item.id === coinId) ?? COINS[0];
  const bounds = useMemo(() => worldBounds(shot, coin), [shot, coin]);
  const perPixel = mmPerPixel(shot);
  const die = dieSizeMm(shot);
  const maxScale = (perPixel * 1000) / MIN_MICRONS_PER_SCREEN_PIXEL;

  const fitScale = size ? fitView(bounds, size).scale : 0;
  const minScale = fitScale * 0.6;

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
    if (size && !viewRef.current) setView(fitView(bounds, size));
  }, [bounds, setView, size]);

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
    pointers.current.set(event.pointerId, local(event));
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    const current = viewRef.current;
    if (!previous || !current || !size) return;
    const point = local(event);
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
  }

  function keyZoom(factor: number) {
    if (!size) return;
    zoomAbout(size.width / 2, size.height / 2, factor, true);
    playButton();
  }

  function goTo(rect: Rect, id: string | null, margin = 0.12) {
    if (!size) return;
    setSpotId(id);
    animateTo(fitView(rect, size, margin));
    playButton();
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
  const detailSpots = spot
    ? shot.spots.filter((item) => item.parentId === (spot.parentId ?? spot.id))
    : [];
  const detailGroup = shot.spots.find((item) => item.id === (spot?.parentId ?? spot?.id));
  const closeUps = detailSpots.filter((item) => !item.candidate);
  const candidates = detailSpots.filter((item) => item.candidate);
  const outlinedSpots = shot.spots
    .filter((item) => (spot ? detailSpots.includes(item) && item.id !== spot.id : !item.parentId))
    // Smaller regions stay clickable where approximate block boxes overlap.
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
  const spotCorner = spot ? toScreen(spot.rect.x, spot.rect.y) : null;

  function spotLabel(rect: Rect, label: string) {
    if (!view || !size) return null;
    const corner = toScreen(rect.x, rect.y);
    const right = Math.min(size.width, corner.x + rect.width * view.scale);
    const bottom = Math.min(size.height, corner.y + rect.height * view.scale);
    const left = Math.max(0, corner.x);
    const top = Math.max(0, corner.y);
    if (right - left <= 44 || bottom - top <= 30) return null;
    return (
      <span
        className={own.spotLabel}
        style={{ left: left - corner.x + 3, top: top - corner.y + 3, maxWidth: right - left - 8 }}
      >
        {label}
      </span>
    );
  }

  const micronsPerScreenPixel = view ? (perPixel * 1000) / view.scale : 1;
  const bar = scaleBar(micronsPerScreenPixel);
  // How much closer than the first view, where the whole die and the coin fit.
  const magnification = view && fitScale ? view.scale / fitScale : 1;
  const screenWidthMm = view && size ? (size.width / view.scale) * perPixel : 0;

  return (
    <DemoMachine
      title="ZOOM INTO A CHIP"
      label={`A ${shot.chip.toLowerCase()} die next to a coin, zoomable`}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
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
            onPointerCancel={onPointerUp}
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
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={clsx(own.spotTarget, item.candidate && own.candidateSpot)}
                    aria-label={`Zoom to ${item.candidate ? "candidate " : ""}${item.label.toLowerCase()}`}
                    style={{ left: corner.x, top: corner.y, width, height }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      goTo(item.rect, item.id);
                    }}
                  >
                    {spotLabel(item.rect, item.mapLabel ?? item.label)}
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
                {spotLabel(spot.rect, `${spot.candidate ? "CANDIDATE · " : ""}${spot.label}`)}
              </div>
            )}
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
          </div>
          <div className={own.keys}>
            <MiniButton label="Zoom out" onClick={() => keyZoom(0.5)}>
              −
            </MiniButton>
            <MiniButton
              label="Zoom in"
              onClick={() => keyZoom(2)}
              disabled={!!view && view.scale >= maxScale}
            >
              +
            </MiniButton>
            <MiniButton onClick={() => goTo(bounds, null, 0.08)}>ALL</MiniButton>
            <MiniButton
              onClick={() =>
                goTo({ x: 0, y: 0, width: shot.width, height: shot.height }, null, 0.04)
              }
            >
              DIE
            </MiniButton>
            <span className={own.keyGap} aria-hidden="true" />
            {shot.spots
              .filter((item) => !item.parentId)
              .map((item) => (
                <MiniButton key={item.id} onClick={() => goTo(item.rect, item.id)}>
                  {item.label}
                </MiniButton>
              ))}
            <MiniButton
              onClick={() =>
                goTo(
                  { x: placed.x, y: placed.y, width: placed.diameter, height: placed.diameter },
                  null,
                )
              }
            >
              COIN
            </MiniButton>
          </div>
          {closeUps.length > 0 && (
            <div
              className={own.detailKeys}
              role="group"
              aria-label={
                detailGroup?.id === "decoders"
                  ? "Decoder close-ups"
                  : `${detailGroup?.label.toLowerCase()} close-ups`
              }
            >
              <span>CLOSER:</span>
              {closeUps.map((item) => (
                <MiniButton key={item.id} onClick={() => goTo(item.rect, item.id)}>
                  {item.label}
                </MiniButton>
              ))}
            </div>
          )}
          {candidates.length > 0 && (
            <div className={own.detailKeys} role="group" aria-label="Unconfirmed candidates">
              <span>CANDIDATES · UNCONFIRMED:</span>
              {candidates.map((item) => (
                <MiniButton key={item.id} onClick={() => goTo(item.rect, item.id)}>
                  {item.label}
                </MiniButton>
              ))}
            </div>
          )}
          <div className={clsx(panel.screen, styles.lcd, own.lcd)} aria-live="polite">
            <div className={panel.screenTop}>
              <span>
                {spot ? `${spot.candidate ? "CANDIDATE · " : ""}${spot.label}` : "THE WHOLE DIE"}
              </span>
              <span>SCREEN WIDTH {formatLength(screenWidthMm)}</span>
            </div>
            <p className={own.lcdText}>
              {spot
                ? spot.text
                : `The die is about ${formatLength(die.width)} × ${formatLength(die.height)}. The ${coin.name} beside it is shown at the same scale: ${coin.diameterMm} mm across.`}
            </p>
            <div className={own.lcdFacts}>
              <span>1 SCREEN PIXEL ≈ {formatLength(micronsPerScreenPixel / 1000)}</span>
              <span>1 PHOTO PIXEL ≈ {formatLength(perPixel)}</span>
            </div>
          </div>
          {spot?.matchedSource && (
            <p className={own.credit}>
              Region matched to the{" "}
              <a href={spot.matchedSource.url} target="_blank" rel="noreferrer">
                {spot.matchedSource.label}
              </a>
              {spot.candidate
                ? ". Candidate identification; function and location unconfirmed."
                : ". Outline approximate."}
            </p>
          )}
          <p className={own.note}>
            At full zoom one photo pixel is about {formatLength(perPixel)}. The transistors on this
            chip are 0.25 µm, smaller than one pixel.
          </p>
          <p className={own.credit}>
            Photo:{" "}
            <a href={shot.credit.url} target="_blank" rel="noreferrer">
              {shot.credit.author}, {shot.credit.license.toLowerCase()}, via {shot.credit.source}
            </a>
            .
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}
