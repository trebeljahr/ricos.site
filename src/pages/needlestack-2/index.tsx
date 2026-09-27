/**
 * /needlestack-2 — the front of the rewritten stack.
 *
 * The old page was one list of ~490 links grouped by format, which only helps
 * someone who already knows what they want. This one asks the reader what they
 * are after instead: six doors, and behind each a handful of paths. What the
 * page shows of the archive itself is small on purpose — the highest-rated
 * needles Rico wrote something about.
 *
 * It lives beside the old page, which stays untouched at /needlestack (the
 * markdown through src/pages/[id].tsx, haystack egg included) until these
 * pages carry the same links.
 */
import { Card } from "@components/Card";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NeedleCard } from "@components/Needlestack/NeedleCard";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import type { DoorCount, PublicNeedle } from "src/lib/needlestack/public";
import { DOORS, type DoorId } from "src/lib/needlestack/taxonomy";

type Props = {
  seo: SeoInfo | null;
  shelf: PublicNeedle[];
  counts: Record<DoorId, DoorCount>;
  total: number;
};

const countLine = ({ needles, paths }: DoorCount) => {
  if (needles === 0) return "Still being sorted.";
  const things = `${needles} needle${needles === 1 ? "" : "s"}`;
  const ways = `${paths} path${paths === 1 ? "" : "s"}`;
  return paths === 0 ? things : `${things} on ${ways}`;
};

export default function NeedlestackPage({ seo, shelf, counts, total }: Props) {
  const url = "needlestack-2";

  return (
    <Layout
      title={seo?.metaTitle || "Needlestack - the best things I found on the internet"}
      description={
        seo?.metaDescription ||
        "A personal, curated collection of the best things I found on the internet, sorted by what you want from them."
      }
      image={seo?.ogImage || "/assets/midjourney/a-stack-of-needles.jpg"}
      imageAlt={seo?.ogImageAlt || "A stack of needles"}
      url={url}
      keywords={seo?.keywords || ["needlestack", "curated links", "best of internet"]}
      // /needlestack is the indexed page on this subject until the rewrite has
      // something published; an empty hub would only compete with it.
      noindex={total === 0}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Needlestack 2", url: "/needlestack-2" },
        ]}
      />
      <PageMain>
        <article>
          <Header
            breadcrumbs={{ path: url }}
            title="Needlestack"
            subtitle="Gathering the awesomeness of the internet"
          />

          <div className="max-w-prose">
            <p>
              The internet is a giant haystack of content and information. Most of it is useless
              hay. But among the hay are some beautiful nuggets of information – literal needles in
              a haystack. Collecting those over time leads to a stack of useful things: a
              needlestack.
            </p>
            <p>
              So a needlestack is a personal, curated collection of needles that somebody found on
              the internet. Needles they are glad to have found. Needles they want to share. Needles
              that were carefully sifted from the hay.
            </p>
            <p>
              This site is <em>my</em> needlestack, and it reflects the parts of the internet that{" "}
              <em>I love</em>. People are different, so it might not be of use to you. Enjoy
              browsing, and don&apos;t get overwhelmed – even a stack of needles can be quite big.
            </p>
            <p>
              The idea of collecting information in this format, and the name, are not mine. I found
              both on the blog of Ethan Maurice and loved them so much that I had to make my own
              list of awesomeness.{" "}
              <a href="https://ethanmaurice.com/needlestack" target="_blank" rel="noreferrer">
                Here is his
              </a>
              , in case you are curious.
            </p>
            <p>
              Pick a door below. Each one holds a few paths, and a path is an ordered list with my
              notes on why each thing is there. If you would rather rummage, the{" "}
              <Link href="/needlestack-2/archive">archive</Link> holds everything at once, with
              filters and a button that picks for you.
            </p>
          </div>

          {shelf.length > 0 && (
            <section className="mt-section">
              <h2>The front shelf</h2>
              <p className="max-w-prose text-gray-600 dark:text-gray-300">
                The ones I would hand you first.
              </p>
              <div className="not-prose mt-group grid grid-cols-1 gap-para md:grid-cols-2 lg:grid-cols-3">
                {shelf.map((needle) => (
                  <NeedleCard key={needle.id} needle={needle} layout="vertical" />
                ))}
              </div>
            </section>
          )}

          <section className="mt-section">
            <h2>Six doors</h2>
            <p className="max-w-prose text-gray-600 dark:text-gray-300">
              What do you want right now?
            </p>
            <div className="not-prose mt-group grid grid-cols-1 gap-para md:grid-cols-2">
              {DOORS.map((door) => (
                <Card
                  key={door.id}
                  link={`/needlestack-2/${door.id}`}
                  title={door.title}
                  excerpt={door.blurb}
                  headingAs="h3"
                >
                  <p className="mt-label text-sm text-gray-500 dark:text-gray-400">
                    {countLine(counts[door.id])}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-section max-w-prose">
            <h2>Everything at once</h2>
            <p>
              {total === 0
                ? "The archive is being re-sorted link by link, so the paths above fill up slowly. Nothing is published from it yet."
                : `The ${total} needles that made it through, filterable by topic, type, level, time and how highly I rate them.`}{" "}
              <Link href="/needlestack-2/archive">Open the archive</Link>, or read{" "}
              <Link href="/needlestack">the old page</Link>, which is the whole list as it stood
              before this rewrite.
            </p>
          </section>
        </article>

        <footer className="mt-section">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadPublicNeedles } = await import("src/lib/needlestack/publicData");
  const { countForDoor, frontShelf } = await import("src/lib/needlestack/public");
  const needles = await loadPublicNeedles();

  const counts = Object.fromEntries(
    DOORS.map((door) => [door.id, countForDoor(needles, door.id)]),
  ) as Record<DoorId, DoorCount>;

  return {
    props: {
      seo: getSeoInfo("/needlestack-2"),
      shelf: frontShelf(needles, 6),
      counts,
      total: needles.length,
    },
  };
}
