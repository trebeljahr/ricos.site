import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";

export default function PhotographyPrintsPage() {
  return (
    <Layout
      title="Photography Prints"
      description="Photography prints by Rico Trebeljahr."
      url="photography/prints"
      image="/assets/blog/photography.png"
      imageAlt="an old film camera"
      keywords={["photography prints", "photo prints", "travel photography", "wall art"]}
      noindex
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <BreadCrumbs path="photography/prints" />
          <Header title="Photography Prints" subtitle="Selected photographs for walls and rooms" />
          <p>
            Prints will live here once the shop flow is ready. For now, start with the{" "}
            <Link href="/photography/best-of">best-of gallery</Link> or the full{" "}
            <Link href="/photography">photography archive</Link>.
          </p>
        </article>
      </main>
    </Layout>
  );
}
