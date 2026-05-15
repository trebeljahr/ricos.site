import { useEffect, useMemo, useRef, useState } from "react";
import {
  groupTimelineEntries,
  sortTimelineEntries,
  type TimelineCover,
  type TimelineEntry,
  type TimelineEntryType,
  timelineTypeLabels,
} from "src/lib/timeline";
import { HorizontalCard } from "./NiceCards";

type Props = {
  entries: TimelineEntry[];
  initialCount?: number;
  batchSize?: number;
  filterable?: boolean;
};

const FALLBACK_COVER: TimelineCover = {
  src: "/assets/blog/network.jpg",
  alt: "a network of connected dots",
  width: 1200,
  height: 630,
};

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

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const visibleSections = groupTimelineEntries(visibleEntries);
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

      <div className="space-y-12">
        {visibleSections.map(({ year, items }) => (
          <section key={year}>
            <h2 className="m-0 mb-6 text-4xl font-bold tracking-normal">{year}</h2>
            <div className="flex flex-col">
              {items.map((entry) => (
                <HorizontalCard
                  key={entry.id}
                  cover={entry.cover || FALLBACK_COVER}
                  link={entry.href}
                  title={entry.title}
                  typeLabel={entry.typeLabel}
                  excerpt={entry.excerpt}
                  date={entry.date}
                  readingTime={entry.readingTime}
                />
              ))}
            </div>
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
