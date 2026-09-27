import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Needle } from "./Haystack";
import { BALE_H, SIZE } from "./pile";

type Point = { x: number; y: number };
type Twinkle = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  rise: number;
};

/** Seconds from the find: pop out, rise to the middle, hover, then fade away. */
const POPPED = 0.35;
const RISE = 0.7;
const ARRIVE = 2;
const VANISH = 3.6;
const END = 4.2;
const HALO = 110;
const RAYS = 170;
/** How far the needle turns so it hangs point down, like a relic. */
const UPRIGHT = -48;

const GOLD = "255 206 84";
const glow = `drop-shadow(0 0 3px rgb(255 246 214 / 0.95)) drop-shadow(0 0 8px rgb(${GOLD} / 0.85))`;

/** Sparkles scattered in a ring around the needle, `reach` pixels out. */
function scatter(count: number, reach: [number, number]): Twinkle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const distance = reach[0] + Math.random() * (reach[1] - reach[0]);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 5 + Math.random() * 8,
      delay: Math.random() * 1.4,
      duration: 0.9 + Math.random() * 0.7,
      rise: 4 + Math.random() * 12,
    };
  });
}

/** A four-pointed star with a bright core. */
const Sparkle = ({ size }: { size: number }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false">
    <path
      d="M10 0C10.9 6.6 13.4 9.1 20 10 13.4 10.9 10.9 13.4 10 20 9.1 13.4 6.6 10.9 0 10 6.6 9.1 9.1 6.6 10 0Z"
      fill={`rgb(${GOLD})`}
    />
    <circle cx="10" cy="10" r="1.8" fill="#fffbea" />
  </svg>
);

/** The last flash as the needle goes: a ring of light and sparkles flung out. */
const Farewell = ({ at }: { at: Point }) => {
  const [flung] = useState(() => scatter(14, [48, 90]));
  return (
    <div className="absolute" style={{ left: at.x, top: at.y }}>
      <motion.div
        className="absolute rounded-full"
        style={{
          left: -30,
          top: -30,
          width: 60,
          height: 60,
          background: `radial-gradient(circle, rgb(255 251 234 / 0.95), rgb(${GOLD} / 0.55) 45%, rgb(${GOLD} / 0) 70%)`,
        }}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {flung.map((t, i) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed burst
          key={i}
          className="absolute"
          style={{ left: -t.size / 2, top: -t.size / 2, filter: glow }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{ x: t.x, y: t.y - t.rise, scale: [0, 1.2, 0], rotate: 180 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Sparkle size={t.size} />
        </motion.div>
      ))}
    </div>
  );
};

/**
 * The found needle, lit up: it pops out of its bale, rises to the middle of
 * the pile, grows a little while it hovers there in a glow of light and
 * sparkles, and then fades away in one last flash.
 */
export const HolyNeedle = ({
  from,
  to,
  startScale,
  reduceMotion,
}: {
  from: Point;
  to: Point;
  startScale: number;
  reduceMotion: boolean;
}) => {
  const [twinkles] = useState(() => scatter(12, [26, 50]));
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setLeaving(true), VANISH * 1000);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const center = { left: SIZE / 2, top: BALE_H / 2 };

  return (
    <>
      <motion.div
        className="absolute"
        style={{ left: from.x, top: from.y, width: SIZE, height: BALE_H }}
        initial={{ x: 0, y: 0, scale: startScale, rotate: 0, opacity: 1 }}
        animate={
          reduceMotion
            ? { scale: 1, rotate: -8, opacity: [1, 1, 0] }
            : {
                x: [0, 0, 0, dx, dx, dx, dx, dx],
                y: [0, -4, -4, dy, dy - 5, dy, dy - 3, dy - 24],
                scale: [startScale, 1.15, 1, 1.55, 1.6, 1.55, 1.6, 2.1],
                rotate: [0, -8, -8, UPRIGHT, UPRIGHT, UPRIGHT, UPRIGHT, UPRIGHT],
                opacity: [1, 1, 1, 1, 1, 1, 1, 0],
              }
        }
        transition={
          reduceMotion
            ? { duration: 3, times: [0, 0.85, 1] }
            : {
                duration: END,
                times: [0, POPPED, RISE, ARRIVE, 2.55, 3.1, VANISH, END].map((t) => t / END),
                ease: [
                  "easeOut",
                  "easeOut",
                  "easeInOut",
                  "easeInOut",
                  "easeInOut",
                  "easeInOut",
                  "easeIn",
                ],
              }
        }
      >
        {/* Light rays turning slowly behind the halo. */}
        {!reduceMotion && (
          <motion.div
            className="absolute rounded-full"
            style={{
              left: center.left - RAYS / 2,
              top: center.top - RAYS / 2,
              width: RAYS,
              height: RAYS,
              background: `repeating-conic-gradient(rgb(${GOLD} / 0.5) 0deg 5deg, rgb(${GOLD} / 0) 5deg 22.5deg)`,
              maskImage: "radial-gradient(circle, #000 12%, transparent 62%)",
              WebkitMaskImage: "radial-gradient(circle, #000 12%, transparent 62%)",
            }}
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 90 }}
            transition={{
              opacity: { duration: 0.8, delay: 0.2 },
              rotate: { duration: END, ease: "linear" },
            }}
          />
        )}
        <motion.div
          className="absolute rounded-full"
          style={{
            left: center.left - HALO / 2,
            top: center.top - HALO / 2,
            width: HALO,
            height: HALO,
            background: `radial-gradient(circle, rgb(255 251 234 / 0.95) 0%, rgb(${GOLD} / 0.6) 28%, rgb(${GOLD} / 0.2) 50%, rgb(${GOLD} / 0) 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: [0, 1, 0.8, 1, 0.8, 1], scale: [0.3, 1, 0.9, 1.05, 0.92, 1] }
          }
          transition={reduceMotion ? { duration: 0.3 } : { duration: END, ease: "easeInOut" }}
        />
        {!reduceMotion &&
          twinkles.map((t, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed set of sparkles
              key={i}
              className="absolute"
              style={{
                left: center.left + t.x - t.size / 2,
                top: center.top + t.y - t.size / 2,
                filter: glow,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 90], y: [0, -t.rise] }}
              transition={{
                duration: t.duration,
                delay: t.delay,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 0.2,
                ease: "easeInOut",
              }}
            >
              <Sparkle size={t.size} />
            </motion.div>
          ))}
        <span className="absolute inset-0 leading-none" style={{ filter: glow }}>
          <Needle size={SIZE} />
        </span>
      </motion.div>
      {leaving && <Farewell at={{ x: to.x + SIZE / 2, y: to.y + BALE_H / 2 - 12 }} />}
    </>
  );
};
