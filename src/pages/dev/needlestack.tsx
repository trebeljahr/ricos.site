/**
 * /dev/needlestack — triage the link archive.
 *
 * Dev-only (404s in production). Reads and writes
 * src/content/needlestack/needles.json through /api/dev/needles, so progress
 * survives restarts and ships as a normal commit.
 *
 * The job this page exists for: several thousand imported links, each needing a
 * yes/no, a door, a path and ideally one sentence of why. So it is built for
 * the keyboard — one link at a time, a single keystroke for the common case
 * ("rate it 2 and move on"), and the machine's guess already filled in so most
 * links need no typing at all. The sheet mode is for skimming a folder; the
 * queue is what gets through a thousand.
 *
 * Nothing here can publish by accident: a needle only goes public once it is
 * `reviewed` with a rating of 1 or more, which is exactly what the rating keys
 * do, deliberately, one link at a time.
 */
import clsx from "clsx";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DOORS,
  type DoorId,
  type PathId,
  pathById,
  pathsInDoor,
} from "src/lib/needlestack/taxonomy";
import type { Needle, NeedleStatus, NeedleUpdate, Pool, Rating } from "src/lib/needlestack/types";
import { NEEDLE_TYPES, POOLS } from "src/lib/needlestack/types";

type SaveState = "idle" | "saving" | "saved" | "error";
type Mode = "queue" | "sheet";
type StatusFilter = "outstanding" | "all" | NeedleStatus;
type NoteFilter = "any" | "missing" | "draft" | "mine";

/** Door shortcuts, in the order the doors are declared. */
const DOOR_KEYS = ["q", "w", "e", "r", "t", "y"];
/** Path shortcuts within the current door. Nine is more than any door has. */
const PATH_KEYS = ["a", "s", "d", "f", "g", "h", "z", "x", "c"];

const SHEET_CAP = 300;

export default function NeedlestackReview() {
  if (process.env.NODE_ENV === "production") {
    return (
      <Shell>
        <p className="py-20 text-center text-gray-500">
          This tool only runs locally, under <code>pnpm dev</code>.
        </p>
      </Shell>
    );
  }
  return <NeedlestackTool />;
}

