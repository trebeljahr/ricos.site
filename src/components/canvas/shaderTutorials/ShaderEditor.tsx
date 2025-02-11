import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useState } from "react";
import { StreamLanguage } from "@codemirror/language";
import { csharp, csharpLanguage } from "@replit/codemirror-lang-csharp";
import { cppLanguage } from "@codemirror/lang-cpp";
import { vscodeLight, vscodeDark } from "@uiw/codemirror-theme-vscode";
import { FullCanvasShader } from "./FullCanvasShader";
import { Canvas } from "@react-three/fiber";

// import "codemirror/addon/search/search";
// import "codemirror/addon/search/searchcursor";
// import "codemirror/addon/comment/comment";
// import "codemirror/addon/dialog/dialog";
// import "codemirror/addon/edit/matchbrackets";
// import "codemirror/addon/edit/closebrackets";
// import "codemirror/addon/wrap/hardwrap";
// import "codemirror/addon/fold/foldcode";
// import "codemirror/addon/fold/foldgutter";
// import "codemirror/addon/fold/indent-fold";
// import "codemirror/addon/hint/show-hint";
// import "codemirror/addon/hint/javascript-hint";
// import "codemirror/addon/display/rulers";
// import "codemirror/addon/display/panel";
// import "codemirror/addon/hint/show-hint";
// import "codemirror/mode/clike/clike.js";
// import "codemirror/keymap/sublime";

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
      //   lang={csharpLanguage}
      //   extensions={[csharpLanguage]}
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
  //   console.log(key);

  return (
    <div className="flex h-full mt-10">
      <ReactCodeMirror
        value={value}
        height="100%"
        width="60vw"
        onChange={onChange}
        theme={vscodeDark}
        //   lang={csharpLanguage}
        //   extensions={[csharpLanguage]}
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
