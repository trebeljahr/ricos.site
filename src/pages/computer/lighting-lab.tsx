import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { LightingLab } from "@components/computer/LightingLab";
import Layout from "@components/Layout";

export default function LightingLabPage() {
  return (
    <Layout
      title="Light a surface, pixel by pixel"
      description="Change normals, lights and textures, and read one pixel's numbers."
      keywords={[]}
      url="computer/lighting-lab"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="lighting-lab" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            LIGHT AND TEXTURE
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <LightingLab />
        </div>
        <ComputerDemoNav current="lighting-lab" bottom />
      </main>
    </Layout>
  );
}
