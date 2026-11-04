import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNandXorPage() {
  return (
    <DeviceDemoPage wide slug="universal-nand-xor" description="Build XOR using only NAND gates.">
      <LazyLogicTutorial
        title="XOR from NAND"
        levels={["universal-nand-xor"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
