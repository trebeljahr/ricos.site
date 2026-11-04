import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computerDemos, publicComputerDemos } from "src/lib/computerDemos";
import { dayKey } from "src/lib/computerSeries";
import {
  applyReview,
  countByStatus,
  type DemoReviews,
  NOTE_LIMIT,
  parseReviewFilter,
  REVIEW_LABELS,
  REVIEW_STATUSES,
  type ReviewFilter,
  type ReviewStatus,
  type ReviewUpdate,
  statusOf,
  visibleDemos,
} from "src/lib/demoReview";
import { REVIEW_FILE, readDemoReviews } from "src/lib/demoReviewStore";
import { clientAddresses, servesPrivateNotes, textsDir } from "src/lib/diaryStore";

// Which computer demos are good and which still need Rico. The list is
// computerDemos, so a new demo appears here by itself, not reviewed. Statuses and
// notes go to Notes/texts/demo-review.json through /api/dev/demo-review.
//
// Private: getServerSideProps 404s outside `next dev`, on Vercel and for any
// request from another machine.

type Demo = { slug: string; title: string; live: boolean };

type Props = { demos: Demo[]; reviews: DemoReviews; file: string };

const NOTE_SAVE_DELAY = 500;

const SELECTED: Record<ReviewStatus, string> = {
  unreviewed:
    "border-gray-500 bg-gray-200 text-gray-900 dark:border-gray-400 dark:bg-gray-700 dark:text-white",
  "needs-look":
    "border-sky-600 bg-sky-100 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-200",
  "needs-work":
    "border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-200",
  good: "border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200",
};

const IDLE =
  "border-gray-300 text-gray-600 hover:border-cyan-500 hover:text-cyan-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-cyan-400 dark:hover:text-cyan-300";

const BUTTON =
  "inline-flex min-h-10 items-center rounded border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";

function NoteField({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial: string;
  onSave: (note: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current === null) return;
    onSave(pending.current);
    pending.current = null;
  }, [onSave]);

  // A filter change unmounts the row and a closing tab fires no blur: both still save.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return (
    <textarea
      aria-label={`Note on ${title}`}
      className="mt-label block min-h-10 w-full resize-none rounded border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 field-sizing-content placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
      maxLength={NOTE_LIMIT}
      onBlur={flush}
      onChange={(event) => {
        setDraft(event.target.value);
        pending.current = event.target.value;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, NOTE_SAVE_DELAY);
      }}
      placeholder="Note"
      rows={1}
      value={draft}
    />
  );
}

function DemoRow({
  demo,
  number,
  status,
  note,
  updated,
  onChange,
}: {
  demo: Demo;
  number: number;
  status: ReviewStatus;
  note: string;
  updated?: string;
  onChange: (slug: string, update: ReviewUpdate) => void;
}) {
  const saveNote = useCallback(
    (next: string) => onChange(demo.slug, { note: next }),
    [demo.slug, onChange],
  );

  return (
    <li className="grid gap-label border-b border-gray-300 py-para md:grid-cols-[3rem_1fr] dark:border-gray-700">
      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
        {String(number).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-stack gap-y-hair">
          <Link
            className="text-lg font-semibold text-gray-950 hover:text-cyan-700 dark:text-white dark:hover:text-cyan-300"
            href={`/computer/${demo.slug}`}
            rel="noopener"
            target="_blank"
          >
            {demo.title} <span aria-hidden="true">↗</span>
          </Link>
          {demo.live && (
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Live
            </span>
          )}
          {updated && (
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{updated}</span>
          )}
        </div>
        <fieldset className="mt-label flex flex-wrap gap-tight">
          <legend className="sr-only">Status of {demo.title}</legend>
          {REVIEW_STATUSES.map((option) => (
            <button
              aria-pressed={status === option}
              className={clsx(BUTTON, status === option ? SELECTED[option] : IDLE)}
              key={option}
              onClick={() => onChange(demo.slug, { status: option })}
              type="button"
            >
              {REVIEW_LABELS[option]}
            </button>
          ))}
        </fieldset>
        <NoteField initial={note} onSave={saveNote} title={demo.title} />
      </div>
    </li>
  );
}

export default function DemoReviewPage({ demos, reviews: initial, file }: Props) {
  const router = useRouter();
  const filter = parseReviewFilter(router.query.status);
  const [reviews, setReviews] = useState(initial);
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());

  const slugs = useMemo(() => demos.map((demo) => demo.slug), [demos]);
  const counts = countByStatus(slugs, reviews);
  const rows = visibleDemos(demos, reviews, filter, kept);

  const change = useCallback((slug: string, update: ReviewUpdate) => {
    setReviews((current) => applyReview(current, slug, update, dayKey(new Date())));
    if (update.status) setKept((current) => new Set(current).add(slug));
    // One at a time, so an older save can never land after a newer one.
    queue.current = queue.current.then(async () => {
      try {
        const response = await fetch("/api/dev/demo-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...update }),
          keepalive: true,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setSaveError(null);
      } catch (error) {
        setSaveError(`${slug}: ${String(error)}`);
      }
    });
  }, []);

  const pickFilter = (next: ReviewFilter) => {
    setKept(new Set());
    router.replace(
      { pathname: router.pathname, query: next === "all" ? {} : { status: next } },
      undefined,
      { shallow: true, scroll: false },
    );
  };

  return (
    <Layout
      description="Which computer demos are good and which still need work."
      keywords={[]}
      noindex
      title="Demo review"
      url="dev/demo-review"
    >
      <PageMain>
        <Header
          subtitle={<code className="break-words text-sm">{file}</code>}
          title="Demo review"
        />
        <div className="not-prose">
          <fieldset className="flex flex-wrap gap-tight">
            <legend className="sr-only">Filter by status</legend>
            {(["all", ...REVIEW_STATUSES] as const).map((option) => (
              <button
                aria-pressed={filter === option}
                className={clsx(
                  BUTTON,
                  filter !== option
                    ? IDLE
                    : option === "all"
                      ? SELECTED.unreviewed
                      : SELECTED[option],
                )}
                key={option}
                onClick={() => pickFilter(option)}
                type="button"
              >
                {option === "all" ? "All" : REVIEW_LABELS[option]}
                <span className="ml-tight font-mono text-xs">{counts[option]}</span>
              </button>
            ))}
          </fieldset>
          {saveError && (
            <p className="mt-stack text-sm font-medium text-red-700 dark:text-red-300" role="alert">
              Not saved: {saveError}
            </p>
          )}
          <ol className="mt-para list-none border-t border-gray-300 p-0 dark:border-gray-700">
            {rows.map((demo) => (
              <DemoRow
                demo={demo}
                key={demo.slug}
                note={reviews[demo.slug]?.note ?? ""}
                number={slugs.indexOf(demo.slug) + 1}
                onChange={change}
                status={statusOf(reviews, demo.slug)}
                updated={reviews[demo.slug]?.updated}
              />
            ))}
          </ol>
          {rows.length === 0 && (
            <p className="py-group text-gray-500 dark:text-gray-400">No demos with this status.</p>
          )}
        </div>
      </PageMain>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  // First and literal: the production build inlines NODE_ENV, so everything
  // below is dead code there and the deployed route is a plain 404.
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  if (!servesPrivateNotes(process.env, clientAddresses(req))) return { notFound: true };

  const live = new Set<string>(publicComputerDemos.map(({ slug }) => slug));
  return {
    props: {
      demos: computerDemos.map(({ slug, title }) => ({ slug, title, live: live.has(slug) })),
      reviews: readDemoReviews(),
      file: `${textsDir()}/${REVIEW_FILE}`,
    },
  };
};
