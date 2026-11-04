import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { TriangleRaster } from "@components/computer/TriangleRaster";
import Layout from "@components/Layout";

export default function TriangleRasterPage() {
  return (
    <Layout
      title="Fill in a triangle, pixel by pixel"
      description="Watch each pixel get tested against a triangle, then against the depth buffer."
      keywords={[]}
      url="computer/triangle-raster"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="triangle-raster" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            FILLING IN A TRIANGLE
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <TriangleRaster />
        </div>
        <ComputerDemoNav current="triangle-raster" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
