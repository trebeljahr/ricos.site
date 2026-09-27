/**
 * /needlestack/archive — everything publishable, in one filterable list.
 *
 * The doors answer "what do I want"; this page is for rummaging. Filters are
 * built from the data that is actually published (see `archiveFacets`), so the
 * page never offers a chip that matches nothing, and it stays honest while the
 * archive is mostly still unreviewed.
 *
 * Filtering animates through the same view-transition helper as /quotes.
 */

import { chipClass, FilterChip } from "@components/FilterChip";
import { FiChevronDown, FiX } from "@components/Icons";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NeedleList } from "@components/Needlestack/NeedleList";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import clsx from "clsx";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { useListTransition } from "src/lib/listTransition";
import type { ArchiveFacets, ArchiveFilters, PublicNeedle } from "src/lib/needlestack/public";
import {
  archiveFacets,
  byRating,
  byRecent,
  matchesFilters,
  NO_FILTERS,
  pickRandom,
} from "src/lib/needlestack/public";

type Props = { seo: SeoInfo | null; needles: PublicNeedle[] };

type Sort = "rated" | "recent";

const RATING_LABEL: Record<number, string> = { 2: "good and up", 3: "front shelf" };

const ITEM_SELECTOR = "li[data-needle]";

/** A labelled row of chips. Rows with nothing to offer are not rendered. */
const FilterRow = ({
  label,
  children,
  hidden,
}: {
  label: string;
  children: React.ReactNode;
  hidden?: boolean;
}) =>
  hidden ? null : (
    <fieldset className="not-prose flex flex-wrap items-center gap-tight">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="mr-hair text-sm text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </fieldset>
  );

