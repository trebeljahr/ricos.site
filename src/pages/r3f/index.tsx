import Layout from "@components/Layout";
import { PlaygroundSceneGrid } from "@components/Navbar/PlaygroundNav";
import Header, { PageMain } from "@components/PostHeader";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";

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
// context would be ~1MB of JS for nothing. It is a regular text page with the
// plain site navbar: the scene grid below already lists every demo, so the
// breadcrumb and scenes dropdown only appear on demo subpages.
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
    <Layout {...seoInfo}>
      <PageMain className="min-h-screen">
        <Header
          breadcrumbs={{
            path: "/r3f",
            overwrites: [{ matchingPath: "r3f", newText: "3D Playground" }],
          }}
          title="Welcome to my R3F Playground!"
        />
        <p className="max-w-2xl">
          Here is where I experiment with all things Three.js and React Three Fibre to learn those
          technologies, building out little demos, trying to improve my understanding so that I can
          one day build a complete 3D game in the browser. Pick a demo below.
        </p>
        <PlaygroundSceneGrid />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Index", seo: getSeoInfo("/r3f") } };
}
