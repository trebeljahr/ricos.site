import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function StackInRamPage() {
  return <StepperDemoPage slug="stack-in-ram" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
