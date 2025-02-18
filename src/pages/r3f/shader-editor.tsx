import {
  CodeEditor,
  SideBySideShaderEditor,
} from "@components/canvas/shaderTutorials/ShaderEditor";
import { ShaderEditorWithTextureUpload } from "@components/Demos/FullscreenShader/6-ShaderEditor";
import { CompleteShaderEditor } from "@components/Demos/FullscreenShader/withContext/CompleteShaderEditorWithContext";
import { ThreeFiberLayout } from "@components/dom/Layout";
const shaderCode = `
void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

export default function ShaderEditorPage() {
  return (
    <ThreeFiberLayout>
      {/* <CodeEditor code={shaderCode} /> */}
      {/* <SideBySideShaderEditor initialCode={shaderCode} /> */}
      {/* <ShaderWithTextureUpload /> */}
      {/* <ShaderEditorWithTextureUpload /> */}
      <CompleteShaderEditor />
    </ThreeFiberLayout>
  );
}
