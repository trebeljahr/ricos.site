import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SemiconductorDemo } from "@components/computer/SemiconductorDemo";
import Layout from "@components/Layout";

export default function SemiconductorPage() {
  return (
    <Layout
      title="From silicon to a transistor"
      description="Explore crystal doping, silicon and germanium, junctions, transistor operation and real transistor packages."
      keywords={[]}
      url="computer/semiconductor"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="semiconductor" />
        <h1 className="sr-only">From silicon to a transistor</h1>
        <SemiconductorDemo />
        <ComputerDemoNav current="semiconductor" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
