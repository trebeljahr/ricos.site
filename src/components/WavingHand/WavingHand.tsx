import { motion, useAnimation, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { usePlausible } from "next-plausible";
import { useCallback, useEffect, useRef, useState } from "react";
import { markEggFound } from "src/lib/easterEggs";
import { HandButton } from "./HandButton";
import { HandEmoji } from "./HandEmoji";

// Only fetched the first time the easter egg fires.
const ConfettiExplosion = dynamic(() => import("react-confetti-explosion"), { ssr: false });

const EGG_ID = "waving-hand";
const CLICKS_TO_TRIGGER = 5;
const CLICK_WINDOW_MS = 2000;

const idleWave = {
  animation: { rotate: [0, 10, 0, 10, 0, 10, 0] },
  transition: { duration: 0.5, ease: "easeInOut" as const },
};
const quickWave = {
  animation: { rotate: [0, 16, 0] },
  transition: { duration: 0.25, ease: "easeInOut" as const },
};
const furiousWave = {
  animation: {
    rotate: [0, 40, -20, 40, -20, 40, -20, 40, -20, 40, -20, 40, 0],
    scale: [1, 1.35, 1.2, 1.4, 1.25, 1.35, 1],
  },
  transition: { duration: 1.5, ease: "easeInOut" as const },
};

const WavingHand = () => {
  const controls = useAnimation();
  const reduceMotion = useReducedMotion();
  const plausible = usePlausible();
  const clickTimes = useRef<number[]>([]);
  const isFurious = useRef(false);
  const [confettiKey, setConfettiKey] = useState<number | null>(null);

  useEffect(() => {
    const wave = () => {
      if (!isFurious.current) controls.start(idleWave.animation, idleWave.transition);
    };
    const interval = setInterval(wave, 5000);
    wave();

    return () => clearInterval(interval);
  }, [controls]);

  const triggerEgg = useCallback(async () => {
    plausible("Easter Egg", { props: { egg: EGG_ID } });
    markEggFound(EGG_ID);

    if (reduceMotion) {
      controls.start(idleWave.animation, idleWave.transition);
      return;
    }

    isFurious.current = true;
    setConfettiKey(Date.now());
    try {
      await controls.start(furiousWave.animation, furiousWave.transition);
    } finally {
      isFurious.current = false;
    }
  }, [controls, plausible, reduceMotion]);

  const handleClick = () => {
    if (isFurious.current) return;

    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < CLICK_WINDOW_MS), now];

    if (clickTimes.current.length >= CLICKS_TO_TRIGGER) {
      clickTimes.current = [];
      void triggerEgg();
      return;
    }

    controls.start(quickWave.animation, quickWave.transition);
  };

  return (
    <span className="relative">
      <HandButton onClick={handleClick}>
        <motion.span className="inline-block origin-bottom-right" animate={controls}>
          <HandEmoji />
        </motion.span>
      </HandButton>
      {confettiKey !== null && (
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2">
          <ConfettiExplosion
            key={confettiKey}
            force={0.7}
            duration={2400}
            particleCount={120}
            particleSize={10}
            width={900}
            zIndex={400}
            onComplete={() => setConfettiKey(null)}
          />
        </span>
      )}
    </span>
  );
};

export default WavingHand;
