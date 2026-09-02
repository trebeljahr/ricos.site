/**
 * /dev/alt-review — review every image's alt text against the actual image.
 *
 * Dev-only (404s in production). Reads and writes
 * src/content/Notes/_data/metadata.json through /api/dev/alt, so progress
 * survives restarts and ships as a normal commit in the Notes submodule.
 *
 * Two ways to work: a contact sheet for skimming a folder, and a one-at-a-time
 * mode driven from the keyboard for actually getting through a few thousand.
 * Anything edited here is stored as `altSource: "manual"`, which the alt sync
 * script refuses to overwrite.
 */
import clsx from "clsx";
import Head from "next/head";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AltEntry, AltUpdate } from "src/pages/api/dev/alt";

type SaveState = "idle" | "saving" | "saved" | "error";
type Mode = "sheet" | "review";
type StateFilter = "all" | "unreviewed" | "reviewed" | "edited";
type SourceFilter = "all" | "ai" | "generated" | "manual" | "none";

const GRID_SIZES = "300px";
/**
 * Rendering all 8000 cards costs about a second and a half per filter change.
 * The sheet is for skimming a folder; anything bigger belongs in one-by-one,
 * which renders exactly one image no matter how long the queue is.
 */
const GRID_CAP = 500;
const REVIEW_SIZES = "(max-width: 1024px) 100vw, 60vw";

/** Photography is grouped per trip; everything else by its top folder. */
function groupOf(key: string): string {
  const parts = key.split("/");
  if (key.startsWith("assets/photography/")) return parts.slice(0, 3).join("/");
  if (parts.length <= 2) return "assets";
  return parts.slice(0, 2).join("/");
}

