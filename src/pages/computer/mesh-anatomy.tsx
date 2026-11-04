import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { MeshAnatomy } from "@components/computer/MeshAnatomy";
import Layout from "@components/Layout";

export default function MeshAnatomyPage() {
  return (
    <Layout
      title="Take a 3D mesh apart"
      description="Read a mesh's corners, triangles and bytes, and move them."
      keywords={[]}
      url="computer/mesh-anatomy"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="mesh-anatomy" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            INSIDE A MESH
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <MeshAnatomy />
        </div>
        <ComputerDemoNav current="mesh-anatomy" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
