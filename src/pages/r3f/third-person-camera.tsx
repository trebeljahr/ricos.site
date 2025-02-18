import { CanvasWithControls } from "@components/canvas/Scene";
import { ThreeFiberLayout } from "@components/dom/Layout";
import dynamic from "next/dynamic";

const ThirdPersonDemo = dynamic(
  () => import("@components/canvas/ThirdPersonDemo"),
  { ssr: false }
);

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithControls>
        <ThirdPersonDemo />
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Third Person Camera Demo" } };
}
