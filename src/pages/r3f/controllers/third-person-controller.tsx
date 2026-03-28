import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import dynamic from "next/dynamic";
import { SeoInfo } from "src/lib/getSeoInfo";

const ThirdPersonDemo = dynamic(() => import("@r3f/Scenes/ThirdPersonDemo"), {
  ssr: false,
});

const defaultSeoInfo = {
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

export default function Page({ seo }: { seo: SeoInfo | null }) {
  const seoInfo = {
    ...defaultSeoInfo,
    ...(seo && {
      title: seo.metaTitle,
      description: seo.metaDescription,
      image: seo.ogImage,
      imageAlt: seo.ogImageAlt,
      keywords: seo.keywords,
    }),
  };
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <ThirdPersonDemo />
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  const { getSeoInfo } = require("src/lib/getSeoInfo");
  return { props: { title: "Third Person Camera Demo", seo: getSeoInfo("/r3f/controllers/third-person-controller") } };
}
