import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatTimelineDate,
  groupTimelineEntries,
  sortTimelineEntries,
  type TimelineEntry,
  type TimelineEntryType,
  type TimelineStats,
  timelineTypeLabels,
} from "src/lib/timeline";

type Props = {
  entries: TimelineEntry[];
  initialCount?: number;
  batchSize?: number;
  filterable?: boolean;
};

const numberFormatter = new Intl.NumberFormat("en");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

function formatStats(stats: TimelineStats) {
  const parts = [plural(stats.count, "thing")];

  if (stats.wordCount > 0) {
    parts.push(`${formatNumber(stats.wordCount)} words`);
  }

  if (stats.readingTime > 0) {
    parts.push(`${formatNumber(stats.readingTime)} min`);
  }

  const nonWritingTypes = Object.entries(stats.typeCounts)
    .filter(([type]) => type === "photography" || type === "r3f")
    .map(([type, count]) => {
      const label = type === "r3f" ? "demo" : "photo set";
      return plural(count || 0, label);
    });

  return [...parts, ...nonWritingTypes].join(" · ");
}

function getEntryMeta(entry: TimelineEntry) {
  const parts = [];
  if (entry.readingTime) parts.push(`${entry.readingTime} min`);
  if (entry.wordCount) parts.push(`${formatNumber(entry.wordCount)} words`);
  return parts.join(" · ");
}

export function TimelineList({
  entries,
  initialCount = 18,
  batchSize = 12,
  filterable = true,
}: Props) {
  const [selectedType, setSelectedType] = useState<TimelineEntryType | "all">("all");
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const sortedEntries = useMemo(() => sortTimelineEntries(entries), [entries]);
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(sortedEntries.map((entry) => entry.type)));
    return types.sort((a, b) => timelineTypeLabels[a].localeCompare(timelineTypeLabels[b]));
  }, [sortedEntries]);

  const filteredEntries = useMemo(() => {
    if (selectedType === "all") return sortedEntries;
    return sortedEntries.filter((entry) => entry.type === selectedType);
  }, [selectedType, sortedEntries]);

  const fullSectionsByYear = useMemo(() => {
    return new Map(groupTimelineEntries(filteredEntries).map((section) => [section.year, section]));
  }, [filteredEntries]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const visibleSections = groupTimelineEntries(visibleEntries).map((section) => ({
    ...section,
    stats: fullSectionsByYear.get(section.year)?.stats || section.stats,
  }));
  const hasMore = visibleCount < filteredEntries.length;
  const selectType = (type: TimelineEntryType | "all") => {
    setSelectedType(type);
    setVisibleCount(initialCount);
  };

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + batchSize, filteredEntries.length));
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [batchSize, filteredEntries.length, hasMore]);

  return (
    <div className="not-prose">
      {filterable && availableTypes.length > 1 && (
        <div className="mb-12 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={selectedType === "all"}
            onClick={() => selectType("all")}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              selectedType === "all"
                ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={selectedType === type}
              onClick={() => selectType(type)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                selectedType === type
                  ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {timelineTypeLabels[type]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {visibleSections.map(({ year, stats, items }) => (
          <section
            key={year}
            className="grid gap-6 border-t border-gray-200 pt-8 dark:border-gray-800 lg:grid-cols-[10rem_1fr]"
          >
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="m-0 text-4xl font-bold tracking-normal">{year}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{formatStats(stats)}</p>
            </div>

            <ol className="m-0 list-none p-0">
              {items.map((entry) => {
                const meta = getEntryMeta(entry);
                return (
                  <li key={entry.id} className="border-b border-gray-200 dark:border-gray-800">
                    <Link
                      href={entry.href}
                      className="group grid gap-3 py-5 text-inherit no-underline transition-colors hover:text-myBlue sm:grid-cols-[8rem_1fr]"
                    >
                      <time className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimelineDate(entry)}
                      </time>
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-normal text-gray-500 dark:text-gray-400">
                          <span>{entry.typeLabel}</span>
                          {meta && <span>{meta}</span>}
                        </div>
                        <h3 className="m-0 text-xl font-semibold tracking-normal text-gray-950 transition-colors group-hover:text-myBlue dark:text-white">
                          {entry.title}
                        </h3>
                        {entry.excerpt && (
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                            {entry.excerpt}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) => Math.min(count + batchSize, filteredEntries.length))
            }
            className="rounded-full bg-gray-950 px-5 py-2 text-sm text-white transition-colors hover:bg-myBlue dark:bg-white dark:text-gray-950"
          >
            Load more
          </button>
        </div>
      )}
      <div ref={sentinelRef} aria-hidden="true" className="h-8" />
    </div>
  );
}
