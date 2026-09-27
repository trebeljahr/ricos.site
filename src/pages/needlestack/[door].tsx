/**
 * /needlestack/[door] — the paths behind one door.
 *
 * Every path in the door is listed, including the ones with nothing published
 * yet: the list of intents is itself the map, and a reader who sees "Start
 * meditating" knows what is coming even while it is empty. A door with no
 * needles at all is noindex, so an empty page cannot land in the sitemap or in
 * search results.
 */
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NeedleList } from "@components/Needlestack/NeedleList";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import type { PathSection } from "src/lib/needlestack/publicData";
import { DOOR_IDS, DOORS, type DoorId, doorById } from "src/lib/needlestack/taxonomy";

type Props = {
  seo: SeoInfo | null;
  door: { id: DoorId; title: string; blurb: string };
  sections: PathSection[];
  total: number;
};

export default function DoorPage({ seo, door, sections, total }: Props) {
  const url = `needlestack/${door.id}`;
  const others = DOORS.filter((other) => other.id !== door.id);

  return (
    <Layout
      title={seo?.metaTitle || `${door.title} – Needlestack`}
      description={seo?.metaDescription || door.blurb}
      image={seo?.ogImage || "/assets/midjourney/a-stack-of-needles.jpg"}
      imageAlt={seo?.ogImageAlt || "A stack of needles"}
      url={url}
      keywords={seo?.keywords || ["needlestack", door.title.toLowerCase()]}
      // An empty door is a promise, not a page worth indexing.
      noindex={total === 0}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Needlestack", url: "/needlestack" },
          { name: door.title, url: `/${url}` },
        ]}
      />
      <PageMain>
        <article>
          <Header breadcrumbs={{ path: url }} title={door.title} subtitle={door.blurb} />

          {total === 0 && (
            <p className="max-w-prose text-gray-600 dark:text-gray-300">
              Nothing behind this door is published yet. These are the paths it will hold.
            </p>
          )}

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-section scroll-mt-24">
              <h2 className="flush-top">{section.title}</h2>
              <p className="max-w-prose text-gray-600 dark:text-gray-300">{section.blurb}</p>
              {section.intro && <p className="max-w-prose">{section.intro}</p>}
              <div className="mt-group">
                <NeedleList needles={section.needles} empty="Nothing on this path yet." />
              </div>
            </section>
          ))}

          <nav aria-label="The other doors" className="mt-section">
            <h2>Other doors</h2>
            <ul className="not-prose flex flex-wrap gap-tight p-0">
              {others.map((other) => (
                <li key={other.id} className="list-none">
                  <Link
                    href={`/needlestack/${other.id}`}
                    className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 no-underline transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-para">
              Or rummage through <Link href="/needlestack/archive">the whole archive</Link>.
            </p>
          </nav>
        </article>

        <footer className="mt-section">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: DOOR_IDS.map((door) => ({ params: { door } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { door: string } }) {
  const door = doorById(params.door);
  if (!door) return { notFound: true } as const;

  const { loadDoorSections } = await import("src/lib/needlestack/publicData");
  const sections = await loadDoorSections(door.id);

  return {
    props: {
      seo: getSeoInfo(`/needlestack/${door.id}`),
      door: { id: door.id, title: door.title, blurb: door.blurb },
      sections,
      total: sections.reduce((sum, section) => sum + section.needles.length, 0),
    },
  };
}
