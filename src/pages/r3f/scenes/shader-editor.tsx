import { CompleteShaderEditor } from "@components/Demos/FullscreenShader";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

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

export default function ShaderEditorPage() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CompleteShaderEditor shaderName="shadertoyExample1" />
    </ThreeFiberLayout>
  );
}
