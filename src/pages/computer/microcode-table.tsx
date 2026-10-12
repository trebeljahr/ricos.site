import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function MicrocodeTablePage() {
  return <StepperDemoPage slug="microcode-table" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
