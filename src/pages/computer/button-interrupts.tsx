import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import dynamic from "next/dynamic";

const Demo = dynamic(
  () => import("@components/computer/ButtonInterruptDemo").then((m) => m.ButtonInterruptDemo),
  { ssr: false },
);
export default function InputDevicePage() {
  return (
    <Layout
      title="Build a button interrupt"
      description="Capture a button press, service it on the CPU, acknowledge it and return."
      keywords={[]}
      url="computer/button-interrupts"
      noindex
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="button-interrupts" />
        <h1 className="my-6 text-3xl font-semibold tracking-tight">Build a button interrupt</h1>
        <Demo />
        <ComputerDemoNav current="button-interrupts" bottom />
      </main>
    </Layout>
  );
}
export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
