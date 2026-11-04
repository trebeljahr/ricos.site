import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNorXnorPage() {
  return (
    <DeviceDemoPage slug="universal-nor-xnor" description="Build XNOR using only NOR gates.">
      <LazyLogicTutorial
        title="XNOR from NOR"
        levels={["universal-nor-xnor"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
