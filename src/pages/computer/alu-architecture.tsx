import { AluArchitectureComparison } from "@components/computer/AluDemos";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function AluArchitecturePage() {
  return (
    <DeviceDemoPage
      slug="alu-architecture"
      description="A whole 4-bit ALU: an adder, AND, OR, a result selector and flags."
      wide
    >
      <AluArchitectureComparison />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
