import { getMDXComponent } from "mdx-bundler/client";
import React from "react";
import * as runtime from "react/jsx-runtime";
import { MarkdownRenderers } from "./CustomRenderers";

const useMDXComponent = (code: string) => {
  const fn = new Function(code);
  return fn({ ...runtime }).default;
};

import { ThreeFiberDemo } from "./Demo";
import { UnitVectorDemo } from "./collisionDetection/UnitVectorDemo";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { ProjectArrowDemo } from "./collisionDetection/ProjectArrowDemo";
import { ProjectionDemo } from "./collisionDetection/ProjectionDemo";
import { ExampleWith2Polygons } from "./collisionDetection/ExampleWith2Polygons";
import { AxisByAxis } from "./collisionDetection/AxisByAxis";
import { SAT } from "./collisionDetection/SAT";
import { SATWithResponse } from "./collisionDetection/SATWithResponse";
import { SATWithConcaveShapes } from "./collisionDetection/SATWithConcaveShapes";
import { EarClipping } from "./collisionDetection/EarClipping";
import { PointAndVectorDemo } from "./collisionDetection/PointAndVectorDemo";
import { MagnitudeDemo } from "./collisionDetection/MagnitudeDemo";
import { NormalDemo } from "./collisionDetection/NormalDemo";
import { RotationDemo } from "./collisionDetection/RotationDemo";
import { DotProductDemo } from "./collisionDetection/DotProductDemo";
import { Triangulation } from "./collisionDetection/Triangulation";

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
