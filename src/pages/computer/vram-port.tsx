import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function VramPortPage() {
  return <StepperDemoPage slug="vram-port" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
