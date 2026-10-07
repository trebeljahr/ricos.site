// Components an MDX page can use by name. A page whose text mentions one of
// them renders through MDXContentWithDemos, which must provide every name here
// (checked at compile time there); other pages use the lighter MDXContent.

export const MDX_DEMO_COMPONENTS = [
  "ByteExplorer",
  "FourByteExplorer",
  "UnitVectorDemo",
  "ProjectArrowDemo",
  "ProjectionDemo",
  "ExampleWith2Polygons",
  "AxisByAxis",
  "SAT",
  "SATWithResponse",
  "SATWithConcaveShapes",
  "EarClipping",
  "PointAndVectorDemo",
  "MagnitudeDemo",
  "NormalDemo",
  "RotationDemo",
  "DotProductDemo",
  "Triangulation",
  "ThreeFiberDemo",
  "ShaderEditor",
  "NewsletterForm",
  "DonationStrip",
  "DonationCard",
] as const;

export type MdxDemoComponent = (typeof MDX_DEMO_COMPONENTS)[number];
