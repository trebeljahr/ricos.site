import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { FaInfo } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import useMeasure from "react-use-measure";

const fadeDownVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const sidebarVariants = {
  show: (height: number) => {
    console.log(height);

    return {
      clipPath: `circle(${height * 2 + 200}px at 0px 0px)`,
      transition: {
        type: "spring",
        stiffness: 20,
        restDelta: 2,
      },
    };
  },
  hidden: {
    clipPath: "circle(40px at 0px 0px)",
    transition: {
      delay: 0.2,
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
};

export const InfoBox = () => {
  const [ref, { height }] = useMeasure();

  const [showInfo, setShowInfo] = useState(false);
  const toggleInfo = () => {
    setShowInfo((prev) => !prev);
  };

  return (
    <>
      <button
        onClick={toggleInfo}
        className="w-fit h-fit absolute p-3 bottom-2 left-2 z-10 flex place-items-center bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700  rounded-full"
      >
        <FaInfo className="size-4" />
      </button>

      <motion.div
        transition={{
          duration: 0.3,
          ease: [0, 0.71, 0.2, 1.01],
        }}
        initial="hidden"
        exit="hidden"
        animate={showInfo ? "show" : "hidden"}
        viewport={{ once: true }}
        variants={{
          hidden: {
            display: "none",
          },
          show: {
            display: "block",
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
        className="absolute bottom-0 left-0 z-10 p-3 px-5 rounded-md"
      >
        <motion.div
          className="absolute bottom-0 left-0 w-prose h-full bg-gray-200 dark:bg-gray-800"
          variants={sidebarVariants}
          custom={height}
          ref={ref}
        />
        <div className="max-w-prose">
          <motion.p className="pr-5" variants={fadeDownVariants}>
            This shader art demo allows you to control a fractal shader with
            sliders. Go create something cool! You can share your current
            settings with others by clicking the share button in the bottom
            right. This will copy the URL which you can then send around.
          </motion.p>
          <motion.p className="!mb-0" variants={fadeDownVariants}>
            Try some presets!
          </motion.p>
          <motion.p variants={fadeDownVariants}>
            <Link href="/r3f/shader-art-demo?chosenShape=0&chosenPalette=5&repetitions=2.1&speedFactor=0.6&scaleFactor=2.2&space=7.2&depth=4.199999999999999&contrast=1.1&strength=0.0073&rgbStrength=%5B1%2C1%2C1%5D">
              1
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=5&chosenPalette=3&repetitions=1.5&speedFactor=0.5&scaleFactor=4&space=8&depth=8&contrast=1&strength=0.003&rgbStrength=%5B1%2C1%2C1%5D">
              2
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=5&chosenPalette=7&repetitions=1.5&speedFactor=0.5&scaleFactor=0.6999999999999997&space=15.8&depth=3.5&contrast=2.3&strength=0.004200000000000001&rgbStrength=%5B1%2C1%2C1%5D">
              3
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=5&chosenPalette=1&repetitions=3&speedFactor=1.1&scaleFactor=2.7&space=20&depth=0.1999999999999993&contrast=1.2&strength=0.0076&rgbStrength=%5B1%2C1%2C1%5D">
              4
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=0&chosenPalette=0&repetitions=4.4&speedFactor=0.3&scaleFactor=2.7&space=20&depth=1.0999999999999996&contrast=1.2&strength=0.0076&rgbStrength=%5B1%2C1%2C1%5D">
              5
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=3&chosenPalette=2&repetitions=4.4&speedFactor=0.3&scaleFactor=6.5&space=16.5&depth=1.2999999999999998&contrast=1.1&strength=0.0098&rgbStrength=%5B1%2C1%2C1%5D">
              6
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=2&chosenPalette=2&repetitions=9.4&speedFactor=0.4&scaleFactor=7.4&space=1.5&depth=3.8&contrast=0.8&strength=0.0078000000000000005&rgbStrength=%5B1%2C1%2C1%5D">
              7
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=6&chosenPalette=2&repetitions=1.5&speedFactor=0.5&scaleFactor=0.3999999999999999&space=16.5&depth=2.5999999999999996&contrast=1.2&strength=0.0088&rgbStrength=%5B1%2C1%2C1%5D">
              8
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=6&chosenPalette=2&repetitions=1.8&speedFactor=0.5&scaleFactor=0.3999999999999999&space=5.1&depth=10&contrast=1.2&strength=0.0083&rgbStrength=%5B0.5%2C0.5%2C0.5%5D">
              9
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=6&chosenPalette=5&repetitions=2.1&speedFactor=0.6&scaleFactor=10&space=15.4&depth=4.199999999999999&contrast=1&strength=0.0035&rgbStrength=%5B1%2C1%2C1%5D">
              10
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=6&chosenPalette=1&repetitions=1.4&speedFactor=0.5&scaleFactor=7.4&space=1.5&depth=8&contrast=0.8&strength=0.001&rgbStrength=%5B1%2C1%2C1%5D">
              11
            </Link>
            ,{" "}
            <Link href="/r3f/shader-art-demo?chosenShape=2&chosenPalette=3&repetitions=4.4&speedFactor=1.8&scaleFactor=2.7&space=7.1&depth=8&contrast=0.8&strength=0.0023&rgbStrength=%5B1%2C1%2C1%5D">
              12
            </Link>
          </motion.p>
          <motion.p variants={fadeDownVariants}>
            This project is largely inspired by the work of{" "}
            <a href="https://www.kishimisu.art/">kishimisu</a>, specifically his{" "}
            <a href="https://www.youtube.com/watch?v=f4s1h2YETNY">
              intro to creative shader art video
            </a>
            , make sure to check it out on YT! The demo is using{" "}
            <a href="https://iquilezles.org/articles/distfunctions2d/">
              2D SDF functions by Inigo Quilez
            </a>{" "}
            as well as{" "}
            <a href="https://iquilezles.org/articles/palettes/">
              his palette approach
            </a>{" "}
            for coloring!
          </motion.p>
          <motion.p variants={fadeDownVariants}>
            Also, this project would not be possible without the use of{" "}
            <a href="https://github.com/pmndrs/react-three-fiber">r3f</a>,{" "}
            <a href="https://github.com/pmndrs/leva">leva</a>, and the whole{" "}
            <a href="https://pmnd.rs/">pmndrs</a> ecosystem. Thanks for building
            all these crazy tools! 😊
          </motion.p>
        </div>
        <button
          className="absolute top-2 right-2 bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full"
          onClick={toggleInfo}
        >
          <FiX className="size-5 " />
        </button>
      </motion.div>
    </>
  );
};
