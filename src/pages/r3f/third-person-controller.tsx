import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import dynamic from "next/dynamic";

const ThirdPersonDemo = dynamic(() => import("@r3f/Scenes/ThirdPersonDemo"), {
  ssr: false,
});

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <ThirdPersonDemo />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Third Person Camera Demo" } };
}
