import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SkinningStrip } from "@components/computer/SkinningStrip";
import Layout from "@components/Layout";

export default function SkinningStripPage() {
  return (
    <Layout
      title="Bend a mesh with two bones"
      description="Each bone carries a copy of the mesh, and weights blend the copies."
      keywords={[]}
      url="computer/skinning"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="skinning" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            SKINNING
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <SkinningStrip />
        </div>
        <ComputerDemoNav current="skinning" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
