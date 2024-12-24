import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

export const HandEmoji = () => {
  return (
    <span role="img" aria-label="Hand waving">
      👋🏻
    </span>
  );
};

const Component = () => {
  const controls = useAnimation();

  useEffect(() => {
    const animation = {
      rotate: [0, 10, 0, 10, 0, 10, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    };
    const interval = setInterval(() => {
      controls.start(animation);
    }, 5000);

    controls.start(animation);

    return () => clearInterval(interval);
  }, [controls]);

  return (
    <motion.span
      className="inline-block origin-bottom-right"
      animate={controls}
    >
      <HandEmoji />
    </motion.span>
  );
};

export default Component;
