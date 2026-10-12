import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function ProgramStepperPage() {
  return <StepperDemoPage slug="program-stepper" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
