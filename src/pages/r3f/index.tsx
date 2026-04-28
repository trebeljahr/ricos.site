import { Meta } from "@components/Meta";
import { OpenGraph } from "@components/OpenGraph";
import { NavbarR3F } from "@components/dom/NavbarR3F";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";
import { toTitleCase } from "src/lib/utils/toTitleCase";

const defaultSeoInfo = {
  title: "Rico's R3F Playground",
  description:
    "Welcome to my R3F Playground! It's where I experiment with all things Three.js and React Three Fibre to learn those technologies, building out little demos, trying to improve my understanding",
  url: "/r3f",
  keywords: ["threejs", "react-three-fiber", "r3f", "3D", "programming", "graphics", "webgl"],
  image: "/assets/pages/r3f.png",
  imageAlt: "image of a 3D playground",
};

// Index page intentionally avoids ThreeFiberLayout: there's no scene to
// render here, so loading three.js + @react-three/fiber and starting a WebGL
// context would be ~1MB of JS for nothing. Demo subpages keep using the
// full layout.
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
  const properTitle = toTitleCase(seoInfo.title);

  return (
    <>
      <Meta
        description={seoInfo.description}
        title={properTitle}
        url={seoInfo.url}
        keywords={seoInfo.keywords}
      />
      <OpenGraph
        title={properTitle}
        description={seoInfo.description}
        url={seoInfo.url}
        image={seoInfo.image}
        imageAlt={seoInfo.imageAlt}
      />
      <NavbarR3F />
      <main className="w-full min-h-screen">
        <div className="flex-col items-center justify-center m-auto mt-10 max-w-2xl px-4">
          <h1>Welcome to my R3F Playground!</h1>
          <p>
            Here is where I experiment with all things Three.js and React Three Fibre to learn those
            technologies, building out little demos, trying to improve my understanding so that I
            can one day build a complete 3D game in the browser. You can check out the demos in the
            side panel.
          </p>
        </div>
      </main>
    </>
  );
}

export async function getStaticProps() {
  return { props: { title: "Index", seo: getSeoInfo("/r3f") } };
}
