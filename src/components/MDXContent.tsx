import dynamic from "next/dynamic";
import { MDXRemote } from "next-mdx-remote";
import { MDXResult } from "src/@types";
import { MarkdownRenderers } from "./MarkdownRenderers";

const UnitVectorDemo = dynamic(() => import("./Demos/collisionDetection/UnitVectorDemo").then(m => m.UnitVectorDemo), { ssr: false });
const ProjectArrowDemo = dynamic(() => import("./Demos/collisionDetection/ProjectArrowDemo").then(m => m.ProjectArrowDemo), { ssr: false });
const ProjectionDemo = dynamic(() => import("./Demos/collisionDetection/ProjectionDemo").then(m => m.ProjectionDemo), { ssr: false });
const ExampleWith2Polygons = dynamic(() => import("./Demos/collisionDetection/ExampleWith2Polygons").then(m => m.ExampleWith2Polygons), { ssr: false });
const AxisByAxis = dynamic(() => import("./Demos/collisionDetection/AxisByAxis").then(m => m.AxisByAxis), { ssr: false });
const SAT = dynamic(() => import("./Demos/collisionDetection/SAT").then(m => m.SAT), { ssr: false });
const SATWithResponse = dynamic(() => import("./Demos/collisionDetection/SATWithResponse").then(m => m.SATWithResponse), { ssr: false });
const SATWithConcaveShapes = dynamic(() => import("./Demos/collisionDetection/SATWithConcaveShapes").then(m => m.SATWithConcaveShapes), { ssr: false });
const EarClipping = dynamic(() => import("./Demos/collisionDetection/EarClipping").then(m => m.EarClipping), { ssr: false });
const PointAndVectorDemo = dynamic(() => import("./Demos/collisionDetection/PointAndVectorDemo").then(m => m.PointAndVectorDemo), { ssr: false });
const MagnitudeDemo = dynamic(() => import("./Demos/collisionDetection/MagnitudeDemo").then(m => m.MagnitudeDemo), { ssr: false });
const NormalDemo = dynamic(() => import("./Demos/collisionDetection/NormalDemo").then(m => m.NormalDemo), { ssr: false });
const RotationDemo = dynamic(() => import("./Demos/collisionDetection/RotationDemo").then(m => m.RotationDemo), { ssr: false });
const DotProductDemo = dynamic(() => import("./Demos/collisionDetection/DotProductDemo").then(m => m.DotProductDemo), { ssr: false });
const Triangulation = dynamic(() => import("./Demos/collisionDetection/Triangulation").then(m => m.Triangulation), { ssr: false });
const ThreeFiberDemo = dynamic(() => import("./Demos/ThreeFiberDemo").then(m => m.ThreeFiberDemo), { ssr: false });
const CompleteShaderEditor = dynamic(() => import("./Demos/FullscreenShader").then(m => m.CompleteShaderEditor), { ssr: false });

const allComponents = {
  UnitVectorDemo,
  ProjectArrowDemo,
  ProjectionDemo,
  ExampleWith2Polygons,
  AxisByAxis,
  SAT,
  SATWithResponse,
  SATWithConcaveShapes,
  EarClipping,
  PointAndVectorDemo,
  MagnitudeDemo,
  NormalDemo,
  RotationDemo,
  DotProductDemo,
  Triangulation,
  ThreeFiberDemo,
  ShaderEditor: CompleteShaderEditor,
};

interface MDXProps {
  source: MDXResult;
}

export const MDXContent = ({ source }: MDXProps) => {
  return (
    <MDXRemote
      {...source}
      components={{ ...allComponents, ...MarkdownRenderers }}
      lazy
    />
  );
};
