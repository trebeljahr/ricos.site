import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import dynamic from "next/dynamic";

const ButtonInterruptDemo = dynamic(
  () => import("@components/computer/ButtonInterruptDemo").then((m) => m.ButtonInterruptDemo),
  { ssr: false },
);

const summary = "Capture a button press, service it on the CPU, acknowledge it and return.";

export default function ButtonInterruptsPage() {
  return (
    <DeviceDemoPage slug="button-interrupts" description={summary} intro={summary}>
      <ButtonInterruptDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
