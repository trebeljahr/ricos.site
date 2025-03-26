import { SceneWithLoadingState } from "src/canvas/Helpers/SceneLoader";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import dynamic from "next/dynamic";

const ThirdPersonDemo = dynamic(() => import("@r3f/Scenes/ThirdPersonDemo"), {
  ssr: false,
});

const seoInfo = {
  title: "A custom third person controller",
  description:
    "My first try of writing a custom third person controller in R3F, with a dinosaur model, gone a bit, uhm, wrong ^^",
  url: "/r3f/controllers/third-person-controller",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/r3f/third-person-controller.png",
  imageAlt: "a dinosaur Trex model in a 3D scene",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState>
        <ThirdPersonDemo />
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Third Person Camera Demo" } };
}
