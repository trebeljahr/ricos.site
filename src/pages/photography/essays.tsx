import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";

export default function PhotographyEssaysPage() {
  return (
    <Layout
      title="Photography Essays"
      description="Longer photography essays and image-led stories by Rico Trebeljahr."
      url="photography/essays"
      image="/assets/blog/photography.png"
      imageAlt="an old film camera"
      keywords={["photography essays", "photo essays", "travel photography", "visual stories"]}
      noindex
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <BreadCrumbs path="photography/essays" />
          <Header title="Photography Essays" subtitle="Image-led stories and longer visual work" />
          <p>
            Photo essays will collect longer visual stories here. For now, browse the{" "}
            <Link href="/photography">galleries</Link> or read the{" "}
            <Link href="/travel">travel stories</Link>.
          </p>
        </article>
      </main>
    </Layout>
  );
}
