import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const STARS = 10;
const STAR_STAGGER_S = 0.12;
const SHOW_MS = 3500;

/**
 * Easter egg on a booknote's rating: the trophy is lifted up with a shine,
 * and a row of ten stars fills up to the rating, one star at a time.
 */
const TrophyEgg = ({ rating }: { rating: number }) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const trophyRef = useRef<HTMLSpanElement>(null);
  const [stars, setStars] = useState(false);
  const filled = Math.max(0, Math.min(STARS, Math.round(rating)));

  const registerClick = useEasterEgg("trophy", {
    onTrigger: () =>
      run(async () => {
        if (!reduceMotion) {
          trophyRef.current?.animate(
            [
              { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
              {
                transform: "translateY(-0.5em) scale(1.35) rotate(-8deg)",
                filter: "brightness(1.4) drop-shadow(0 0 6px #facc15)",
                offset: 0.35,
              },
              {
                transform: "translateY(-0.5em) scale(1.35) rotate(8deg)",
                filter: "brightness(1.4) drop-shadow(0 0 6px #facc15)",
                offset: 0.65,
              },
              { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
            ],
            { duration: 1100, easing: "ease-in-out" },
          );
        }
        setStars(true);
        await wait(SHOW_MS + (reduceMotion ? 0 : STARS * STAR_STAGGER_S * 1000));
        setStars(false);
        await wait(400);
      }),
  });

  return (
    <>
      <EmojiButton
        label="Trophy"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={trophyRef} className="inline-block">
          🏆
        </span>
      </EmojiButton>
      <AnimatePresence>
        {stars && (
          <motion.span
            key="stars"
            role="img"
            aria-label={`${filled} of ${STARS} stars`}
            className="pointer-events-none absolute top-full right-0 flex gap-0.5 text-base leading-none whitespace-nowrap sm:right-auto sm:left-0 sm:text-lg"
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            {Array.from({ length: STARS }, (_, i) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed row of ten stars
                key={i}
                aria-hidden="true"
                className={i < filled ? "inline-block" : "inline-block opacity-30 grayscale"}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0, rotate: -90 }}
                animate={{ opacity: i < filled ? 1 : 0.3, scale: 1, rotate: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.2 }
                    : {
                        type: "spring",
                        stiffness: 500,
                        damping: 14,
                        delay: 0.35 + i * STAR_STAGGER_S,
                      }
                }
              >
                ⭐
              </motion.span>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
};

export default TrophyEgg;
