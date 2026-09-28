import { Sprite } from "@components/Sprite";
import Link from "next/link";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { EASTER_EGG_IDS, EASTER_EGGS_CHANGED_EVENT, getFoundEggs } from "src/lib/easterEggs";
import { EASTER_EGG_SPRITES } from "src/lib/sprites";
import { EmojiButton } from "./EmojiButton";

const known = new Set<string>(EASTER_EGG_IDS);
// The bunny crosses at a set speed, so a wide screen does not make it rush.
// Narrow screens still get at least the minimum time on screen.
const HOP_PX_PER_S = 220;
const HOP_ACROSS_MIN_MS = 5000;
const HOP_MS = 480;
const BUNNY_PX = 30;
// An egg laid on a click: its size, and how long it stays before it is gone.
const LAID_PX = 22;
const LAID_SHOWS_MS = 3000;
// Spam clicks lay at most one egg per gap, and only so many can be out at once.
// The gap is jittered around LAY_GAP_MS, so clicking flat out does not lay
// eggs like a metronome.
const LAY_GAP_MS = 60;
const MAX_LAID = 48;

/** A random value between `min` and `max`. */
const between = (min: number, max: number) => min + Math.random() * (max - min);

type Laid = {
  id: number;
  x: number;
  /** How high the bunny was when it laid the egg, so the egg falls from there. */
  lift: number;
  sprite: (typeof EASTER_EGG_SPRITES)[number];
  tilt: number;
  size: number;
  /** How far above the ground line it lands, so the eggs do not sit in one row. */
  rise: number;
};

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

/** An egg laid on a click: it drops from the bunny, bounces once, sits, and fades. */
const LaidEgg = ({
  egg,
  calm,
  onDone,
}: {
  egg: Laid;
  calm: boolean;
  onDone: (id: number) => void;
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rest = `rotate(${egg.tilt}deg)`;
    const shown = ref.current?.animate(
      calm
        ? [
            { opacity: 0 },
            { opacity: 1, offset: 0.05 },
            { opacity: 1, offset: 0.85 },
            { opacity: 0 },
          ]
        : [
            // Shown from the first frame: a fade-in would let the bunny hop
            // on before the egg shows, so it would seem to appear behind it.
            { opacity: 1, transform: `translateY(${-egg.lift + egg.rise}px) scale(0.6)` },
            {
              opacity: 1,
              transform: `translateY(${(-egg.lift + egg.rise) / 2}px) scale(0.9)`,
              offset: 0.05,
            },
            { opacity: 1, transform: `translateY(0) ${rest} scale(1.15, 0.85)`, offset: 0.1 },
            { opacity: 1, transform: `translateY(-5px) ${rest} scale(1)`, offset: 0.15 },
            { opacity: 1, transform: `translateY(0) ${rest} scale(1)`, offset: 0.2 },
            { opacity: 1, transform: `translateY(0) ${rest} scale(1)`, offset: 0.85 },
            { opacity: 0, transform: `translateY(4px) ${rest} scale(1)` },
          ],
      { duration: LAID_SHOWS_MS, easing: "ease-out", fill: "both" },
    );
    shown?.finished.then(() => onDone(egg.id)).catch(() => undefined);
    return () => shown?.cancel();
  }, [egg, calm, onDone]);

  return (
    // Flex, so the sprite sits on the span's bottom edge instead of a text baseline.
    <span
      ref={ref}
      className="absolute flex opacity-0"
      style={{ left: egg.x - egg.size / 2, bottom: egg.rise, fontSize: egg.size }}
    >
      <Sprite name={egg.sprite} />
    </span>
  );
};

/** Where the bunny was when it laid an egg. */
type Spot = Pick<Laid, "x" | "lift">;

/**
 * The Easter bunny hops along the bottom of the screen once. Every click on
 * the footer egg while it hops makes it lay a painted egg, through `layRef`.
 */
