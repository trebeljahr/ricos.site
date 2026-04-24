import { useInView } from "motion/react";
import { useRef } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { CodeEditor } from "./CodeEditor";
import { EditorContextProvider, useEditorContext } from "./EditorContextProvider";
import { FullCanvasShader } from "./FullCanvasShader";
import { TextureUploadUI } from "./TextureUploadUI";
import defaultShader from "./shaders/fragmentShader.glsl";

type Props = {
  initialShader: string;
};

const ExpandButton = () => {
  const { expanded, setExpanded } = useEditorContext();

  const _expandFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const toggleExpand = () => {
    // expandFullscreen();
    setExpanded(!expanded);
  };

  return (
    <button type="button" onClick={toggleExpand} className="p-2">
      {expanded ? <FaCompressArrowsAlt /> : <FaExpandArrowsAlt />}
    </button>
  );
};

const Toolbar = () => {
  return (
    <div className="flex justify-end items-center text-white relative">
      <ExpandButton />
      <TextureUploadUI />
    </div>
  );
};

const InProvider = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const { expanded } = useEditorContext();

  return (
    <div
      ref={ref}
      className={clsx(
        "h-full bg-[#0a0a0a] large-bleed",
        expanded ? "h-full overscroll-contain popup" : "border-4 border-[#0a0a0a]",
      )}
      style={
        expanded
          ? {
              width: "100vw",
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 1000,
              margin: 0,
              overflow: "hidden",
            }
          : {}
      }
    >
      {inView ? (
        <>
          <Toolbar />
          <PanelGroup direction="horizontal">
            <Panel defaultSize={70}>
              <CodeEditor />
            </Panel>
            <PanelResizeHandle className="w-1 bg-[#0a0a0a]" />
            <Panel>
              <div
                className={clsx(expanded ? "h-[calc(100vh-34px)]" : "h-[512px]", "bg-[#0a0a0a]")}
              >
                <FullCanvasShader />
              </div>
            </Panel>
          </PanelGroup>
        </>
      ) : (
        <div className="h-[1024px] lg:h-full bg-gray-400" />
      )}
    </div>
  );
};
const ShaderEditor = ({ initialShader }: Props) => {
  return (
    <EditorContextProvider initialCode={initialShader}>
      <InProvider />
    </EditorContextProvider>
  );
};

type CompleteShaderEditorProps = {
  shaderName: keyof typeof EXAMPLE_SHADERS;
};

const _CompleteShaderEditor = ({ shaderName }: CompleteShaderEditorProps) => {
  const initialShader = EXAMPLE_SHADERS[shaderName] || defaultShader;
  return <ShaderEditor initialShader={initialShader} />;
};

import { FaCompressArrowsAlt, FaExpandArrowsAlt } from "@components/Icons";
import clsx from "clsx";
import mouseExample from "./shaders/mouseExample.glsl";
import shadertoyExample1 from "./shaders/shadertoyExample1.glsl";
import shadertoyExample2 from "./shaders/shadertoyExample2.glsl";
import textureExample from "./shaders/textureExample.glsl";
import timeExample from "./shaders/timeExample.glsl";

const EXAMPLE_SHADERS = {
  shadertoyExample1,
  shadertoyExample2,
  timeExample,
  mouseExample,
  textureExample,
};

export default _CompleteShaderEditor;
