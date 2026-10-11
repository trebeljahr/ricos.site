import { StepperLevelPage } from "@components/computer/StepperLevelPage";

export default function KeyInterruptsPage() {
  return <StepperLevelPage level="interrupts" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
