import { AnimatePresence, motion, useAnimation, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const FLY_X = 170;
const FLY_Y = 130;

const NewsletterEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const controls = useAnimation();
  const envelopeRef = useRef<HTMLSpanElement>(null);
  const [stamped, setStamped] = useState(false);

  const registerClick = useEasterEgg("newsletter", {
    onTrigger: () =>
      run(async () => {
        if (reduceMotion) {
          controls.set({ opacity: 0 });
          setStamped(true);
          await wait(1800);
          setStamped(false);
          await wait(300);
          controls.set({ opacity: 1 });
          return;
        }

        // Fly only as far right as the viewport allows, so nothing scrolls sideways.
        const rect = envelopeRef.current?.getBoundingClientRect();
        const room = rect ? document.documentElement.clientWidth - rect.right - 8 : FLY_X;
        const flyX = Math.max(0, Math.min(FLY_X, room));

        await controls.start({ rotate: -10, scaleY: 0.7, transition: { duration: 0.18 } });
        await controls.start({
          x: flyX,
          y: -FLY_Y,
          rotate: 30,
          scaleX: 0.5,
          scaleY: 0.3,
          opacity: 0,
          transition: { duration: 0.55, ease: [0.55, 0, 0.8, 0.4] },
        });
        setStamped(true);
        await wait(1500);
        setStamped(false);
        controls.set({ x: 0, y: 0, rotate: 0, scaleX: 0.6, scaleY: 0.6, opacity: 0 });
        await wait(250);
        await controls.start({ scaleX: 1, scaleY: 1, opacity: 1, transition: { duration: 0.3 } });
      }),
  });

  return (
    <>
      Live and Learn Newsletter{" "}
      <EmojiButton
        label="Love letter"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <motion.span ref={envelopeRef} className="inline-block" animate={controls}>
          💌
        </motion.span>
        <AnimatePresence>
          {stamped && (
            <motion.span
              key="postmark"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 flex size-[4.4em] items-center justify-center rounded-full border-[0.18em] border-red-600 pl-[0.1em] text-[0.42em] leading-none font-bold tracking-widest text-red-600 outline-[0.06em] outline-offset-[-0.42em] outline-red-600 outline-solid dark:border-red-400 dark:text-red-400 dark:outline-red-400"
              style={{ x: "-35%", y: "-50%", rotate: -14 }}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 2.2 }}
              animate={{ opacity: 0.9, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35 } }}
              transition={
                reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 700, damping: 28 }
              }
            >
              SENT
            </motion.span>
          )}
        </AnimatePresence>
      </EmojiButton>
    </>
  );
};

export default NewsletterEgg;
