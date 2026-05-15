import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";

export default function ArtPage() {
  return (
    <Layout
      title="Art & Drawings"
      description="Drawings, painting studies, and visual experiments by Rico Trebeljahr."
      url="art"
      image="/assets/midjourney/pattern-of-swirling-lights.jpg"
      imageAlt="a pattern of swirling lights"
      keywords={["art", "drawings", "painting", "visual experiments"]}
      noindex
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <BreadCrumbs path="art" />
          <Header title="Art & Drawings" subtitle="Drawings, studies, and visual experiments" />
          <p>
            This shelf is reserved for drawings, painting studies, and visual experiments. Until it
            fills up, the closest things live in the{" "}
            <Link href="/midjourney">Midjourney gallery</Link>, the{" "}
            <Link href="/r3f">3D playground</Link>, and the{" "}
            <Link href="/photography">photography archive</Link>.
          </p>
        </article>
      </main>
    </Layout>
  );
}