function NeedlestackTool() {
  const [needles, setNeedles] = useState<Needle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [mode, setMode] = useState<Mode>("queue");
  const [cursor, setCursor] = useState(0);
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState<Pool | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("outstanding");
  const [doorFilter, setDoorFilter] = useState<DoorId | "all" | "none">("all");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("any");
  const [undo, setUndo] = useState<{ id: string; rating: Rating; status: NeedleStatus } | null>(
    null,
  );

  const pending = useRef(new Map<string, NeedleUpdate>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/dev/needles")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setNeedles(data.needles as Needle[]))
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const flush = useCallback(async () => {
    if (pending.current.size === 0) return;
    const updates = [...pending.current.values()];
    pending.current.clear();
    setSaveState("saving");
    try {
      const res = await fetch("/api/dev/needles", {
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
    (update: NeedleUpdate) => {
      pending.current.set(update.id, { ...pending.current.get(update.id), ...update });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  // Don't lose the last decision when the tab goes away.
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

  const patch = useCallback(
    (id: string, update: Omit<NeedleUpdate, "id">) => {
      setNeedles(
        (prev) =>
          prev?.map((needle) => {
            if (needle.id !== id) return needle;
            const next = { ...needle };
            if (update.rating !== undefined) next.rating = update.rating;
            if (update.status !== undefined) next.status = update.status;
            if (update.note !== undefined) {
              next.note = update.note;
              next.noteSource = "manual";
            }
            if (update.door !== undefined) {
              next.door = update.door ?? undefined;
              if (update.door === null) next.paths = [];
            }
            if (update.paths !== undefined) next.paths = update.paths;
            if (update.topics !== undefined) next.topics = update.topics;
            if (update.type !== undefined) next.type = update.type;
            if (update.level !== undefined) next.level = update.level ?? undefined;
            if (update.minutes !== undefined) next.minutes = update.minutes ?? undefined;
            if (update.title !== undefined) next.title = update.title;
            return next;
          }) ?? prev,
      );
      enqueue({ id, ...update });
    },
    [enqueue],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (needles ?? []).filter((needle) => {
      if (pool !== "all" && needle.pool !== pool) return false;
      if (statusFilter === "outstanding") {
        if (needle.status !== "unclassified" && needle.status !== "classified") return false;
      } else if (statusFilter !== "all" && needle.status !== statusFilter) return false;
      if (doorFilter === "none" && needle.door) return false;
      if (doorFilter !== "all" && doorFilter !== "none" && needle.door !== doorFilter) return false;
      if (noteFilter === "missing" && needle.note) return false;
      if (noteFilter === "draft" && needle.noteSource !== "ai") return false;
      if (noteFilter === "mine" && needle.noteSource !== "manual") return false;
      if (q) {
        const haystack = `${needle.title} ${needle.url} ${needle.folders.join(" ")} ${needle.topics.join(" ")}`;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [needles, query, pool, statusFilter, doorFilter, noteFilter]);

  // Confident keepers first: the queue should front-load the easy yeses.
  const queue = useMemo(() => {
    const score = (needle: Needle) =>
      (needle.guess?.rating ?? 0) * 2 + (needle.guess?.confidence ?? 0);
    return [...visible].sort((a, b) => score(b) - score(a));
  }, [visible]);

  const totals = useMemo(() => {
    const all = needles ?? [];
    return {
      total: all.length,
      outstanding: all.filter((n) => n.status === "unclassified" || n.status === "classified")
        .length,
      live: all.filter((n) => n.status === "reviewed" && n.rating >= 1).length,
      myNotes: all.filter((n) => n.noteSource === "manual").length,
    };
  }, [needles]);

  const current = queue[Math.min(cursor, Math.max(queue.length - 1, 0))];

  const advance = useCallback(
    (delta: number) => setCursor((c) => Math.max(0, Math.min(c + delta, queue.length - 1))),
    [queue.length],
  );

  /** The core move: vouch for it at this level, mark it reviewed, next. */
  const decide = useCallback(
    (rating: Rating) => {
      if (!current) return;
      setUndo({ id: current.id, rating: current.rating, status: current.status });
      patch(current.id, { rating, status: "reviewed" });
      // While filtering for outstanding links, a decided link leaves the list,
      // so staying on the same index already means "the next one".
      if (statusFilter === "outstanding")
        setCursor((c) => Math.min(c, Math.max(0, queue.length - 2)));
      else advance(1);
    },
    [current, patch, advance, statusFilter, queue.length],
  );

  const reject = useCallback(() => {
    if (!current) return;
    setUndo({ id: current.id, rating: current.rating, status: current.status });
    patch(current.id, { status: "rejected", rating: 0 });
    if (statusFilter !== "outstanding") advance(1);
  }, [current, patch, advance, statusFilter]);

  const undoLast = useCallback(() => {
    if (!undo) return;
    patch(undo.id, { rating: undo.rating, status: undo.status });
    setUndo(null);
    advance(-1);
  }, [undo, patch, advance]);

  const togglePath = useCallback(
    (needle: Needle, pathId: PathId) => {
      const next = needle.paths.includes(pathId)
        ? needle.paths.filter((id) => id !== pathId)
        : [...needle.paths, pathId];
      patch(needle.id, { paths: next });
    },
    [patch],
  );

  useEffect(() => {
    if (mode !== "queue") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "TEXTAREA" || target?.tagName === "INPUT" || target?.isContentEditable;
      if (event.key === "Escape") {
        target?.blur?.();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();

      if (key === "/") {
        event.preventDefault();
        document.getElementById("needle-search")?.focus();
        return;
      }
      if (!current) return;

      if (["0", "1", "2", "3"].includes(key)) {
        event.preventDefault();
        decide(Number(key) as Rating);
        return;
      }
      if (key === "arrowright" || key === "enter") {
        event.preventDefault();
        // Enter means "yes, at the level the machine suggested", and 2 when it
        // had no useful view. It never rates 0 — that is what the 0 key is for.
        const guessed = current.guess?.rating;
        decide(guessed && guessed > 0 ? guessed : 2);
        return;
      }
      if (key === " ") {
        event.preventDefault();
        advance(1);
        return;
      }
      if (key === "arrowleft") {
        event.preventDefault();
        advance(-1);
        return;
      }
      if (key === "backspace" || key === "delete") {
        event.preventDefault();
        reject();
        return;
      }
      if (key === "u") {
        event.preventDefault();
        undoLast();
        return;
      }
      if (key === "o") {
        event.preventDefault();
        window.open(current.url, "_blank", "noopener");
        return;
      }
      if (key === "n") {
        event.preventDefault();
        document.getElementById("needle-note")?.focus();
        return;
      }
      const doorIndex = DOOR_KEYS.indexOf(key);
      if (doorIndex !== -1) {
        event.preventDefault();
        const door = DOORS[doorIndex].id;
        patch(current.id, { door: current.door === door ? null : door, paths: [] });
        return;
      }
      const pathIndex = PATH_KEYS.indexOf(key);
      if (pathIndex !== -1 && current.door) {
        const paths = pathsInDoor(current.door);
        const path = paths[pathIndex];
        if (path) {
          event.preventDefault();
          togglePath(current, path.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, current, decide, reject, advance, undoLast, patch, togglePath]);

  // Filters change what "next" means; start over rather than pointing at a
  // link that just left the list.
  const filterKey = `${query}|${pool}|${statusFilter}|${doorFilter}|${noteFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCursor(0);
  }

  if (loadError) {
    return (
      <Shell>
        <p className="text-red-400">
          Could not load needles.json: {loadError}. This page only runs under <code>pnpm dev</code>,
          and needs <code>pnpm needles:import</code> to have run once.
        </p>
      </Shell>
    );
  }
  if (!needles) {
    return (
      <Shell>
        <p className="text-gray-400">Loading needles…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="m-0 text-3xl font-bold">Needlestack triage</h1>
          <p className="mt-2 mb-0 max-w-prose text-sm text-gray-500 dark:text-gray-400">
            Every imported link, with the machine&apos;s guess prefilled. A rating of 1 or more plus
            a review is what puts something on the public pages — nothing else does.
          </p>
        </div>
        <dl className="m-0 flex gap-6 text-right">
          <Tally label="Needles" value={totals.total} />
          <Tally label="Outstanding" value={totals.outstanding} accent="text-amber-400" />
          <Tally label="Would publish" value={totals.live} accent="text-emerald-400" />
          <Tally label="Your notes" value={totals.myNotes} accent="text-sky-400" />
        </dl>
      </header>

      <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-2 border-y border-gray-200 bg-white/90 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <input
          id="needle-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, URLs, folders, topics…"
          aria-label="Search titles, URLs, folders and topics"
          className="min-w-[220px] flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          options={[
            ["outstanding", "Needs supervision"],
            ["unclassified", "Not classified yet"],
            ["classified", "Guessed, unreviewed"],
            ["reviewed", "Reviewed"],
            ["rejected", "Rejected"],
            ["all", "Everything"],
          ]}
        />
        <Select
          label="Pool"
          value={pool}
          onChange={(value) => setPool(value as Pool | "all")}
          options={[["all", "Any pool"], ...POOLS.map((p) => [p, p] as [string, string])]}
        />
        <Select
          label="Door"
          value={doorFilter}
          onChange={(value) => setDoorFilter(value as DoorId | "all" | "none")}
          options={[
            ["all", "Any door"],
            ["none", "No door yet"],
            ...DOORS.map((door) => [door.id, door.title] as [string, string]),
          ]}
        />
        <Select
          label="Note"
          value={noteFilter}
          onChange={(value) => setNoteFilter(value as NoteFilter)}
          options={[
            ["any", "Any note"],
            ["missing", "No note"],
            ["draft", "Machine draft"],
            ["mine", "Written by you"],
          ]}
        />
        <div className="flex overflow-hidden rounded-full border border-gray-300 dark:border-gray-700">
          {(["queue", "sheet"] as Mode[]).map((value) => (
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
              {value === "queue" ? "Queue" : "Sheet"}
            </button>
          ))}
        </div>
        <SaveTag state={saveState} />
      </div>

      <p className="mb-4 text-xs text-gray-500">
        {visible.length} in this filter
        {undo && (
          <>
            {" · "}
            <button type="button" onClick={undoLast} className="underline">
              undo last decision
            </button>
          </>
        )}
      </p>

      {mode === "queue" ? (
        current ? (
          <QueueCard
            needle={current}
            position={Math.min(cursor + 1, queue.length)}
            total={queue.length}
            onPatch={patch}
            onDecide={decide}
            onReject={reject}
            onSkip={() => advance(1)}
            onBack={() => advance(-1)}
            onTogglePath={togglePath}
          />
        ) : (
          <p className="py-20 text-center text-gray-500">
            Nothing left in this filter. Widen it, or import more links.
          </p>
        )
      ) : (
        <Sheet
          needles={visible.slice(0, SHEET_CAP)}
          truncated={visible.length > SHEET_CAP}
          onPatch={patch}
          onOpenQueue={(id) => {
            const index = queue.findIndex((needle) => needle.id === id);
            if (index !== -1) setCursor(index);
            setMode("queue");
          }}
        />
      )}
    </Shell>
  );
}

function QueueCard({
  needle,
  position,
  total,
  onPatch,
  onDecide,
  onReject,
  onSkip,
  onBack,
  onTogglePath,
}: {
  needle: Needle;
  position: number;
  total: number;
  onPatch: (id: string, update: Omit<NeedleUpdate, "id">) => void;
  onDecide: (rating: Rating) => void;
  onReject: () => void;
  onSkip: () => void;
  onBack: () => void;
  onTogglePath: (needle: Needle, pathId: PathId) => void;
}) {
  const doorPaths = needle.door ? pathsInDoor(needle.door) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="m-0 text-2xl font-semibold leading-tight">{needle.title}</h2>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-gray-500">
            {position} / {total}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={needle.url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-full truncate font-mono text-sky-600 underline dark:text-sky-400"
          >
            {needle.url}
          </a>
          <Chip>{needle.type}</Chip>
          <Chip>{needle.pool}</Chip>
          {needle.minutes && <Chip>{needle.minutes} min</Chip>}
          {needle.level && <Chip>{needle.level}</Chip>}
          {needle.newsletter && <Chip>newsletter #{needle.newsletter}</Chip>}
          {needle.inNeedlestackMd && <Chip accent="emerald">already public</Chip>}
        </div>

        {needle.folders.length > 0 && (
          <p className="m-0 font-mono text-[11px] text-gray-500">{needle.folders.join("  ·  ")}</p>
        )}

        {needle.guess && (
          <p className="m-0 rounded border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <strong>Guess</strong> {needle.guess.door ?? "no door"}
            {needle.guess.paths && needle.guess.paths.length > 0
              ? ` → ${needle.guess.paths.join(", ")}`
              : ""}
            {needle.guess.rating !== undefined ? ` · would rate ${needle.guess.rating}` : ""}
            {needle.guess.confidence !== undefined
              ? ` · ${Math.round(needle.guess.confidence * 100)}% sure`
              : ""}
            {needle.guess.reason ? ` · ${needle.guess.reason}` : ""}
          </p>
        )}

        <div>
          <Label>
            Why it&apos;s here{" "}
            {needle.noteSource === "ai" && <Chip accent="amber">machine draft</Chip>}
            {needle.noteSource === "manual" && <Chip accent="emerald">yours</Chip>}
          </Label>
          <textarea
            id="needle-note"
            value={needle.note ?? ""}
            onChange={(event) => onPatch(needle.id, { note: event.target.value })}
            placeholder="One or two sentences. What does the reader get out of it?"
            className="min-h-24 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-base leading-snug dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([3, 2, 1, 0] as Rating[]).map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onDecide(rating)}
              className={clsx(
                "rounded px-3 py-2 text-sm font-semibold",
                rating === 0
                  ? "border border-gray-300 dark:border-gray-700"
                  : "bg-emerald-600 text-white",
                rating === 3 && "bg-emerald-700",
                rating === 1 && "bg-emerald-600/70",
              )}
            >
              {rating === 0 ? "0 · hide" : `${rating} · ${RATING_LABELS[rating]}`}
            </button>
          ))}
          <button
            type="button"
            onClick={onSkip}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:text-red-400"
          >
            Reject
          </button>
        </div>

        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span>
            <Key>0</Key>–<Key>3</Key> rate and next
          </span>
          <span>
            <Key>↵</Key> accept the guess
          </span>
          <span>
            <Key>space</Key> skip
          </span>
          <span>
            <Key>⌫</Key> reject
          </span>
          <span>
            <Key>u</Key> undo
          </span>
          <span>
            <Key>q</Key>…<Key>y</Key> door
          </span>
          <span>
            <Key>a</Key>…<Key>c</Key> path
          </span>
          <span>
            <Key>n</Key> note
          </span>
          <span>
            <Key>o</Key> open
          </span>
          <span>
            <Key>/</Key> search
          </span>
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        <div>
          <Label>Door</Label>
          <div className="flex flex-wrap gap-1.5">
            {DOORS.map((door, index) => (
              <button
                key={door.id}
                type="button"
                onClick={() =>
                  onPatch(needle.id, {
                    door: needle.door === door.id ? null : door.id,
                    paths: [],
                  })
                }
                className={clsx(
                  "rounded border px-2 py-1 text-xs",
                  needle.door === door.id
                    ? "border-sky-500 bg-sky-500/10 font-semibold text-sky-700 dark:text-sky-300"
                    : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400",
                )}
              >
                <Key>{DOOR_KEYS[index]}</Key> {door.title}
              </button>
            ))}
          </div>
        </div>

        {doorPaths.length > 0 && (
          <div>
            <Label>Paths</Label>
            <div className="flex flex-col gap-1">
              {doorPaths.map((path, index) => (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => onTogglePath(needle, path.id)}
                  className={clsx(
                    "rounded border px-2 py-1 text-left text-xs",
                    needle.paths.includes(path.id)
                      ? "border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                      : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400",
                  )}
                >
                  {PATH_KEYS[index] && <Key>{PATH_KEYS[index]}</Key>} {path.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Type</Label>
          <Select
            label="Type"
            value={needle.type}
            onChange={(value) => onPatch(needle.id, { type: value as Needle["type"] })}
            options={NEEDLE_TYPES.map((type) => [type, type])}
          />
        </div>

        <div>
          <Label>Topics</Label>
          <input
            type="text"
            value={needle.topics.join(", ")}
            onChange={(event) =>
              onPatch(needle.id, { topics: event.target.value.split(",").map((t) => t.trim()) })
            }
            placeholder="fourier, signal-processing"
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Minutes</Label>
            <input
              type="number"
              min={1}
              value={needle.minutes ?? ""}
              onChange={(event) =>
                onPatch(needle.id, {
                  minutes: event.target.value ? Number(event.target.value) : null,
                })
              }
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="flex-1">
            <Label>Level</Label>
            <Select
              label="Level"
              value={needle.level ?? ""}
              onChange={(value) =>
                onPatch(needle.id, { level: value === "" ? null : (value as "intro" | "deep") })
              }
              options={[
                ["", "unset"],
                ["intro", "intro"],
                ["deep", "deep"],
              ]}
            />
          </div>
        </div>

        <p className="m-0 text-[11px] text-gray-500">
          status <code>{needle.status}</code> · rating <code>{needle.rating}</code>
          {needle.addedAt ? ` · bookmarked ${needle.addedAt}` : ""}
        </p>
      </aside>
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "archive",
  2: "good",
  3: "front shelf",
};

function Sheet({
  needles,
  truncated,
  onPatch,
  onOpenQueue,
}: {
  needles: Needle[];
  truncated: boolean;
  onPatch: (id: string, update: Omit<NeedleUpdate, "id">) => void;
  onOpenQueue: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      {truncated && (
        <p className="mb-2 text-xs text-amber-500">
          Showing the first {needles.length}. Narrow the filter, or use the queue.
        </p>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-800">
            <th className="py-2 pr-3 font-medium">Link</th>
            <th className="py-2 pr-3 font-medium">Guess</th>
            <th className="py-2 pr-3 font-medium">Door / paths</th>
            <th className="py-2 pr-3 font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {needles.map((needle) => (
            <tr key={needle.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="max-w-[420px] py-2 pr-3">
                <button
                  type="button"
                  onClick={() => onOpenQueue(needle.id)}
                  className="block w-full truncate text-left font-medium"
                  title={needle.title}
                >
                  {needle.title}
                </button>
                <a
                  href={needle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-[11px] text-gray-500"
                >
                  {needle.url}
                </a>
              </td>
              <td className="py-2 pr-3 text-[11px] text-gray-500">
                {needle.guess
                  ? `${needle.guess.rating ?? "?"} · ${Math.round((needle.guess.confidence ?? 0) * 100)}%`
                  : "—"}
              </td>
              <td className="py-2 pr-3 text-[11px]">
                {needle.door ?? "—"}
                {needle.paths.length > 0 && (
                  <span className="text-gray-500">
                    {" "}
                    → {needle.paths.map((id) => pathById(id)?.title ?? id).join(", ")}
                  </span>
                )}
              </td>
              <td className="py-2 pr-3">
                <div className="flex gap-1">
                  {([0, 1, 2, 3] as Rating[]).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => onPatch(needle.id, { rating, status: "reviewed" })}
                      className={clsx(
                        "h-6 w-6 rounded text-xs",
                        needle.rating === rating && needle.status === "reviewed"
                          ? "bg-emerald-600 text-white"
                          : "border border-gray-300 text-gray-500 dark:border-gray-700",
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onPatch(needle.id, { status: "rejected", rating: 0 })}
                    className={clsx(
                      "h-6 w-6 rounded text-xs",
                      needle.status === "rejected"
                        ? "bg-red-600 text-white"
                        : "border border-gray-300 text-gray-500 dark:border-gray-700",
                    )}
                  >
                    ×
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>Needlestack triage</title>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500">
      {children}
    </span>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: "amber" | "emerald" }) {
  return (
    <span
      className={clsx(
        "rounded-full border px-2 py-0.5 text-[10px]",
        accent === "amber" && "border-amber-400 text-amber-600 dark:text-amber-300",
        accent === "emerald" && "border-emerald-500 text-emerald-600 dark:text-emerald-300",
        !accent && "border-gray-300 text-gray-500 dark:border-gray-700",
      )}
    >
      {children}
    </span>
  );
}

function SaveTag({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const label =
    state === "saving" ? "saving…" : state === "saved" ? "saved" : "save failed — check the server";
  return (
    <span
      className={clsx(
        "text-[11px]",
        state === "error" ? "text-red-500" : "text-gray-500 dark:text-gray-400",
      )}
    >
      {label}
    </span>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-gray-300 bg-gray-100 px-1 font-mono text-[10px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {children}
    </kbd>
  );
}
