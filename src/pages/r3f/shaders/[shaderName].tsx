import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { FullCanvasShader } from "@r3f/Scenes/ShaderEditorTutorial/FullCanvasShader";
import { Canvas } from "@react-three/fiber";
import { getShaderFileNames } from "src/lib/getShaderFileNames";

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

export default function Page({
  fragmentShader,
  shaderName,
}: {
  shaderName: string;
  fragmentShader: string;
}) {
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
