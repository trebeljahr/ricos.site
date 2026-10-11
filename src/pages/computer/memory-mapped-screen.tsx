import { StepperLevelPage } from "@components/computer/StepperLevelPage";

export default function MemoryMappedScreenPage() {
  return <StepperLevelPage level="screen" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
