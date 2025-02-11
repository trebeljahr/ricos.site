import { FullCanvasShader } from "@components/canvas/FullCanvasShader";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Canvas } from "@react-three/fiber";
import { getShaderFileNames } from "src/lib/getShaderFileNames";

export default function Page({ fragmentShader }: { fragmentShader: string }) {
  return (
    <ThreeFiberLayout>
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
        <FullCanvasShader fragmentShader={fragmentShader} />
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
  const fragmentShader = await import(
    `@shaders/standaloneFragmentShaders/${shaderName}.frag`
  );

  return {
    props: {
      fragmentShader: fragmentShader.default,
    },
  };
}
