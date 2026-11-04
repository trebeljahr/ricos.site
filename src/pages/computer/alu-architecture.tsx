import { AluArchitectureComparison } from "@components/computer/AluArchitectureComparison";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function AluArchitecturePage() {
  return (
    <DeviceDemoPage slug="alu-architecture" description="Compare ways to build an ALU.">
      <AluArchitectureComparison />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
