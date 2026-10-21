import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SemiconductorDemo } from "@components/computer/SemiconductorDemo";
import Layout from "@components/Layout";

export default function SemiconductorPage() {
  return (
    <Layout
      title="From silicon to a transistor"
      description="Explore silicon bonding, doping, PN-junction bias and the difference between bipolar and field-effect transistors."
      keywords={[]}
      url="computer/semiconductor"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="semiconductor" />
        <h1 className="sr-only">From silicon to a transistor</h1>
        <p className="mt-8 text-sm text-gray-500">
          <code>{"<SemiconductorDemo />"}</code>
        </p>
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
