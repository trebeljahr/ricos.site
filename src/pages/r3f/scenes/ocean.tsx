import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import dynamic from "next/dynamic";

// Dynamically import the WaterDemo component with Suspense
const WaterDemo = dynamic(
  () => import("src/canvas/Scenes/OceanDemo/WaterDemo"),
  {
    ssr: false,
  }
);

const seoInfo = {
  title: "Ocean Demo",
  description:
    "An incomplete ocean/underwater game/demo, built with R3F and three.js",
  url: "/r3f/scenes/ocean",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/ocean.png",
  imageAlt: "3D render of low poly kelp and a whale swimming around the ocean",
};

export default function Page() {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <UnderwaterContextProvider>
        <WaterDemo />
      </UnderwaterContextProvider>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ocean Demo" } };
}
