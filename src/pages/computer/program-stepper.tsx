import { StepperLevelPage } from "@components/computer/StepperLevelPage";

export default function ProgramStepperPage() {
  return <StepperLevelPage level="cpu" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
