import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { canonicalizeTags, type Theme, themes } from "src/lib/themes/themesData";
import { byOnlyPublished } from "src/lib/utils/filters";
import { toTitleCase } from "src/lib/utils/toTitleCase";

type ItemCover = { src: string; alt: string; width: number; height: number } | null;

type Item = {
  link: string;
  title: string;
  contentType: string;
  date?: string;
  excerpt?: string;
  readingTime?: number;
  cover: ItemCover;
};

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
    <Link href={`/themes/${theme.slug}`} className="group block no-underline text-inherit">
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-colors hover:border-myBlue/60">
        <div className="relative aspect-[16/9] overflow-hidden">
          <ImageWithLoader
            src={theme.hero.src}
            alt={theme.hero.alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <h3 className="m-0 text-2xl font-semibold text-white">{theme.title}</h3>
            <p className="m-0 mt-1 text-sm text-white/85">{theme.oneliner}</p>
          </div>
        </div>
        <div className="p-5">
          <p className="m-0 mb-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {theme.count} {theme.count === 1 ? "piece" : "pieces"}
          </p>
          <ul className="m-0 list-none p-0 space-y-1.5">
            {theme.samples.map((s) => (
              <li
                key={s.link}
                className="truncate text-sm text-gray-700 transition-colors dark:text-gray-300 group-hover:text-myBlue"
              >
                {s.title}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </Link>
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
          className="text-myBlue no-underline transition-colors hover:underline"
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

function TagSectionRow({ item }: { item: Item }) {
  const meta: string[] = [];
  if (item.contentType) meta.push(item.contentType);
  if (item.readingTime) meta.push(`${item.readingTime} min`);
  if (item.date) meta.push(new Date(item.date).getFullYear().toString());
  return (
    <li className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      <Link
        href={item.link}
        className="group grid gap-4 py-4 no-underline text-inherit hover:text-myBlue sm:grid-cols-[5rem_1fr]"
      >
        <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
          {item.cover ? (
            <ImageWithLoader
              src={item.cover.src}
              alt={item.cover.alt}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {meta.join(" · ")}
          </div>
          <h4 className="m-0 text-base font-semibold text-gray-950 transition-colors group-hover:text-myBlue dark:text-white">
            {item.title}
          </h4>
          {item.excerpt && (
            <p className="m-0 mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
              {item.excerpt}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function CategoriesPage({ themes, tags, totalDocs, seo }: Props) {
  const url = "categories";
  return (
    <Layout
      title={seo?.metaTitle || "Categories – Themes and Tags"}
      description={
        seo?.metaDescription ||
        `Ten editorial themes Rico keeps returning to, plus ${tags.length} tags for diving deeper. ${totalDocs} pieces in all.`
      }
      url={url}
      keywords={seo?.keywords || themes.map((t) => t.title)}
      image={seo?.ogImage || "/assets/blog/network.jpg"}
      imageAlt={seo?.ogImageAlt || "a network of connected dots"}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section className="mb-14">
          <h1 className="mt-16!">Categories</h1>
          <p className="max-w-prose text-lg text-gray-600 dark:text-gray-400">
            {themes.length} editorial themes I keep returning to, plus {tags.length} tags for diving
            deeper — {totalDocs} pieces in all.
          </p>
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
                  <TagSectionRow key={item.link} item={item} />
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

type RawDoc = {
  title: string;
  link: string;
  contentType: string;
  date?: string;
  excerpt?: string;
  tags?: string;
  cover?: { src: string; alt: string; width: number; height: number };
  metadata?: { readingTime?: number };
  draft?: boolean;
  published?: boolean;
};

function toItem(doc: RawDoc): Item {
  return {
    link: doc.link,
    title: doc.title,
    contentType: doc.contentType,
    date: doc.date,
    excerpt: doc.excerpt,
    readingTime: doc.metadata?.readingTime,
    cover: doc.cover
      ? {
          src: doc.cover.src,
          alt: doc.cover.alt,
          width: doc.cover.width,
          height: doc.cover.height,
        }
      : null,
  };
}

function byDateDesc(a: Item, b: Item) {
  const ad = a.date ? Date.parse(a.date) : 0;
  const bd = b.date ? Date.parse(b.date) : 0;
  return bd - ad;
}

export async function getStaticProps() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const buckets: RawDoc[][] = [
    loadVeliteData("posts.json"),
    loadVeliteData("booknotes.json"),
    loadVeliteData("pages.json"),
    loadVeliteData("newsletters.json"),
    loadVeliteData("podcastnotes.json"),
    loadVeliteData("travelblogs.json"),
  ];
  const allDocs = buckets.flat().filter(byOnlyPublished);

  // Per-document canonical tags
  const docCanonicalTags = new Map<RawDoc, string[]>();
  for (const doc of allDocs) {
    docCanonicalTags.set(doc, canonicalizeTags(doc.tags));
  }

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

  // Build per-theme card
  const themeCards: ThemeCard[] = themes.map((theme) => {
    const tagSet = new Set(theme.tagMembers);
    const fallback = new Set(theme.contentTypeFallback ?? []);
    const matched: RawDoc[] = [];
    const seen = new Set<string>();
    for (const doc of allDocs) {
      const tags = docCanonicalTags.get(doc) ?? [];
      const hit = tags.some((t) => tagSet.has(t)) || fallback.has(doc.contentType);
      if (hit && !seen.has(doc.link)) {
        seen.add(doc.link);
        matched.push(doc);
      }
    }
    const items = matched.map(toItem).sort(byDateDesc);
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
