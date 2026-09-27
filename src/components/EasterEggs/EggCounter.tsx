import { Sprite } from "@components/Sprite";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { EASTER_EGG_IDS, EASTER_EGGS_CHANGED_EVENT, getFoundEggs } from "src/lib/easterEggs";
import { EASTER_EGG_SPRITES } from "src/lib/sprites";
import { EmojiButton } from "./EmojiButton";

const known = new Set<string>(EASTER_EGG_IDS);
const HOP_ACROSS_MS = 5000;
const HOP_MS = 420;
const BUNNY_PX = 30;
// How long an egg stays behind the bunny before it is gone.
const DROP_SHOWS_MS = 2400;
const EGG_PX = 16;

type Drop = {
  id: number;
  x: number;
  lift: number;
  size: number;
  sprite: (typeof EASTER_EGG_SPRITES)[number];
  tilt: number;
  /** When the bunny's tail reaches `x`. */
  at: number;
};

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

/** Two or three painted eggs land behind the bunny on every hop, a little off the spot. */
function planDrops(width: number, calm: boolean) {
  const from = -BUNNY_PX - 18;
  const to = width + BUNNY_PX + 18;
  const duration = calm ? HOP_ACROSS_MS * 1.6 : HOP_ACROSS_MS;
  const drops: Drop[] = [];
  for (let at = HOP_MS; at < duration; at += HOP_MS) {
    const tail = from + ((to - from) * at) / duration;
    if (tail < 0 || tail > width) continue;
    const eggs = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < eggs; i++) {
      drops.push({
        id: drops.length,
        x: tail - i * 16 + (Math.random() - 0.5) * 20,
        lift: Math.random() * 8,
        size: EGG_PX + Math.random() * 4,
        sprite: pick(EASTER_EGG_SPRITES),
        tilt: (Math.random() - 0.5) * 36,
        at: at + i * 60,
      });
    }
  }
  return { from, to, duration, drops };
}

/**
 * The Easter bunny hops along the bottom of the screen once and leaves
 * painted eggs where it lands, which pop up and are gone again soon.
 */
const Bunny = ({ onDone }: { onDone: () => void }) => {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const dropRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [calm] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [plan] = useState(() => planDrops(window.innerWidth, calm));

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const { from, to, duration, drops } = plan;
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

    const shown = drops.map((drop, i) => {
      const rest = `rotate(${drop.tilt}deg) scale(1)`;
      return dropRefs.current[i]?.animate(
        calm
          ? [
              { opacity: 0 },
              { opacity: 1, offset: 0.15 },
              { opacity: 1, offset: 0.8 },
              { opacity: 0 },
            ]
          : [
              { opacity: 0, transform: "translateY(6px) scale(0.2)" },
              {
                opacity: 1,
                transform: `translateY(-5px) rotate(${drop.tilt}deg) scale(1.15)`,
                offset: 0.12,
              },
              { opacity: 1, transform: rest, offset: 0.22 },
              { opacity: 1, transform: rest, offset: 0.85 },
              { opacity: 0, transform: `translateY(4px) ${rest}` },
            ],
        { duration: DROP_SHOWS_MS, delay: drop.at, easing: "ease-out", fill: "both" },
      );
    });

    Promise.all([across.finished, ...shown.map((a) => a?.finished)])
      .then(() => onDoneRef.current())
      .catch(() => undefined);
    return () => {
      across.cancel();
      hops?.cancel();
      for (const a of shown) a?.cancel();
    };
  }, [plan, calm]);

  return (
    <>
      {plan.drops.map((drop, i) => (
        <span
          key={drop.id}
          ref={(el) => {
            dropRefs.current[i] = el;
          }}
          className="absolute leading-none opacity-0"
          style={{ left: drop.x - drop.size / 2, bottom: 8 + drop.lift, fontSize: drop.size }}
        >
          <Sprite name={drop.sprite} />
        </span>
      ))}
      <span ref={outer} className="absolute bottom-2 left-0">
        {/* The rabbit faces left; mirror it so it hops forward. */}
        <span
          ref={inner}
          className="inline-block leading-none"
          style={{ fontSize: BUNNY_PX, scale: "-1 1" }}
        >
          <Sprite name="🐇" />
        </span>
      </span>
    </>
  );
};

/** "N/total easter eggs found", once at least one is found. Reads storage after mount, so SSR renders nothing. */
export const EggCounter = () => {
  const recordFind = useRecordEggFind();
  const [found, setFound] = useState(0);
  const [hopping, setHopping] = useState(false);

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
      <Link href="/eggs" className="hover:text-accent">
        {found}/{EASTER_EGG_IDS.length} easter eggs found
      </Link>{" "}
      {/* One bunny at a time: clicks while it is still out only wiggle the egg. */}
      <EmojiButton
        label="Easter egg"
        onClick={() => {
          recordFind("easter-bunny");
          setHopping(true);
        }}
      >
        {/* A size up from the footer text, so the paint on the shell reads. */}
        <Sprite name="easter-egg-green-blue" className="text-lg" />
      </EmojiButton>
      {hopping &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-20 overflow-hidden"
          >
            <Bunny onDone={() => setHopping(false)} />
          </div>,
          document.body,
        )}
    </span>
  );
};
