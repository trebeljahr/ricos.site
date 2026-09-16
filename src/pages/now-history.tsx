import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MarkdownRenderers } from "@components/MarkdownRenderers";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { getMDXComponent } from "mdx-bundler/client";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  value: string;
};

type NowEntry = {
  date: string; // ISO yyyy-mm-dd, from the filename
  label: string; // e.g. "2 April 2026", formatted at build time so server and client match
  content: { code: string; frontmatter: Record<string, unknown> };
  diff: DiffLine[] | null; // null for the oldest entry
};

type Props = {
  entries: NowEntry[];
};

const NowMDX = ({ code, frontmatter }: { code: string; frontmatter: Record<string, unknown> }) => {
  const Component = useMemo(
    () => getMDXComponent(code, { ...frontmatter, frontmatter }),
    [code, frontmatter],
  );
  return <Component components={MarkdownRenderers} />;
};

const DiffView = ({ diff }: { diff: DiffLine[] }) => {
  return (
    <div className="font-mono text-sm leading-relaxed border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {diff.map((line, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
          key={i}
          className={
            line.type === "added"
              ? "bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300"
              : line.type === "removed"
                ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400"
          }
        >
          <span className="inline-block w-6 text-center select-none opacity-50">
            {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
          </span>
          <span className="whitespace-pre-wrap">{line.value || "\u00A0"}</span>
        </div>
      ))}
    </div>
  );
};

const pillClass = (active: boolean) =>
  `text-xs px-3 py-1 rounded-full transition-colors cursor-pointer ${
    active
      ? "bg-myBlue text-white"
      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
  }`;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myBlue";

type TimelineProps = {
  // Oldest first, so the timeline reads left to right.
  labels: string[];
  position: number;
  onChange: (position: number) => void;
};

