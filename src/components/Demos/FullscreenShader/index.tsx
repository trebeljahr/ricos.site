import dynamic from "next/dynamic";

// Client-only: the editor mounts CodeMirror and a WebGL canvas, and the SSR'd
// markup never matched the client's first render (the lazy chunk isn't
// preloaded before hydration), so both sides render the same placeholder.
export const CompleteShaderEditor = dynamic(import("./CompleteShaderEditorWithContext"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-[#0a0a0a] large-bleed border-4 border-[#0a0a0a]">
      <div className="h-[1024px] lg:h-full bg-gray-400" />
    </div>
  ),
});
