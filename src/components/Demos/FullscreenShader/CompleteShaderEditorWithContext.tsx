import { useRef } from "react";
import { CodeEditor } from "./CodeEditor";
import { EditorContextProvider } from "./EditorContextProvider";
import { FullCanvasShader } from "./FullCanvasShader";
import { TextureUploadUI } from "./TextureUploadUI";
import defaultShader from "./shaders/fragmentShader.glsl";
import { useInView } from "motion/react";

type Props = {
  initialShader: string;
};

const ShaderEditor = ({ initialShader }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  return (
    <div ref={ref} className="min-h-fit lg:h-[512px] large-bleed">
      {inView ? (
        <EditorContextProvider initialCode={initialShader}>
          <div className="lg:grid lg:grid-cols-2 h-full relative">
            <CodeEditor />
            <div className="h-[512px] lg:h-full">
              <FullCanvasShader />
            </div>
            <TextureUploadUI />
          </div>
        </EditorContextProvider>
      ) : (
        <div className="h-[1024px] lg:h-full bg-gray-400"></div>
      )}
    </div>
  );
};

type CompleteShaderEditorProps = {
  shaderName: keyof typeof EXAMPLE_SHADERS;
};

const _CompleteShaderEditor = ({ shaderName }: CompleteShaderEditorProps) => {
  const initialShader = EXAMPLE_SHADERS[shaderName] || defaultShader;
  return <ShaderEditor initialShader={initialShader} />;
};

import shadertoyExample1 from "./shaders/shadertoyExample1.glsl";
import shadertoyExample2 from "./shaders/shadertoyExample2.glsl";
import timeExample from "./shaders/timeExample.glsl";
import mouseExample from "./shaders/mouseExample.glsl";
import textureExample from "./shaders/textureExample.glsl";

const EXAMPLE_SHADERS = {
  shadertoyExample1,
  shadertoyExample2,
  timeExample,
  mouseExample,
  textureExample,
};

export default _CompleteShaderEditor;
