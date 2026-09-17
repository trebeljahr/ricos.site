import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const PAD = 24;
const SAG = 18;
const THREAD_STAGGER_S = 0.09;
const WALK_MS = 900;

type Web = { left: number; top: number; width: number; height: number; threads: string[] };

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
  const xs = [from.x, ...ends.map((e) => e.x)];
  const ys = [from.y, ...ends.map((e) => e.y)];
  const left = Math.min(...xs) - PAD;
  const top = Math.min(...ys) - PAD;
  const width = Math.max(...xs) - left + PAD;
  const height = Math.max(...ys) - top + PAD + SAG;

  const p = (x: number, y: number) => `${Math.round(x - left)} ${Math.round(y - top)}`;
  const threads = ends.map(
    (end) =>
      `M ${p(from.x, from.y)} Q ${p((from.x + end.x) / 2, (from.y + end.y) / 2 + SAG)} ${p(end.x, end.y)}`,
  );
  return { left, top, width, height, threads };
}

const WebpagesEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const webRef = useRef<HTMLSpanElement>(null);
  const spiderRef = useRef<HTMLSpanElement>(null);
  const [web, setWeb] = useState<Web | null>(null);
  const [walkPath, setWalkPath] = useState<string | null>(null);

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

        // The spider climbs down one thread to its link, looks around, and climbs back up.
        const path = spun.threads[Math.floor(Math.random() * spun.threads.length)];
        setWalkPath(path);
        await wait(30);
        const spider = spiderRef.current;
        if (spider) {
          const timing = { duration: WALK_MS, easing: "ease-in-out", fill: "forwards" } as const;
          await spider
            .animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], timing)
            .finished.catch(() => undefined);
          await spider
            .animate(
              [{ rotate: "0deg" }, { rotate: "-12deg" }, { rotate: "12deg" }, { rotate: "0deg" }],
              {
                duration: 500,
              },
            )
            .finished.catch(() => undefined);
          await spider
            .animate([{ offsetDistance: "100%" }, { offsetDistance: "0%" }], timing)
            .finished.catch(() => undefined);
        }
        setWalkPath(null);
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
              {walkPath && (
                <span
                  ref={spiderRef}
                  className="absolute top-0 left-0 text-2xl leading-none drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]"
                  style={{
                    offsetPath: `path("${walkPath}")`,
                    offsetRotate: "auto 90deg",
                    offsetDistance: "0%",
                  }}
                >
                  🕷️
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