function labelOf(group: string): string {
  if (group === "assets") return "Loose files";
  return group
    .replace(/^assets\//, "")
    .replace(/[-/]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The route is statically rendered, so it exists in a production build too.
 * The API behind it does not, so say what this is rather than showing a page
 * that spins forever.
 */
export default function AltReview() {
  if (process.env.NODE_ENV === "production") {
    return (
      <Shell>
        <p className="py-20 text-center text-gray-500">
          This tool only runs locally, under <code>npm run dev</code>.
        </p>
      </Shell>
    );
  }
  return <AltReviewTool />;
}

function AltReviewTool() {
  const [entries, setEntries] = useState<AltEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [mode, setMode] = useState<Mode>("sheet");
  const [cursor, setCursor] = useState(0);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("unreviewed");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const pending = useRef(new Map<string, AltUpdate>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/dev/alt")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setEntries(data.entries as AltEntry[]))
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const flush = useCallback(async () => {
    if (pending.current.size === 0) return;
    const updates = [...pending.current.values()];
    pending.current.clear();
    setSaveState("saving");
    try {
      const res = await fetch("/api/dev/alt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  const enqueue = useCallback(
    (update: AltUpdate) => {
      const merged = { ...pending.current.get(update.key), ...update };
      pending.current.set(update.key, merged);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 600);
    },
    [flush],
  );

  // Don't lose the last few keystrokes when the tab goes away.
  useEffect(() => {
    const onHide = () => {
      if (pending.current.size > 0) void flush();
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  const setAlt = useCallback(
    (key: string, alt: string) => {
      setEntries(
        (prev) =>
          prev?.map((e) => (e.key === key ? { ...e, alt, altSource: "manual" as const } : e)) ??
          prev,
      );
      enqueue({ key, alt });
    },
    [enqueue],
  );

  const setReviewed = useCallback(
    (key: string, reviewed: boolean) => {
      setEntries((prev) => prev?.map((e) => (e.key === key ? { ...e, reviewed } : e)) ?? prev);
      enqueue({ key, reviewed });
    },
    [enqueue],
  );

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries ?? []) {
      const g = groupOf(entry.key);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries ?? []).filter((entry) => {
      if (group !== "all" && groupOf(entry.key) !== group) return false;
      if (sourceFilter !== "all" && entry.altSource !== sourceFilter) return false;
      if (stateFilter === "reviewed" && !entry.reviewed) return false;
      if (stateFilter === "unreviewed" && entry.reviewed) return false;
      if (stateFilter === "edited" && entry.altSource !== "manual") return false;
      if (q && !`${entry.key} ${entry.alt}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, group, stateFilter, sourceFilter]);

  const totals = useMemo(() => {
    const all = entries ?? [];
    return {
      total: all.length,
      reviewed: all.filter((e) => e.reviewed).length,
      manual: all.filter((e) => e.altSource === "manual").length,
    };
  }, [entries]);

  const current = visible[Math.min(cursor, Math.max(visible.length - 1, 0))];

  const step = useCallback(
    (delta: number, markReviewed: boolean) => {
      if (!current) return;
      if (markReviewed && !current.reviewed) setReviewed(current.key, true);
      setCursor((c) => Math.max(0, Math.min(c + delta, visible.length - 1)));
    },
    [current, setReviewed, visible.length],
  );

  useEffect(() => {
    if (mode !== "review") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "TEXTAREA" || target?.tagName === "INPUT" || target?.isContentEditable;
      if (event.key === "Escape") {
        (target as HTMLElement | null)?.blur?.();
        setMode("sheet");
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        step(1, true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1, false);
      } else if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        step(1, false);
      } else if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        document.getElementById("review-alt")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, step]);

  // Filters change what "next" means; start the queue over rather than
  // leaving the cursor pointing at an image that is no longer in the list.
  const filterKey = `${query}|${group}|${stateFilter}|${sourceFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCursor(0);
  }

  if (loadError) {
    return (
      <Shell>
        <p className="text-red-400">
          Could not load metadata: {loadError}. This page only runs under <code>npm run dev</code>.
        </p>
      </Shell>
    );
  }

  if (!entries) {
    return (
      <Shell>
        <p className="text-gray-400">Loading metadata…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="m-0 text-3xl font-bold">Alt text review</h1>
          <p className="mt-2 mb-0 max-w-prose text-sm text-gray-500 dark:text-gray-400">
            Every image in <code>metadata.json</code>, next to what a screen reader would say about
            it. Edits are saved as <code>altSource: &quot;manual&quot;</code>, which the sync script
            will never overwrite.
          </p>
        </div>
        <dl className="m-0 flex gap-6 text-right">
          <Tally label="Images" value={totals.total} />
          <Tally label="Reviewed" value={totals.reviewed} accent="text-emerald-400" />
          <Tally label="Edited" value={totals.manual} accent="text-amber-400" />
        </dl>
      </header>

      <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-2 border-y border-gray-200 bg-white/90 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search descriptions and paths…"
          aria-label="Search descriptions and paths"
          className="min-w-[200px] flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <Select
          label="Folder"
          value={group}
          onChange={setGroup}
          options={[
            ["all", `All folders (${entries.length})`],
            ...groups.map(([g, n]) => [g, `${labelOf(g)} (${n})`] as [string, string]),
          ]}
        />
        <Select
          label="State"
          value={stateFilter}
          onChange={(value) => setStateFilter(value as StateFilter)}
          options={[
            ["unreviewed", "Not yet reviewed"],
            ["all", "Any state"],
            ["reviewed", "Reviewed"],
            ["edited", "Edited by hand"],
          ]}
        />
        <Select
          label="Source"
          value={sourceFilter}
          onChange={(value) => setSourceFilter(value as SourceFilter)}
          options={[
            ["all", "Any source"],
            ["ai", "Machine written"],
            ["generated", "From the filename"],
            ["manual", "Written by hand"],
            ["none", "No alt at all"],
          ]}
        />
        <div className="flex overflow-hidden rounded-full border border-gray-300 dark:border-gray-700">
          {(["sheet", "review"] as Mode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium",
                mode === value
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-400",
              )}
            >
              {value === "sheet" ? "Contact sheet" : "One by one"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {visible.length} shown · {saveLabel(saveState)}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-gray-500">Nothing matches that filter.</p>
      ) : mode === "review" ? (
        <ReviewOne
          entry={current}
          position={Math.min(cursor, visible.length - 1) + 1}
          total={visible.length}
          onAlt={setAlt}
          onReviewed={setReviewed}
          onStep={step}
          onExit={() => setMode("sheet")}
        />
      ) : (
        <>
          {visible.length > GRID_CAP && (
            <p className="mb-4 rounded border border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-800">
              Showing the first {GRID_CAP} of {visible.length}. Narrow the filter, or switch to one
              by one to work through the whole queue.
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {visible.slice(0, GRID_CAP).map((entry, index) => (
              <Frame
                key={entry.key}
                entry={entry}
                onAlt={setAlt}
                onReviewed={setReviewed}
                onOpen={() => {
                  setCursor(index);
                  setMode("review");
                }}
              />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>Alt text review</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="mx-auto max-w-[1500px] px-5 pb-24">{children}</main>
    </>
  );
}

function Tally({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <dd className={clsx("m-0 text-2xl font-semibold tabular-nums", accent)}>{value}</dd>
      <dt className="m-0 text-[10px] uppercase tracking-widest text-gray-500">{label}</dt>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function saveLabel(state: SaveState) {
  if (state === "saving") return "saving…";
  if (state === "saved") return "saved to metadata.json";
  if (state === "error") return "save failed — edit again to retry";
  return "no changes yet";
}

function SourceTag({ source }: { source: AltEntry["altSource"] }) {
  const copy: Record<AltEntry["altSource"], string> = {
    ai: "machine",
    manual: "by hand",
    generated: "filename",
    none: "missing",
  };
  return (
    <span
      className={clsx(
        "rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider",
        source === "manual" && "bg-amber-500/15 text-amber-500",
        source === "ai" && "bg-sky-500/15 text-sky-500",
        source === "generated" && "bg-gray-500/15 text-gray-400",
        source === "none" && "bg-red-500/15 text-red-400",
      )}
    >
      {copy[source]}
    </span>
  );
}

function Frame({
  entry,
  onAlt,
  onReviewed,
  onOpen,
}: {
  entry: AltEntry;
  onAlt: (key: string, alt: string) => void;
  onReviewed: (key: string, reviewed: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <article
      className={clsx(
        "flex flex-col overflow-hidden rounded border bg-white dark:bg-gray-900",
        entry.reviewed ? "border-emerald-600/60" : "border-gray-200 dark:border-gray-800",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        title="Open in one-by-one review"
        className="relative flex aspect-[4/3] cursor-zoom-in items-center justify-center overflow-hidden bg-gray-950 p-0"
      >
        <Thumb entry={entry} sizes={GRID_SIZES} />
      </button>
      <div className="flex items-center gap-2 px-2.5 pt-2">
        <span
          dir="rtl"
          className="min-w-0 flex-1 truncate text-left font-mono text-[10px] text-gray-500"
          title={entry.key}
        >
          {entry.key.replace(/^assets\//, "")}
        </span>
        <SourceTag source={entry.altSource} />
      </div>
      <textarea
        value={entry.alt}
        onChange={(event) => onAlt(entry.key, event.target.value)}
        aria-label={`Alt text for ${entry.key}`}
        rows={3}
        className="w-full resize-none border-0 bg-transparent px-2.5 py-2 text-sm leading-snug focus:bg-gray-50 focus:outline-none dark:focus:bg-gray-800"
      />
      <button
        type="button"
        onClick={() => onReviewed(entry.key, !entry.reviewed)}
        className={clsx(
          "mt-auto border-t px-3 py-1.5 text-xs font-medium",
          entry.reviewed
            ? "border-emerald-600/40 text-emerald-500"
            : "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400",
        )}
      >
        {entry.reviewed ? "Reviewed" : "Mark reviewed"}
      </button>
    </article>
  );
}

function Thumb({ entry, sizes }: { entry: AltEntry; sizes: string }) {
  const [failed, setFailed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the image changes
  useEffect(() => setFailed(false), [entry.key]);

  if (failed) {
    return (
      <span className="px-4 text-center font-mono text-[10px] text-red-400">
        image missing from the store
      </span>
    );
  }
  return (
    <Image
      src={`/${entry.key}`}
      alt=""
      fill
      sizes={sizes}
      onError={() => setFailed(true)}
      className="object-contain"
    />
  );
}

function ReviewOne({
  entry,
  position,
  total,
  onAlt,
  onReviewed,
  onStep,
  onExit,
}: {
  entry: AltEntry | undefined;
  position: number;
  total: number;
  onAlt: (key: string, alt: string) => void;
  onReviewed: (key: string, reviewed: boolean) => void;
  onStep: (delta: number, markReviewed: boolean) => void;
  onExit: () => void;
}) {
  if (!entry) return null;

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[1.15fr_.85fr]">
      <div className="relative flex h-[64vh] items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-950 p-2 dark:border-gray-800">
        <Thumb entry={entry} sizes={REVIEW_SIZES} />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-[3px] flex-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-150"
              style={{ width: `${Math.max(1.5, (position / total) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-gray-500">
            {position} / {total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="break-all font-mono text-[11px] text-gray-500">{entry.key}</span>
          <SourceTag source={entry.altSource} />
        </div>

        <textarea
          id="review-alt"
          value={entry.alt}
          onChange={(event) => onAlt(entry.key, event.target.value)}
          aria-label="Alt text for the image shown"
          className="min-h-32 w-full resize-y rounded border border-gray-300 bg-white px-4 py-3 text-lg leading-snug dark:border-gray-700 dark:bg-gray-900"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStep(1, true)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {entry.reviewed ? "Reviewed — next" : "Looks right"}
          </button>
          <button
            type="button"
            onClick={() => onStep(1, false)}
            className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onStep(-1, false)}
            className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            Back
          </button>
          {entry.reviewed && (
            <button
              type="button"
              onClick={() => onReviewed(entry.key, false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              Unmark
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            Back to the sheet
          </button>
        </div>

        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span>
            <Key>→</Key> looks right
          </span>
          <span>
            <Key>S</Key> skip
          </span>
          <span>
            <Key>←</Key> back
          </span>
          <span>
            <Key>E</Key> edit
          </span>
          <span>
            <Key>Esc</Key> back to the sheet
          </span>
        </p>
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-gray-300 bg-gray-100 px-1 font-mono text-[10px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {children}
    </kbd>
  );
}