export default function ArchivePage({ seo, needles }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useListTransition<ArchiveFilters>(
    NO_FILTERS,
    listRef,
    ITEM_SELECTOR,
  );
  const [sort, setSort] = useListTransition<Sort>("rated", listRef, ITEM_SELECTOR);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [picked, setPicked] = useState<PublicNeedle | null>(null);

  const facets: ArchiveFacets = useMemo(() => archiveFacets(needles), [needles]);

  const displayed = useMemo(
    () =>
      needles
        .filter((needle) => matchesFilters(needle, filters))
        .sort(sort === "recent" ? byRecent : byRating),
    [needles, filters, sort],
  );

  const set = <K extends keyof ArchiveFilters>(key: K, value: ArchiveFilters[K]) =>
    setFilters({ ...filters, [key]: value });

  const toggle = <K extends keyof ArchiveFilters>(key: K, value: ArchiveFilters[K]) =>
    set(key, (filters[key] === value ? NO_FILTERS[key] : value) as ArchiveFilters[K]);

  const active =
    filters.topic !== null ||
    filters.type !== null ||
    filters.level !== null ||
    filters.time !== null ||
    filters.minRating !== NO_FILTERS.minRating;

  const pick = () => {
    const needle = pickRandom(displayed);
    setPicked(needle ?? null);
    if (!needle) return;
    document
      .getElementById(`needle-${needle.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const url = "needlestack/archive";

  return (
    <Layout
      title={seo?.metaTitle || "The needlestack archive"}
      description={
        seo?.metaDescription ||
        "Every link that made it into my needlestack, filterable by topic, type, level, time and rating."
      }
      image={seo?.ogImage || "/assets/midjourney/a-stack-of-needles.jpg"}
      imageAlt={seo?.ogImageAlt || "A stack of needles"}
      url={url}
      keywords={seo?.keywords || ["needlestack", "archive", "curated links"]}
      // Nothing published yet means nothing to index but a set of empty filters.
      noindex={needles.length === 0}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Needlestack", url: "/needlestack" },
          { name: "Archive", url: `/${url}` },
        ]}
      />
      <PageMain>
        <section>
          <Header
            breadcrumbs={{ path: url }}
            title="The archive"
            subtitle="Everything that made it through, in one list"
          />

          {needles.length === 0 ? (
            <div className="max-w-prose">
              <p>
                Nothing here yet. Every link is going through the archive one at a time, and only
                the ones I would vouch for come out the other side.
              </p>
              <p>
                In the meantime, the <Link href="/needlestack">six doors</Link> say what is coming,
                and <Link href="/needlestack/everything">the old page</Link> is the full list as it
                stood before the rewrite.
              </p>
            </div>
          ) : (
            <>
              <div className="not-prose flow-label mt-stack">
                <FilterRow label="Sort">
                  <FilterChip active={sort === "rated"} onClick={() => setSort("rated")}>
                    my order
                  </FilterChip>
                  <FilterChip active={sort === "recent"} onClick={() => setSort("recent")}>
                    recently added
                  </FilterChip>
                </FilterRow>

                <FilterRow label="Rating" hidden={facets.ratings.length === 0}>
                  {facets.ratings.map((floor) => (
                    <FilterChip
                      key={floor}
                      active={filters.minRating === floor}
                      onClick={() => toggle("minRating", floor)}
                    >
                      {RATING_LABEL[floor] ?? `${floor} and up`}
                    </FilterChip>
                  ))}
                </FilterRow>

                <FilterRow label="Kind" hidden={facets.types.length < 2}>
                  {facets.types.map((type) => (
                    <FilterChip
                      key={type}
                      active={filters.type === type}
                      onClick={() => toggle("type", type)}
                    >
                      {type}
                    </FilterChip>
                  ))}
                </FilterRow>

                <FilterRow label="Level" hidden={facets.levels.length < 2}>
                  {facets.levels.map((level) => (
                    <FilterChip
                      key={level}
                      active={filters.level === level}
                      onClick={() => toggle("level", level)}
                    >
                      {level}
                    </FilterChip>
                  ))}
                </FilterRow>

                <FilterRow label="Time" hidden={facets.times.length === 0}>
                  {facets.times.map(({ id, label }) => (
                    <FilterChip
                      key={id}
                      active={filters.time === id}
                      onClick={() => toggle("time", id)}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </FilterRow>

                <div className="flex flex-wrap items-center gap-tight">
                  <button
                    type="button"
                    aria-expanded={topicsOpen}
                    aria-controls="needle-topics"
                    onClick={() => setTopicsOpen((open) => !open)}
                    className={clsx(chipClass(false), "inline-flex items-center gap-1.5")}
                  >
                    Topics
                    <FiChevronDown
                      aria-hidden
                      className={clsx("transition-transform", topicsOpen && "rotate-180")}
                    />
                  </button>
                  {filters.topic && (
                    <button
                      type="button"
                      onClick={() => set("topic", null)}
                      aria-label={`Clear topic filter: ${filters.topic}`}
                      className={clsx(chipClass(true), "inline-flex items-center gap-1.5")}
                    >
                      {filters.topic}
                      <FiX aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={pick}
                    className={clsx(chipClass(false), "font-semibold")}
                  >
                    🎲 surprise me
                  </button>
                  {active && (
                    <button
                      type="button"
                      onClick={() => setFilters(NO_FILTERS)}
                      className={chipClass(false)}
                    >
                      clear filters
                    </button>
                  )}
                </div>

                {topicsOpen && (
                  <fieldset id="needle-topics" className="flex flex-wrap gap-tight">
                    <legend className="sr-only">Filter by topic</legend>
                    {facets.topics.map((topic) => (
                      <FilterChip
                        key={topic}
                        active={filters.topic === topic}
                        onClick={() => toggle("topic", topic)}
                      >
                        {topic}
                      </FilterChip>
                    ))}
                  </fieldset>
                )}
              </div>

              <p aria-live="polite" className="mt-para text-gray-600 dark:text-gray-300">
                {displayed.length} of {needles.length} needles
                {picked ? `. Picked: ${picked.title}.` : ""}
              </p>

              <div ref={listRef} className="mt-group">
                <NeedleList
                  needles={displayed}
                  highlightId={picked?.id ?? null}
                  empty="No needle matches all of that. Drop a filter."
                />
              </div>
            </>
          )}
        </section>

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
  return {
    props: { seo: getSeoInfo("/needlestack/archive"), needles: await loadPublicNeedles() },
  };
}
