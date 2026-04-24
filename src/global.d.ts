// Re-export JSX namespace globally for React 19 compatibility
// React 19 moved JSX from global to the 'react' module.
// This restores global access for gltfjsx-generated model files (390+ files).
import type { JSX } from "react";
export type { JSX };
declare global {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

// R3F 9 removed GroupProps/Object3DProps exports — provide compat aliases
declare module "@react-three/fiber" {
  type GroupProps = JSX.IntrinsicElements["group"];
  type Object3DProps = JSX.IntrinsicElements["object3D"];
}
