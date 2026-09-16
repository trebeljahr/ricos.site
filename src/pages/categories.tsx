import { Card } from "@components/Card";
import { ContentListRow } from "@components/ContentListRow";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import {
  byDateDesc,
  canonicalTagsByDoc,
  type Item,
  itemsForTheme,
  loadThemeDocs,
  toItem,
} from "src/lib/themes/themeContent";
import { type Theme, themes } from "src/lib/themes/themesData";
import { toTitleCase } from "src/lib/utils/toTitleCase";

type TagEntry = { tag: string; items: Item[] };

type ThemeCard = {
  slug: string;
  title: string;
  oneliner: string;
  hero: Theme["hero"];
  count: number;
  samples: { title: string; link: string }[];
};

type Props = {
  themes: ThemeCard[];
  tags: TagEntry[];
  totalDocs: number;
  seo: SeoInfo | null;
};

function ThemeCardLink({ theme }: { theme: ThemeCard }) {
  return (
    <Card
      link={`/themes/${theme.slug}`}
      title={theme.title}
      subtitle={theme.oneliner}
      headingAs="h3"
      coverAspect="video"
      cover={theme.hero}
      // sm:grid-cols-2 gap-6 inside `max-w-5xl px-3`, so 488px at desktop.
      sizes="(max-width: 639px) calc(100vw - 24px), (max-width: 1024px) calc(50vw - 24px), 488px"
    >
      <p className="m-0 mt-4 mb-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {theme.count} {theme.count === 1 ? "piece" : "pieces"}
      </p>
      <ul className="m-0 list-none space-y-1.5 p-0">
        {theme.samples.map((s) => (
          <li key={s.link} className="truncate text-sm text-gray-700 dark:text-gray-300">
            {s.title}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TagCloud({ tags }: { tags: TagEntry[] }) {
  const counts = tags.map((t) => t.items.length);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const scale = (n: number) => {
    if (max === min) return 1;
    const t = (Math.log(n) - Math.log(min)) / (Math.log(max) - Math.log(min));
    return 0.85 + t * 0.95; // 0.85rem → 1.8rem
  };
  const sorted = [...tags].sort((a, b) => a.tag.localeCompare(b.tag));
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 leading-tight">
      {sorted.map(({ tag, items }) => (
        <Link
          key={tag}
          href={"#" + tag}
          style={{ fontSize: `${scale(items.length)}rem` }}
          className="text-accent no-underline transition-colors hover:underline"
        >
          {toTitleCase(tag)}
          <span className="ml-1 text-gray-400 dark:text-gray-500 text-xs align-baseline">
            {items.length}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function CategoriesPage({ themes, tags, totalDocs, seo }: Props) {
  const url = "categories";
  return (
    <Layout
      title={seo?.metaTitle || "Categories – Themes and Tags"}
      description={
        seo?.metaDescription ||
        `${themes.length} themes Rico keeps coming back to, plus ${tags.length} tags to browse by. ${totalDocs} pieces in all.`
      }
      url={url}
      keywords={seo?.keywords || themes.map((t) => t.title)}
      image={seo?.ogImage || "/assets/blog/network.jpg"}
      imageAlt={seo?.ogImageAlt || "a network of connected dots"}
    >
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <section className="mb-14">
          <Header
            breadcrumbs={{ path: url }}
            title="Categories"
            subtitle={`${themes.length} themes I keep coming back to, plus ${tags.length} tags to browse by. ${totalDocs} pieces in all.`}
          />
        </section>

        <section aria-labelledby="themes-heading" className="mb-24">
          <h2 id="themes-heading" className="sr-only">
            Themes
          </h2>
          <div className="not-prose grid grid-cols-1 gap-6 sm:grid-cols-2">
            {themes.map((theme) => (
              <ThemeCardLink key={theme.slug} theme={theme} />
            ))}
          </div>
        </section>

        <section aria-labelledby="cloud-heading" className="mb-16">
          <h2 id="cloud-heading">All tags</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {tags.length} canonical tags, sized by how often they show up. Click to jump down.
          </p>
          <div className="not-prose">
            <TagCloud tags={tags} />
          </div>
        </section>

        <section aria-labelledby="sections-heading" className="space-y-12">
          <h2 id="sections-heading" className="sr-only">
            Tag sections
          </h2>
          {tags.map(({ tag, items }) => (
            <div key={tag} id={tag} className="scroll-mt-24">
              <h3 className="mt-0 mb-4">
                {toTitleCase(tag)}{" "}
                <span className="text-gray-500 text-base font-normal">({items.length})</span>
              </h3>
              <ul className="not-prose m-0 list-none p-0">
                {items.map((item) => (
                  <ContentListRow key={item.link} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </section>

        <footer className="mt-20">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const allDocs = await loadThemeDocs();
  const docCanonicalTags = canonicalTagsByDoc(allDocs);

  // Build per-tag bucket
  const tagMap = new Map<string, Item[]>();
  for (const doc of allDocs) {
    const tags = docCanonicalTags.get(doc) ?? [];
    for (const t of tags) {
      if (!tagMap.has(t)) tagMap.set(t, []);
      tagMap.get(t)!.push(toItem(doc));
    }
  }

  const tagEntries: TagEntry[] = [...tagMap.entries()]
    .map(([tag, items]) => ({ tag, items: items.sort(byDateDesc) }))
    .sort((a, b) => b.items.length - a.items.length);

  // Build per-theme card. The full list behind each card lives at
  // /themes/[slug] and is built from the same itemsForTheme() call.
  const themeCards: ThemeCard[] = themes.map((theme) => {
    const items = itemsForTheme(theme, allDocs, docCanonicalTags);
    return {
      slug: theme.slug,
      title: theme.title,
      oneliner: theme.oneliner,
      hero: theme.hero,
      count: items.length,
      samples: items.slice(0, 3).map((i) => ({ title: i.title, link: i.link })),
    };
  });

  return {
    props: {
      themes: themeCards,
      tags: tagEntries,
      totalDocs: allDocs.length,
      seo: getSeoInfo("/categories"),
    },
  };
}
