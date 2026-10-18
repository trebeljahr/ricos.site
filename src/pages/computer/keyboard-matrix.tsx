import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import dynamic from "next/dynamic";

const Demo = dynamic(
  () => import("@components/computer/KeyboardMatrixDemo").then((m) => m.KeyboardMatrixDemo),
  { ssr: false },
);
export default function InputDevicePage() {
  return (
    <Layout
      title="Build a keyboard matrix"
      description="Scan switches, compare ghosting and diode isolation, and interpret Shift with a controller."
      keywords={[]}
      url="computer/keyboard-matrix"
      noindex
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="keyboard-matrix" />
        <h1 className="my-6 text-3xl font-semibold tracking-tight">Build a keyboard matrix</h1>
        <Demo />
        <ComputerDemoNav current="keyboard-matrix" bottom />
      </main>
    </Layout>
  );
}
export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