const Bunny = ({
  calm,
  onCrossed,
  onLay,
  layRef,
}: {
  calm: boolean;
  onCrossed: () => void;
  onLay: (spot: Spot) => void;
  layRef: RefObject<() => void>;
}) => {
  const outer = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const lastLay = useRef(0);
  const gap = useRef(LAY_GAP_MS);
  const onCrossedRef = useRef(onCrossed);
  onCrossedRef.current = onCrossed;

  layRef.current = () => {
    const now = performance.now();
    if (now - lastLay.current < gap.current || !outer.current || !inner.current) return;
    const bunny = outer.current.getBoundingClientRect();
    // Right under the bunny, give or take a few pixels, so it drops out of it.
    const x = bunny.left + bunny.width / 2 + between(-3, 3);
    if (x < 0 || x > window.innerWidth) return;
    lastLay.current = now;
    gap.current = LAY_GAP_MS * between(0.5, 1.8);
    const ground = outer.current.parentElement?.getBoundingClientRect().bottom ?? 0;
    onLay({ x, lift: Math.max(0, ground - inner.current.getBoundingClientRect().bottom) });
    if (!calm) {
      body.current?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.12, 0.84)" }, { transform: "scale(1)" }],
        { duration: 220, easing: "ease-out" },
      );
    }
  };

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const from = -BUNNY_PX - 18;
    // Its left edge on the screen's right edge: the moment it is out of sight,
    // so the next click can send a new bunny straight away.
    const to = window.innerWidth;
    const acrossMs = Math.max(HOP_ACROSS_MIN_MS, ((to - from) / HOP_PX_PER_S) * 1000);
    const duration = calm ? acrossMs * 1.6 : acrossMs;
    const across = el.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration, easing: "linear", fill: "forwards" },
    );
    const hops = calm
      ? null
      : inner.current?.animate(
          [
            { translate: "0 0", scale: "-1 1", easing: "ease-out" },
            { translate: "0 -1.6rem", scale: "-1 1.05", easing: "ease-in" },
            { translate: "0 0", scale: "-1 0.9" },
          ],
          { duration: HOP_MS, iterations: Number.POSITIVE_INFINITY },
        );

    across.finished.then(() => onCrossedRef.current()).catch(() => undefined);
    return () => {
      across.cancel();
      hops?.cancel();
    };
  }, [calm]);

  return (
    // Flex all the way down, so the feet sit on the screen's bottom edge
    // instead of a text baseline a few pixels above it.
    <span ref={outer} className="absolute bottom-0 left-0 flex">
      {/* Squashes when it lays, apart from the hop, which owns the inner span's scale. */}
      <span ref={body} className="flex origin-bottom">
        {/* The rabbit faces left; mirror it so it hops forward. The landing
            squash pivots on the feet, so they stay on the ground. */}
        <span
          ref={inner}
          className="flex origin-bottom"
          style={{ fontSize: BUNNY_PX, scale: "-1 1" }}
        >
          <Sprite name="🐇" />
        </span>
      </span>
    </span>
  );
};

/**
 * The strip along the bottom of the screen: the bunny while it hops, and the
 * eggs it laid. The eggs outlive the bunny, so a new one can set off while the
 * last one's eggs still fade. Empty once neither is left.
 */
const Meadow = ({
  hopping,
  onCrossed,
  onEmpty,
  layRef,
}: {
  hopping: boolean;
  onCrossed: () => void;
  onEmpty: () => void;
  layRef: RefObject<() => void>;
}) => {
  const nextLaid = useRef(0);
  const onEmptyRef = useRef(onEmpty);
  onEmptyRef.current = onEmpty;
  const [calm] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [laid, setLaid] = useState<Laid[]>([]);

  const lay = useCallback(
    (spot: Spot) =>
      setLaid((current) =>
        current.length >= MAX_LAID
          ? current
          : [
              ...current,
              {
                ...spot,
                id: nextLaid.current++,
                sprite: pick(EASTER_EGG_SPRITES),
                tilt: between(-15, 15),
                size: LAID_PX * between(0.85, 1.15),
                rise: between(0, 6),
              },
            ],
      ),
    [],
  );
  const dropLaid = useCallback(
    (id: number) => setLaid((current) => current.filter((egg) => egg.id !== id)),
    [],
  );

  useEffect(() => {
    if (!hopping && laid.length === 0) onEmptyRef.current();
  }, [hopping, laid.length]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-20 overflow-hidden"
    >
      {laid.map((egg) => (
        <LaidEgg key={egg.id} egg={egg} calm={calm} onDone={dropLaid} />
      ))}
      {hopping && <Bunny calm={calm} onCrossed={onCrossed} onLay={lay} layRef={layRef} />}
    </div>
  );
};

/** "N/total easter eggs found", once at least one is found. Reads storage after mount, so SSR renders nothing. */
export const EggCounter = () => {
  const recordFind = useRecordEggFind();
  const [found, setFound] = useState(0);
  const [hopping, setHopping] = useState(false);
  const [meadow, setMeadow] = useState(false);
  const lay = useRef<() => void>(() => undefined);

  useEffect(() => {
    const update = () => setFound(getFoundEggs().filter((id) => known.has(id)).length);
    update();
    window.addEventListener(EASTER_EGGS_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EASTER_EGGS_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (found === 0) return null;
  return (
    <span>
      <Link href="/easter-eggs" className="hover:text-accent">
        {found}/{EASTER_EGG_IDS.length} easter eggs found
      </Link>{" "}
      {/* One bunny at a time: clicks while it is out make it lay an egg. Once
          it is off the screen, the next click sends a new one. */}
      <EmojiButton
        label="Easter egg"
        onClick={() => {
          if (hopping) {
            lay.current();
            return;
          }
          recordFind("easter-bunny");
          setHopping(true);
          setMeadow(true);
        }}
      >
        {/* A size up from the footer text, so the paint on the shell reads. */}
        <Sprite name="easter-egg-green-blue" className="text-lg" />
      </EmojiButton>
      {meadow &&
        createPortal(
          <Meadow
            hopping={hopping}
            onCrossed={() => setHopping(false)}
            onEmpty={() => setMeadow(false)}
            layRef={lay}
          />,
          document.body,
        )}
    </span>
  );
};
