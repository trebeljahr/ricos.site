import { FullCanvasShader } from "@components/canvas/shaderTutorials/FullCanvasShader";
import Layout from "@components/Layout";
import { InfoBox } from "@components/ShaderArtDemo/InfoButton";
import { ShareWithOthersButton } from "@components/ShaderArtDemo/ShareWithOthersButton";
import { Canvas } from "@react-three/fiber";
import controllableShaderArt from "@shaders/controllableShaderArt.glsl";
import { useControls } from "leva";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { IUniform } from "three";

// export default function Abc() {
//   return <InfoBox />;
// }

export default function ShaderArtDemo() {
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
        <InfoBox />
      </div>
    </Layout>
  );
}

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
