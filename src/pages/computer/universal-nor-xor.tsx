import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNorXorPage() {
  return (
    <DeviceDemoPage slug="universal-nor-xor" description="Build XOR using only NOR gates.">
      <LazyLogicTutorial
        title="XOR from NOR"
        levels={["universal-nor-xor"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
