import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { MarkdownRenderers } from "./CustomRenderers";
import { ThreeFiberDemo } from "./Demo";
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
import { NiceGallery, SimpleGallery } from "./NiceGallery";

const allComponents = {
  ThreeFiberDemo,
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
  NiceGallery,
  SimpleGallery,
};

interface MDXProps {
  source: Awaited<ReturnType<typeof serialize>>;
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
