import { BreadCrumbs } from "@components/BreadCrumbs";
import { ContentListRow } from "@components/ContentListRow";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import {
  canonicalTagsByDoc,
  type Item,
  itemsForTheme,
  loadThemeDocs,
} from "src/lib/themes/themeContent";
import { type Theme, themes } from "src/lib/themes/themesData";

type Props = {
  theme: Theme;
  items: Item[];
  seo: SeoInfo | null;
};

export default function ThemePage({ theme, items, seo }: Props) {
  const url = `themes/${theme.slug}`;

  return (
    <Layout
      title={seo?.metaTitle || `${theme.title} – Rico Trebeljahr`}
      description={seo?.metaDescription || `${theme.oneliner} ${items.length} pieces in all.`}
      url={url}
      image={seo?.ogImage || theme.hero.src}
      imageAlt={seo?.ogImageAlt || theme.hero.alt}
      keywords={seo?.keywords || theme.tagMembers.slice(0, 12)}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        {/* There is no /themes index — /categories is the list of themes. */}
        <BreadCrumbs
          path={url}
          overwrites={[{ matchingPath: "themes", alternateLink: "/categories" }]}
        />

        <section className="mb-12">
          <div className="not-prose relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl">
            <ImageWithLoader
              src={theme.hero.src}
              alt={theme.hero.alt}
              fill
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h1 className="m-0 text-3xl font-semibold text-white sm:text-4xl">{theme.title}</h1>
              <p className="m-0 mt-2 max-w-prose text-white/85">{theme.oneliner}</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {items.length} {items.length === 1 ? "piece" : "pieces"} in this theme. Browse{" "}
            <Link href="/categories">all themes and tags</Link>.
          </p>
        </section>

        <section aria-labelledby="pieces-heading">
          <h2 id="pieces-heading" className="sr-only">
            Everything in {theme.title}
          </h2>
          <ul className="not-prose m-0 list-none p-0">
            {items.map((item) => (
              <ContentListRow key={item.link} item={item} />
            ))}
          </ul>
        </section>

        <footer className="mt-20">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: themes.map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { slug: string } }): Promise<{
  props: Props;
}> {
  const theme = themes.find(({ slug }) => slug === params.slug);
  if (!theme) throw new Error(`Unknown theme: ${params.slug}`);

  const docs = await loadThemeDocs();
  const items = itemsForTheme(theme, docs, canonicalTagsByDoc(docs));

  return { props: { theme, items, seo: getSeoInfo(`/themes/${theme.slug}`) } };
}
