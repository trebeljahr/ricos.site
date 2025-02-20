import { FullCanvasShader } from "@components/canvas/shaderTutorials/FullCanvasShader";
import { CopyButton } from "@components/CodeCopyButton";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Canvas } from "@react-three/fiber";
import controllableShaderArt from "@shaders/controllableShaderArt.glsl";
import { useControls } from "leva";
import { useEffect, useState } from "react";
import { IUniform } from "three";

function ShareWithOthersButton() {
  const handleClick = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };
  return <CopyButton handleClick={handleClick} />;
}

export default function ShaderEditorPage() {
  const [loaded, setLoaded] = useState(false);

  const [uniformValues, setUniforms] = useControls(
    () => ({
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
        value: [1, 1, 1],
        min: 0,
        max: 1,
        step: 0.01,
      },
    }),
    []
  );

  useEffect(() => {
    if (!window.location || loaded) return;

    const params = new URLSearchParams(window.location.search);
    const newParams: Record<string, any> = {};
    for (const [key, value] of params.entries()) {
      newParams[key] = JSON.parse(value);
    }

    setUniforms(newParams);
    setLoaded(true);
  }, [setUniforms, loaded]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(uniformValues)) {
      params.set(name, JSON.stringify(value));
    }

    const new_URL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", new_URL);

    // window.location.search = params.toString();
  }, [uniformValues]);

  const otherUniforms = Object.entries(uniformValues).reduce(
    (acc, [key, value]) => {
      acc[key] = { value };
      return acc;
    },
    {} as { [uniform: string]: IUniform<any> }
  );

  return (
    <ThreeFiberLayout>
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
      </div>
    </ThreeFiberLayout>
  );
}

// good ones
// http://localhost:3000/r3f/shader-art-demo?chosenShape=0&chosenPalette=5&repetitions=2.1&speedFactor=0.6&scaleFactor=2.2&space=7.2&depth=4.199999999999999&contrast=1.1&strength=0.0073&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=5&chosenPalette=3&repetitions=1.5&speedFactor=0.5&scaleFactor=4&space=8&depth=8&contrast=1&strength=0.003&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=5&chosenPalette=7&repetitions=1.5&speedFactor=0.5&scaleFactor=0.6999999999999997&space=15.8&depth=3.5&contrast=2.3&strength=0.004200000000000001&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=5&chosenPalette=1&repetitions=3&speedFactor=1.1&scaleFactor=2.7&space=20&depth=0.1999999999999993&contrast=1.2&strength=0.0076&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=0&chosenPalette=0&repetitions=4.4&speedFactor=0.3&scaleFactor=2.7&space=20&depth=1.0999999999999996&contrast=1.2&strength=0.0076&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=3&chosenPalette=2&repetitions=4.4&speedFactor=0.3&scaleFactor=6.5&space=16.5&depth=1.2999999999999998&contrast=1.1&strength=0.0098&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=6&chosenPalette=2&repetitions=1.5&speedFactor=0.5&scaleFactor=0.3999999999999999&space=16.5&depth=2.5999999999999996&contrast=1.2&strength=0.0088&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=6&chosenPalette=2&repetitions=1.8&speedFactor=0.5&scaleFactor=0.3999999999999999&space=5.1&depth=10&contrast=1.2&strength=0.0083&rgbStrength=%5B0.5%2C0.5%2C0.5%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=6&chosenPalette=5&repetitions=2.1&speedFactor=0.6&scaleFactor=10&space=15.4&depth=4.199999999999999&contrast=1&strength=0.0035&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=6&chosenPalette=1&repetitions=1.4&speedFactor=0.5&scaleFactor=7.4&space=1.5&depth=8&contrast=0.8&strength=0.001&rgbStrength=%5B1%2C1%2C1%5D
// http://localhost:3000/r3f/shader-art-demo?chosenShape=2&chosenPalette=2&repetitions=9.4&speedFactor=0.4&scaleFactor=7.4&space=1.5&depth=3.8&contrast=0.8&strength=0.0078000000000000005&rgbStrength=%5B1%2C1%2C1%5D
