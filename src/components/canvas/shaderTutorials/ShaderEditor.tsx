import { cppLanguage } from "@codemirror/lang-cpp";
import { Canvas } from "@react-three/fiber";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useState } from "react";
import { FullCanvasShader } from "./FullCanvasShader";

export function CodeEditor({ code }: { code: string }) {
  const [value, setValue] = useState(code);
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);

  return (
    <ReactCodeMirror
      value={value}
      height="200px"
      width="50%"
      className={"pt-10"}
      onChange={onChange}
      theme={vscodeDark}
      extensions={[cppLanguage]}
    />
  );
}

export function SideBySideShaderEditor({
  initialCode,
}: {
  initialCode: string;
}) {
  const [value, setValue] = useState(initialCode);
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);

  const key = Math.random();

  return (
    <div className="flex h-full mt-10">
      <ReactCodeMirror
        value={value}
        height="100%"
        width="60vw"
        onChange={onChange}
        theme={vscodeDark}
        extensions={[cppLanguage]}
      />
      <div className="w-[40vw] h-[40vw]">
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
          <FullCanvasShader key={key} fragmentShader={value} />
        </Canvas>
      </div>
    </div>
  );
}
