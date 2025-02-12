import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { AxisByAxis } from "./collisionDetection/AxisByAxis";
import { DotProductDemo } from "./collisionDetection/DotProductDemo";
import { EarClipping } from "./collisionDetection/EarClipping";
import { ExampleWith2Polygons } from "./collisionDetection/ExampleWith2Polygons";
import { MagnitudeDemo } from "./collisionDetection/MagnitudeDemo";
import { NormalDemo } from "./collisionDetection/NormalDemo";
import { PointAndVectorDemo } from "./collisionDetection/PointAndVectorDemo";
import { ProjectArrowDemo } from "./collisionDetection/ProjectArrowDemo";
import { ProjectionDemo } from "./collisionDetection/ProjectionDemo";
import { RotationDemo } from "./collisionDetection/RotationDemo";
import { SAT } from "./collisionDetection/SAT";
import { SATWithConcaveShapes } from "./collisionDetection/SATWithConcaveShapes";
import { SATWithResponse } from "./collisionDetection/SATWithResponse";
import { Triangulation } from "./collisionDetection/Triangulation";
import { UnitVectorDemo } from "./collisionDetection/UnitVectorDemo";
import { MarkdownRenderers } from "./CustomRenderers";
import { ThreeFiberDemo } from "./Demos/ThreeFiberDemo";
import { MdxGallery } from "./Galleries";
import { MDXResult } from "src/@types";
import { CalloutBody, CalloutRoot, CalloutTitle } from "./Callouts";

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
