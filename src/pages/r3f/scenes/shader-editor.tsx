import { CompleteShaderEditor } from "@components/Demos/FullscreenShader";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

const seoInfo = {
  title: "Shader Editor",
  description:
    "This is an interactive shader editor demo, similar to the implementation found at glsl-editor or shadertoy. You can edit the shader code and see the results in real-time with errors being logged to the console.",
  url: "/r3f/scenes/shader-editor",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/shader-editor.png",
  imageAlt:
    "an window half split between a text editor with shader code and a rendered shader voronoi shader on the other side",
};

export default function ShaderEditorPage() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CompleteShaderEditor shaderName="shadertoyExample1" />
    </ThreeFiberLayout>
  );
}
