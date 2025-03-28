import { cppLanguage } from "@codemirror/lang-cpp";
import { NavbarR3F } from "@components/dom/NavbarR3F";
import { SceneWithLoadingState } from "@components/dom/ThreeFiberLayout";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useState } from "react";
import { FullCanvasShader } from "./FullCanvasShader";

const defaultShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= u_resolution.x/u_resolution.y;

    vec3 color = vec3(0.);
    color = vec3(st.x,st.y,abs(sin(u_time)));

    gl_FragColor = vec4(color,1.0);
}
`;

export function SideBySideShaderEditor({
  initialCode = defaultShader,
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
      <NavbarR3F />
      <ReactCodeMirror
        value={value}
        height="100%"
        width="60vw"
        onChange={onChange}
        theme={vscodeDark}
        extensions={[cppLanguage]}
      />
      <div className="w-[40vw] h-[40vw]">
        <SceneWithLoadingState
          withKeyboardControls={false}
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
        </SceneWithLoadingState>
      </div>
    </div>
  );
}
