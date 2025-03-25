import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import dynamic from "next/dynamic";

const ThirdPersonDemo = dynamic(() => import("@r3f/Scenes/ThirdPersonDemo"), {
  ssr: false,
});

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <ThirdPersonDemo />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Third Person Camera Demo" } };
}
