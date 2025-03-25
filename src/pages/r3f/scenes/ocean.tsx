import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import dynamic from "next/dynamic";
import tunnel from "tunnel-rat";

const WaterDemo = dynamic(
  () => import("src/canvas/Scenes/OceanDemo/WaterDemo"),
  {
    ssr: false,
  }
);

export const { In, Out } = tunnel();

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
      <Out />
      <CanvasWithKeyboardInput>
        <UnderwaterContextProvider>
          <WaterDemo />
        </UnderwaterContextProvider>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ocean Demo" } };
}
