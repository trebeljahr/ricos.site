import { motion, useAnimation } from "motion/react";
import { useEffect } from "react";

export const HandEmoji = () => {
  return (
    <span role="img" aria-label="Hand waving">
      👋🏻
    </span>
  );
};

const WavingHand = () => {
  const controls = useAnimation();

  useEffect(() => {
    const animation = { rotate: [0, 10, 0, 10, 0, 10, 0] };
    const transition = { duration: 0.5, ease: "easeInOut" as const };
    const interval = setInterval(() => {
      controls.start(animation, transition);
    }, 5000);

    controls.start(animation, transition);

    return () => clearInterval(interval);
  }, [controls]);

  return (
    <motion.span className="inline-block origin-bottom-right" animate={controls}>
      <HandEmoji />
    </motion.span>
  );
};

export default WavingHand;
