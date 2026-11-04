import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import dynamic from "next/dynamic";

const KeyboardMatrixDemo = dynamic(
  () => import("@components/computer/KeyboardMatrixDemo").then((m) => m.KeyboardMatrixDemo),
  { ssr: false },
);

const summary =
  "Type on a keyboard wired up key by key, and watch its scan write your text into memory.";

export default function KeyboardMatrixPage() {
  return (
    <DeviceDemoPage slug="keyboard-matrix" description={summary}>
      <KeyboardMatrixDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
