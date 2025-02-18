import {
  Panel,
  PanelGroup,
  PanelOnCollapse,
  PanelResizeHandle,
} from "react-resizable-panels";
import { CodeEditor } from "../withContext/CodeEditor";
import { EditorContextProvider } from "../withContext/EditorContextProvider";
import { FullCanvasShader } from "../withContext/FullCanvasShader";
import initialShader from "../withContext/shaders/fragmentShader.glsl";
import { TextureUploadUI } from "../withContext/TextureUploadUI";

export function CompleteShaderEditor() {
  const onCollapse: PanelOnCollapse = () => {
    console.log("hello");
  };

  return (
    <EditorContextProvider initialCode={initialShader}>
      <div className="relative large-bleed">
        <PanelGroup direction="horizontal">
          <Panel
            collapsible={true}
            collapsedSize={0}
            minSize={10}
            onCollapse={onCollapse}
            defaultSize={70}
          >
            <CodeEditor />
          </Panel>
          <PanelResizeHandle className="w-1 " />
          <Panel>
            <PanelGroup direction="vertical">
              <Panel>
                <FullCanvasShader />
              </Panel>

              <PanelResizeHandle className="h-1" />
              <Panel></Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>

        <TextureUploadUI />
      </div>
    </EditorContextProvider>
  );
}
