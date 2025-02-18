import { CompleteShaderEditor } from "@components/Demos/FullscreenShader";
import { ThreeFiberLayout } from "@components/dom/Layout";

export default function ShaderEditorPage() {
  return (
    <ThreeFiberLayout>
      <CompleteShaderEditor shaderName="shadertoyExample1" />
    </ThreeFiberLayout>
  );
}
