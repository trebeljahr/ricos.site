import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNorNotPage() {
  return (
    <DeviceDemoPage slug="universal-nor-not" description="Build NOT using only NOR gates.">
      <LazyLogicTutorial
        title="NOT from NOR"
        levels={["universal-nor-not"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
