import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { CoordinateSpaces } from "@components/computer/CoordinateSpaces";
import Layout from "@components/Layout";

export default function CoordinateSpacesPage() {
  return (
    <Layout
      title="Follow a corner from mesh to pixel"
      description="Follow one corner through every space to a pixel on the screen."
      keywords={[]}
      url="computer/coordinate-spaces"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="coordinate-spaces" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            FROM A MESH TO A PIXEL
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <CoordinateSpaces />
        </div>
        <ComputerDemoNav current="coordinate-spaces" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
