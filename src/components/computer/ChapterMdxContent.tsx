import { CompleteShaderEditor } from "@components/Demos/FullscreenShader";
import { ThreeFiberDemo } from "@components/Demos/ThreeFiberDemo";
import { MarkdownRenderers } from "@components/MarkdownRenderers";
import { getMDXComponent } from "mdx-bundler/client";
import dynamic from "next/dynamic";
import { type ComponentType, useMemo } from "react";
import type { MDXResult } from "src/@types";
import type { MdxDemoComponent } from "src/lib/mdxDemoComponents";
import { BooleanOperators } from "./BooleanOperators";
import { COMPUTER_MDX_DEMOS } from "./MdxComputerDemos";

// MDXContentWithDemos for a chapter, without the code of demos chapters do not
// use: the collision demos, and motion through the donation card. A chapter that
// embeds one still works, but the demo renders on the client only. This module
// is itself loaded with next/dynamic, and Turbopack lists only the first level
// of those in a page's HTML, so one rendered on the server here would not be
// loaded in time to hydrate. The collision demos share one `import()`, because
// Turbopack copies shared modules into each separate one.
const collisionDemo = (name: keyof typeof import("@components/Demos/collisionDetection")) =>
  dynamic(
    () =>
      import("@components/Demos/collisionDetection").then(
        (module) => module[name] as ComponentType,
      ),
    { ssr: false },
  );

const chapterComponents = {
  ...COMPUTER_MDX_DEMOS,
  BooleanOperators,
  UnitVectorDemo: collisionDemo("UnitVectorDemo"),
  ProjectArrowDemo: collisionDemo("ProjectArrowDemo"),
  ProjectionDemo: collisionDemo("ProjectionDemo"),
  ExampleWith2Polygons: collisionDemo("ExampleWith2Polygons"),
  AxisByAxis: collisionDemo("AxisByAxis"),
  SAT: collisionDemo("SAT"),
  SATWithResponse: collisionDemo("SATWithResponse"),
  SATWithConcaveShapes: collisionDemo("SATWithConcaveShapes"),
  EarClipping: collisionDemo("EarClipping"),
  PointAndVectorDemo: collisionDemo("PointAndVectorDemo"),
  MagnitudeDemo: collisionDemo("MagnitudeDemo"),
  NormalDemo: collisionDemo("NormalDemo"),
  RotationDemo: collisionDemo("RotationDemo"),
  DotProductDemo: collisionDemo("DotProductDemo"),
  Triangulation: collisionDemo("Triangulation"),
  ThreeFiberDemo,
  ShaderEditor: CompleteShaderEditor,
  // Inserted from Obsidian by the ricos-site-components plugin (src/scripts/obsidian).
  NewsletterForm: dynamic(
    () => import("@components/NewsletterForm").then((module) => module.NewsletterForm),
    { ssr: false },
  ),
  DonationStrip: dynamic(
    () => import("@components/DonationCard").then((module) => module.DonationStrip),
    { ssr: false },
  ),
  DonationCard: dynamic(
    () => import("@components/DonationCard").then((module) => module.DonationCard),
    { ssr: false },
  ),
} satisfies Record<MdxDemoComponent, unknown>;

export const ChapterMdxContent = ({ source }: { source: MDXResult }) => {
  const Component = useMemo(() => getMDXComponent(source.code), [source.code]);
  return <Component components={{ ...chapterComponents, ...MarkdownRenderers }} />;
};