const Timeline = ({ labels, position, onChange }: TimelineProps) => {
  const count = labels.length;
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const halfStep = `${50 / count}%`;
  const progress = count > 1 ? position / (count - 1) : 1;

  const years = labels.reduce<{ year: string; index: number }[]>((acc, label, index) => {
    const year = label.slice(-4);
    if (acc[acc.length - 1]?.year !== year) acc.push({ year, index });
    return acc;
  }, []);

  const moveTo = (next: number) => {
    const clamped = Math.min(count - 1, Math.max(0, next));
    onChange(clamped);
    dotRefs.current[clamped]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: position - 1,
      ArrowDown: position - 1,
      ArrowRight: position + 1,
      ArrowUp: position + 1,
      Home: 0,
      End: count - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    moveTo(moves[e.key]);
  };

  const stepButtonClass = `shrink-0 flex size-11 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent ${focusRing}`;

  return (
    <section aria-label="Snapshot timeline" className="mb-10">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange(position - 1)}
          disabled={position === 0}
          aria-label="Older snapshot"
          className={stepButtonClass}
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className="min-w-0 text-center" aria-live="polite">
          <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Snapshot {position + 1} of {count}
          </div>
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
            {labels[position]}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(position + 1)}
          disabled={position === count - 1}
          aria-label="Newer snapshot"
          className={stepButtonClass}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label="Choose a snapshot"
        onKeyDown={onKeyDown}
        className="relative mt-4 flex"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-700"
          style={{ left: halfStep, right: halfStep }}
        >
          <div
            className="h-full rounded-full bg-myBlue transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {labels.map((label, i) => {
          const isSelected = i === position;
          return (
            // biome-ignore lint/a11y/useSemanticElements: APG radio group with roving tabindex; native radios can't be styled as timeline dots
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              title={label}
              key={label}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(i)}
              className="group relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center focus-visible:outline-none"
            >
              <span
                className={`block rounded-full transition-all duration-200 group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-myBlue ${
                  isSelected
                    ? "size-4 bg-myBlue ring-4 ring-myBlue/25"
                    : i < position
                      ? "size-2.5 bg-myBlue group-hover:scale-125"
                      : "size-2.5 border-2 border-gray-300 bg-white group-hover:scale-125 group-hover:border-accent dark:border-gray-600 dark:bg-gray-900"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="relative mt-1 h-5 text-xs text-gray-500 dark:text-gray-400"
      >
        {years.map(({ year, index }) => (
          <span
            key={year}
            className="absolute top-0 -translate-x-1/2 tabular-nums"
            style={{ left: `${((index + 0.5) / count) * 100}%` }}
          >
            {year}
          </span>
        ))}
      </div>
    </section>
  );
};

export default function NowHistory({ entries }: Props) {
  // Position on the timeline, oldest = 0. Entries arrive newest first.
  const [position, setPosition] = useState(entries.length - 1);
  const [showDiff, setShowDiff] = useState(false);
  const selected = entries[entries.length - 1 - position];
  const chronologicalLabels = useMemo(
    () => entries.map((entry) => entry.label).reverse(),
    [entries],
  );

  return (
    <Layout
      title="Now Page History – What I Used to Be Doing"
      description="A timeline of past editions of my /now page, showing what I was focused on at different points in time."
      url="now-history"
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      imageAlt="a person reading a book while floating in space"
      keywords={["now page", "history", "timeline", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Now", url: "/now" },
          { name: "History", url: "/now-history" },
        ]}
      />
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose">
          <Header breadcrumbs={{ path: "now-history" }} title="Now Page History" />
          <div className="text-gray-600 dark:text-gray-400 mb-8">
            Past editions of my{" "}
            <a href="/now" className="text-accent hover:underline">
              /now
            </a>{" "}
            page, showing what I was focused on at different points in time.
            {entries.length > 0 &&
              ` ${entries.length} snapshots from ${entries[entries.length - 1]?.label} to ${entries[0]?.label}.`}
          </div>

          {selected && (
            <>
              <Timeline labels={chronologicalLabels} position={position} onChange={setPosition} />

              <div className="border-l-4 border-myBlue pl-6 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Snapshot from{" "}
                    <time
                      dateTime={selected.date}
                      className="font-medium text-gray-700 dark:text-gray-200"
                    >
                      {selected.label}
                    </time>
                  </div>
                  {selected.diff && (
                    <button
                      type="button"
                      onClick={() => setShowDiff(!showDiff)}
                      className={`${pillClass(showDiff)} ${focusRing}`}
                    >
                      {showDiff ? "Show content" : "Show changes"}
                    </button>
                  )}
                </div>

                {showDiff && selected.diff ? (
                  <DiffView diff={selected.diff} />
                ) : (
                  <div className="prose md:prose-lg xl:prose-xl dark:prose-invert max-w-none">
                    <NowMDX
                      code={selected.content.code}
                      frontmatter={selected.content.frontmatter}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {entries.length === 0 && (
            <div className="text-gray-500">No history available yet. Check back later!</div>
          )}
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const { bundleMDX } = await import("mdx-bundler");
  const { diffLines } = await import("diff");

  const HISTORY_DIR = resolve("src/content/now-history");

  const files = readdirSync(HISTORY_DIR)
    .filter((f: string) => f.endsWith(".md"))
    .sort()
    .reverse(); // newest first

  // Fixed locale and UTC so the label never shifts a day with the build machine's timezone.
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? iso : dateFormatter.format(parsed);
  };

  const entries: NowEntry[] = [];

  for (const file of files) {
    const rawContent = readFileSync(resolve(HISTORY_DIR, file), "utf-8");
    const date = file.replace(".md", "");

    try {
      const result = await bundleMDX({ source: rawContent });
      new Function(result.code); // validate
      entries.push({
        date,
        label: formatDate(date),
        content: { code: result.code, frontmatter: result.frontmatter },
        diff: null, // computed below
      });
    } catch (e) {
      console.error(`Failed to bundle ${file}:`, (e as Error).message?.slice(0, 200));
    }
  }

  // Compute diffs between consecutive versions (newest to oldest)
  for (let i = 0; i < entries.length - 1; i++) {
    const currentRaw = readFileSync(resolve(HISTORY_DIR, `${entries[i].date}.md`), "utf-8");
    const previousRaw = readFileSync(resolve(HISTORY_DIR, `${entries[i + 1].date}.md`), "utf-8");

    const changes = diffLines(previousRaw, currentRaw);
    const diffResult: DiffLine[] = [];

    for (const change of changes) {
      const lines = change.value.split("\n");
      // diffLines includes a trailing empty string from the final newline
      if (lines[lines.length - 1] === "") lines.pop();

      for (const line of lines) {
        if (change.added) {
          diffResult.push({ type: "added", value: line });
        } else if (change.removed) {
          diffResult.push({ type: "removed", value: line });
        } else {
          diffResult.push({ type: "unchanged", value: line });
        }
      }
    }

    entries[i].diff = diffResult;
  }

  return { props: { entries } };
}
