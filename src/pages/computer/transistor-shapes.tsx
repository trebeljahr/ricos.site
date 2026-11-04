import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { TransistorAnatomy } from "@components/computer/TransistorAnatomy";

export default function TransistorShapesPage() {
  return (
    <DeviceDemoPage
      slug="transistor-shapes"
      description="Turn and slice a BJT, a planar MOSFET, a FinFET and a gate-all-around transistor."
    >
      <div className="mx-auto max-w-3xl">
        <TransistorAnatomy />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
