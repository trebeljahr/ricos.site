import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import dynamic from "next/dynamic";

const KeyboardMatrixDemo = dynamic(
  () => import("@components/computer/KeyboardMatrixDemo").then((m) => m.KeyboardMatrixDemo),
  { ssr: false },
);

const summary =
  "Scan switches, compare ghosting and diode isolation, and interpret Shift with a controller.";

export default function KeyboardMatrixPage() {
  return (
    <DeviceDemoPage slug="keyboard-matrix" description={summary} intro={summary}>
      <KeyboardMatrixDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
