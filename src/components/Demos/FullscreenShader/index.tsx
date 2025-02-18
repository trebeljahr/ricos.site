import dynamic from "next/dynamic";

export const CompleteShaderEditor = dynamic(
  import("./CompleteShaderEditorWithContext")
);
