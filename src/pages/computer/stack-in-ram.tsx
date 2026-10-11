import { StepperLevelPage } from "@components/computer/StepperLevelPage";

export default function StackInRamPage() {
  return <StepperLevelPage level="ramStack" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
