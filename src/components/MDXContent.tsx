import { MDXRemote } from "next-mdx-remote";
import { MDXResult } from "src/@types";
import { CalloutBody, CalloutRoot, CalloutTitle } from "./Callouts";
import { AxisByAxis } from "./Demos/collisionDetection/AxisByAxis";
import { DotProductDemo } from "./Demos/collisionDetection/DotProductDemo";
import { EarClipping } from "./Demos/collisionDetection/EarClipping";
import { ExampleWith2Polygons } from "./Demos/collisionDetection/ExampleWith2Polygons";
import { MagnitudeDemo } from "./Demos/collisionDetection/MagnitudeDemo";
import { NormalDemo } from "./Demos/collisionDetection/NormalDemo";
import { PointAndVectorDemo } from "./Demos/collisionDetection/PointAndVectorDemo";
import { ProjectArrowDemo } from "./Demos/collisionDetection/ProjectArrowDemo";
import { ProjectionDemo } from "./Demos/collisionDetection/ProjectionDemo";
import { RotationDemo } from "./Demos/collisionDetection/RotationDemo";
import { SAT } from "./Demos/collisionDetection/SAT";
import { SATWithConcaveShapes } from "./Demos/collisionDetection/SATWithConcaveShapes";
import { SATWithResponse } from "./Demos/collisionDetection/SATWithResponse";
import { Triangulation } from "./Demos/collisionDetection/Triangulation";
import { UnitVectorDemo } from "./Demos/collisionDetection/UnitVectorDemo";
import { ThreeFiberDemo } from "./Demos/ThreeFiberDemo";
import { MdxGallery } from "./Galleries";
import { MarkdownRenderers } from "./MarkdownRenderers";
import { CompleteShaderEditor } from "./Demos/FullscreenShader/withContext/CompleteShaderEditorWithContext";

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
  ImageGallery: MdxGallery,
  ShaderEditor: CompleteShaderEditor,
  "callout-root": CalloutRoot,
  "callout-title": CalloutTitle,
  "callout-body": CalloutBody,
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
