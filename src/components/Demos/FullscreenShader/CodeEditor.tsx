import { cppLanguage } from "@codemirror/lang-cpp";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror, { EditorView, Prec } from "@uiw/react-codemirror";
import { useCallback } from "react";
import { useEditorContext } from "./EditorContextProvider";

const EDITOR_LABEL = EditorView.contentAttributes.of({ "aria-label": "Shader code" });
// The theme's line numbers are #838383 on #1e1e1e, 4.39:1.
const GUTTER_CONTRAST = Prec.highest(EditorView.theme({ ".cm-gutters": { color: "#8a8a8a" } }));

export const CodeEditor = () => {
  const { code, setCode, expanded } = useEditorContext();
  const onChange = useCallback(
    (val: string) => {
      setCode(val);
    },
    [setCode],
  );

  return (
    <ReactCodeMirror
      value={code}
      onChange={onChange}
      height={expanded ? "calc(100vh - 34px)" : "512px"}
      theme={vscodeDark}
      extensions={[cppLanguage, EDITOR_LABEL, GUTTER_CONTRAST]}
    />
  );
};
