import { FullCanvasShader } from "@components/canvas/shaderTutorials/FullCanvasShader";
import { CopyButton } from "@components/CodeCopyButton";
import { ThreeFiberLayout } from "@components/dom/Layout";
import Layout from "@components/Layout";
import { Canvas } from "@react-three/fiber";
import controllableShaderArt from "@shaders/controllableShaderArt.glsl";
import { AnimatePresence, motion } from "framer-motion";
import { Leva, useControls } from "leva";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaCheck,
  FaClipboard,
  FaInfo,
  FaShareAlt,
  FaTimes,
} from "react-icons/fa";
import { FaX } from "react-icons/fa6";
import { FiX } from "react-icons/fi";
import { IUniform } from "three";

function ShareWithOthersButton() {
  const handleClick = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const [disabled, setDisabled] = useState(false);

  const handleClickAndDisable = () => {
    handleClick();
    setDisabled(true);
    setTimeout(() => {
      setDisabled(false);
    }, 3000);
  };

  return (
    <button
      disabled={disabled}
      onClick={handleClickAndDisable}
      className="w-fit h-fit absolute p-3 bottom-2 right-2 z-10 flex place-items-center bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
    >
      {disabled ? (
        <span className="text-sm flex place-items-center">
          Copied URL for Sharing{" "}
          <FaCheck className="ml-5 size-4 text-green-500 dark:text-green-400" />
        </span>
      ) : (
        <FaShareAlt className="size-4 text-gray-700 dark:text-gray-200" />
      )}
    </button>
  );
}

const InfoButton = () => {
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
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ y: 472 + 24 }}
            animate={{ y: 0 }}
            exit={{ y: 472 + 24 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-0 z-10 bg-white dark:bg-gray-900 p-3 px-5 rounded-md"
          >
            <div className="max-w-prose">
              <p className="pr-5">
                This shader art demo allows you to control a fractal shader with
                sliders. Go create something cool! You can share your current
                settings with others by clicking the share button in the bottom
                right. This will copy the URL which you can then send around.
              </p>
              <p className="!mb-0">Try some presets!</p>
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
              <p>
                This project is largely inspired by the work of{" "}
                <a href="https://www.kishimisu.art/">kishimisu</a>, specifically
                his{" "}
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
              </p>
              <p>
                Also, this project would not be possible without the use of{" "}
                <a href="https://github.com/pmndrs/react-three-fiber">r3f</a>,{" "}
                <a href="https://github.com/pmndrs/leva">leva</a>, and the whole{" "}
                <a href="https://pmnd.rs/">pmndrs</a> ecosystem. Thanks for
                building all these crazy tools! 😊
              </p>
            </div>
            <button
              className="absolute top-2 right-2 bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full"
              onClick={toggleInfo}
            >
              <FiX className="size-5 " />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const defaultValues = {
  chosenShape: {
    value: 5,
    min: 0,
    max: 6,
    step: 1,
  },
  chosenPalette: {
    value: 3,
    min: 0,
    max: 7,
    step: 1,
  },
  repetitions: {
    value: 1.5,
    min: 0,
    max: 10,
    step: 0.1,
  },
  speedFactor: {
    value: 0.5,
    min: 0,
    max: 4,
    step: 0.1,
  },
  scaleFactor: {
    value: 4.0,
    min: 0,
    max: 10,
    step: 0.1,
  },
  space: { value: 8, min: 0, max: 20, step: 0.1 },
  depth: { value: 8, min: 0, max: 10, step: 0.1 },
  contrast: { value: 1, min: 0, max: 3, step: 0.1 },
  strength: {
    value: 0.003,
    min: 0.0005,
    max: 0.01,
    step: 0.0001,
  },
  rgbStrength: {
    value: [1, 1, 1] as [number, number, number],
    min: 0,
    max: 1,
    step: 0.01,
  },
};

export default function ShaderEditorPage() {
  // const [loaded, setLoaded] = useState(false);
  const searchParams = useSearchParams();
  const [uniformValues, setUniforms] = useControls(() => defaultValues, []);

  useEffect(() => {
    if (!window.location) return;

    const params = searchParams;
    const newParams: Record<string, any> = {};
    for (const [key, value] of params.entries()) {
      newParams[key] = JSON.parse(value);
    }

    setUniforms(newParams);
  }, [setUniforms, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(uniformValues)) {
      params.set(name, JSON.stringify(value));
    }

    const new_URL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", new_URL);
  }, [uniformValues]);

  const otherUniforms = Object.entries(uniformValues).reduce(
    (acc, [key, value]) => {
      acc[key] = { value };
      return acc;
    },
    {} as { [uniform: string]: IUniform<any> }
  );

  return (
    <Layout
      title="Shader Art Demo"
      description="A shader art demo that allows you to control a beautiful shader with sliders."
      url="/r3f/shader-art-demo"
      keywords={[]}
      image="/assets/blog/shader-art-demo.png"
      imageAlt="Shader Art Demo"
      leftSmallNavbar
    >
      <div className="w-screen h-screen relative bg-leva-medium dark:bg-leva-dark">
        <Canvas
          orthographic
          camera={{
            left: -1,
            right: 1,
            top: 1,
            bottom: -1,
            near: 0.1,
            far: 1000,
            position: [0, 0, 1],
          }}
          resize={{ debounce: 0 }}
        >
          <FullCanvasShader
            key={Math.random()}
            fragmentShader={controllableShaderArt}
            otherUniforms={otherUniforms}
          />
        </Canvas>
        <ShareWithOthersButton />
        <InfoButton />
      </div>
    </Layout>
  );
}
