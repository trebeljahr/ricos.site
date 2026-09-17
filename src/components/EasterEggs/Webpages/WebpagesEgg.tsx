import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const PAD = 24;
const SAG = 18;
const THREAD_STAGGER_S = 0.09;
const MIN_DROP = 90;
const SPIDER_BOX = 30;
const DROP_MS = 1100;

type Web = {
  left: number;
  top: number;
  width: number;
  height: number;
  threads: string[];
  /** Where the stray strand the spider hangs from is tied off, in box coordinates. */
  anchor: { x: number; y: number };
  /** Long enough for the spider to hang clear of the text below the heading. */
  drop: number;
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
  // The spider drops on a strand straight down from the web itself, past the
  // paragraph, so it hangs against the page rather than over the text.
  const tie = { x: from.x, y: w.top + w.height * 0.85 };
  const paragraphs = web.closest("h2")?.parentElement?.querySelectorAll("p") ?? [];
  const lastParagraph = paragraphs[paragraphs.length - 1];
  const clearance = lastParagraph ? pageBox(lastParagraph) : null;
  const drop = Math.max(
    MIN_DROP,
    clearance ? clearance.top + clearance.height + 18 - tie.y : MIN_DROP,
  );
  const xs = [from.x, tie.x, ...ends.map((e) => e.x)];
  const ys = [from.y, ...ends.map((e) => e.y)];
  const left = Math.min(...xs) - PAD;
  const top = Math.min(...ys) - PAD;
  const width = Math.max(...xs) - left + PAD;
  const height = Math.max(Math.max(...ys) + SAG, tie.y + drop + 34) - top + PAD;

  const p = (x: number, y: number) => `${Math.round(x - left)} ${Math.round(y - top)}`;
  const threads = ends.map(
    (end) =>
      `M ${p(from.x, from.y)} Q ${p((from.x + end.x) / 2, (from.y + end.y) / 2 + SAG)} ${p(end.x, end.y)}`,
  );
  return { left, top, width, height, threads, anchor: { x: tie.x - left, y: tie.y - top }, drop };
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

        // The spider lowers itself on the strand, sways a little, and climbs back up.
        setDangling(true);
        await wait(30);
        const strand = strandRef.current;
        const line = strand?.firstElementChild;
        if (strand && line) {
          const down = { duration: DROP_MS, easing: "ease-out", fill: "forwards" } as const;
          await line
            .animate(
              [
                { transform: "translateY(-100%)" },
                { transform: "translateY(4px)", offset: 0.85 },
                { transform: "translateY(0)" },
              ],
              down,
            )
            .finished.catch(() => undefined);
          await strand
            .animate(
              [
                { rotate: "0deg" },
                { rotate: "6deg" },
                { rotate: "-5deg" },
                { rotate: "3deg" },
                { rotate: "-2deg" },
                { rotate: "0deg" },
              ],
              { duration: 2400, easing: "ease-in-out" },
            )
            .finished.catch(() => undefined);
          await line
            .animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], {
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
                // A window the strand slides down through, so the spider really
                // travels instead of the line just growing under it.
                <span
                  ref={strandRef}
                  className="absolute block origin-top overflow-hidden"
                  style={{
                    left: web.anchor.x - SPIDER_BOX / 2,
                    top: web.anchor.y,
                    width: SPIDER_BOX,
                    height: web.drop + SPIDER_BOX,
                  }}
                >
                  <span
                    className="absolute top-0 left-1/2 flex -translate-x-1/2 flex-col items-center"
                    style={{ transform: "translateY(-100%)" }}
                  >
                    <span
                      className="block w-px bg-gray-500 dark:bg-gray-300"
                      style={{ height: web.drop }}
                    />
                    <span className="rotate-180 text-2xl leading-none drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]">
                      🕷️
                    </span>
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
