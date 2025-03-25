import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { FullCanvasShader } from "@r3f/Scenes/ShaderEditorTutorial/FullCanvasShader";
import { Canvas } from "@react-three/fiber";
import { getShaderFileNames } from "src/lib/getShaderFileNames";

export default function Page({
  fragmentShader,
  shaderName,
}: {
  shaderName: string;
  fragmentShader: string;
}) {
  console.log(shaderName);

  const seoInfo = {
    title: shaderName || "",
    description: "A simple shader demo for an implementation of " + shaderName,
    url: "/r3f/shaders/" + shaderName,
    keywords: [
      "threejs",
      "react-three-fiber",
      "shaders",
      "r3f",
      "3D",
      "programming",
      "graphics",
      "webgl",
    ],
    image: `/assets/pages/${shaderName}.png`,
    imageAlt: shaderName,
  };

  return (
    <ThreeFiberLayout {...seoInfo}>
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
      >
        <FullCanvasShader
          key={shaderName + Math.random()}
          fragmentShader={fragmentShader}
        />
      </Canvas>
    </ThreeFiberLayout>
  );
}

export async function getStaticPaths() {
  const shaderFiles = await getShaderFileNames();

  console.log(shaderFiles);
  return {
    paths: shaderFiles.map((shaderName) => ({
      params: { shaderName },
    })),
    fallback: true,
  };
}

type Params = { params: { shaderName: string } };

export async function getStaticProps({ params: { shaderName } }: Params) {
  const { default: fragmentShader } = await import(
    `@shaders/standaloneFragmentShaders/${shaderName}.frag`
  );

  return {
    props: {
      shaderName,
      fragmentShader,
    },
  };
}
