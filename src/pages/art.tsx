import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
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
      <PageMain>
        <article className="mx-auto max-w-prose">
          <Header
            breadcrumbs={{ path: "art" }}
            title="Art & Drawings"
            subtitle="Drawings, studies, and visual experiments"
          />
          <p>
            This shelf is reserved for drawings, painting studies, and visual experiments. Until it
            fills up, the closest things live in the{" "}
            <Link href="/midjourney">Midjourney gallery</Link>, the{" "}
            <Link href="/r3f">3D playground</Link>, and the{" "}
            <Link href="/photography">photography archive</Link>.
          </p>
        </article>
      </PageMain>
    </Layout>
  );
}
