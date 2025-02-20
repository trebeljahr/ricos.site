import { cppLanguage } from "@codemirror/lang-cpp";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback } from "react";
import { useEditorContext } from "./EditorContextProvider";

export const CodeEditor = () => {
  const { code, setCode, expanded } = useEditorContext();
  const onChange = useCallback(
    (val: string) => {
      setCode(val);
    },
    [setCode]
  );

  return (
    <ReactCodeMirror
      value={code}
      onChange={onChange}
      height={expanded ? "calc(100vh - 34px)" : "512px"}
      theme={vscodeDark}
      extensions={[cppLanguage]}
    />
  );
};
