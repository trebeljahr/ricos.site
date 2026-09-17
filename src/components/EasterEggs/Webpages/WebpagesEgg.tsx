import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const PAD = 24;
const SAG = 18;
const THREAD_STAGGER_S = 0.09;
const DROP = 90;
const DROP_MS = 1100;

type Web = {
  left: number;
  top: number;
  width: number;
  height: number;
  threads: string[];
  /** Where the stray strand the spider hangs from is tied off, in box coordinates. */
  anchor: { x: number; y: number };
};

/** A sagging silk thread from the web to the top of every link in the section. */
function spinWeb(web: Element): Web | null {
  const links = [...(web.closest("h2")?.parentElement?.querySelectorAll("p a") ?? [])];
  if (!links.length) return null;

  const w = pageBox(web);
  const from = { x: w.left + w.width / 2, y: w.top + w.height / 2 };
  const ends = links.map((link) => {
    const b = pageBox(link);
    return { x: b.left + b.width / 2, y: b.top + 2 };
  });
  // A stray strand leaves the web to the right; the spider drops from its end.
  const tie = { x: w.left + w.width + 22, y: w.top + w.height * 0.55 };
  const xs = [from.x, tie.x, ...ends.map((e) => e.x)];
  const ys = [from.y, ...ends.map((e) => e.y)];
  const left = Math.min(...xs) - PAD;
  const top = Math.min(...ys) - PAD;
  const width = Math.max(...xs) - left + PAD;
  const height = Math.max(Math.max(...ys) + SAG, tie.y + DROP + 30) - top + PAD;

  const p = (x: number, y: number) => `${Math.round(x - left)} ${Math.round(y - top)}`;
  const threads = ends.map(
    (end) =>
      `M ${p(from.x, from.y)} Q ${p((from.x + end.x) / 2, (from.y + end.y) / 2 + SAG)} ${p(end.x, end.y)}`,
  );
  threads.push(`M ${p(from.x, from.y)} Q ${p(tie.x - 8, from.y - 6)} ${p(tie.x, tie.y)}`);
  return { left, top, width, height, threads, anchor: { x: tie.x - left, y: tie.y - top } };
}

const WebpagesEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const webRef = useRef<HTMLSpanElement>(null);
  const strandRef = useRef<HTMLSpanElement>(null);
  const [web, setWeb] = useState<Web | null>(null);
  const [dangling, setDangling] = useState(false);

  const registerClick = useEasterEgg("webpages", {
    onTrigger: () =>
      run(async () => {
        const spun = webRef.current && spinWeb(webRef.current);
        if (!spun) return;
        setWeb(spun);

        if (reduceMotion) {
          await wait(1800);
          setWeb(null);
          await wait(400);
          return;
        }

        await wait(spun.threads.length * THREAD_STAGGER_S * 1000 + 500);

        // The spider lowers itself on the stray strand, sways a little, and climbs back up.
        setDangling(true);
        await wait(30);
        const strand = strandRef.current;
        if (strand) {
          await strand
            .animate(
              [
                { height: "0px" },
                { height: `${DROP + 8}px`, offset: 0.8 },
                { height: `${DROP}px` },
              ],
              {
                duration: DROP_MS,
                easing: "ease-out",
                fill: "forwards",
              },
            )
            .finished.catch(() => undefined);
          await strand
            .animate(
              [
                { rotate: "0deg" },
                { rotate: "7deg" },
                { rotate: "-6deg" },
                { rotate: "4deg" },
                { rotate: "-2deg" },
                { rotate: "0deg" },
              ],
              { duration: 2400, easing: "ease-in-out" },
            )
            .finished.catch(() => undefined);
          await strand
            .animate([{ height: `${DROP}px` }, { height: "0px" }], {
              duration: DROP_MS,
              easing: "ease-in-out",
              fill: "forwards",
            })
            .finished.catch(() => undefined);
        }
        setDangling(false);
        setWeb(null);
        await wait(400);
      }),
  });

  return (
    <>
      Webpages{" "}
      <EmojiButton
        label="Spider web"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={webRef}>🕸️</span>
      </EmojiButton>
      <PageLayer>
        <AnimatePresence>
          {web && (
            <motion.div
              key="web"
              aria-hidden="true"
              className="absolute text-base font-normal"
              style={{ left: web.left, top: web.top, width: web.width, height: web.height }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              <svg
                aria-hidden="true"
                className="absolute inset-0 overflow-visible text-gray-500 dark:text-gray-300"
                width={web.width}
                height={web.height}
              >
                {web.threads.map((d, i) => (
                  <motion.path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.7}
                    strokeWidth={1.2}
                    initial={{ pathLength: reduceMotion ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: i * THREAD_STAGGER_S, ease: "easeOut" }}
                  />
                ))}
              </svg>
              {dangling && (
                // Grows downward from the tie-off point; the spider hangs head down at its end.
                <span
                  ref={strandRef}
                  className="absolute block w-px origin-top bg-gray-500 dark:bg-gray-300"
                  style={{ left: web.anchor.x, top: web.anchor.y, height: 0 }}
                >
                  <span className="absolute top-full left-1/2 inline-block -translate-x-1/2 -translate-y-1 rotate-180 text-2xl leading-none drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]">
                    🕷️
                  </span>
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PageLayer>
    </>
  );
};

export default WebpagesEgg;
