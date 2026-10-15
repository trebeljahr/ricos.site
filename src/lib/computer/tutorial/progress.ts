// The reader's tutorial progress: solved levels with the circuit that passed,
// skipped levels, unfinished drafts and the parts setting. It is one store for
// the whole page on purpose: every builder on it reads the same progress, so a
// part solved in one builder shows up in the palette of the others at once.
// Browser storage may be missing or full; the store then lives in memory.
import { type Circuit, validateCircuit } from "../logic";

export const PROGRESS_KEY = "ricos-logic-tutorial-v1";
const OLD_CPU_KEY = "ricos-cpu-challenge-v1";

/**
 * Which version of a part the palette places: always the built-in one, the
 * reader's own when there is one, or only the reader's own (parts they have
 * not built yet stay locked and link to the level that builds them).
 */
export type OwnPartsMode = "built-in" | "mine" | "only-mine";

export type Solution = {
  at: number;
  /** The circuit that passed, for levels whose result becomes a part. */
  circuit?: Circuit;
};

export type Progress = {
  solved: Readonly<Record<string, Solution>>;
  skipped: readonly string[];
  /** Unfinished work per level, in the form the level saves it. */
  drafts: Readonly<Record<string, unknown>>;
  settings: { ownParts: OwnPartsMode };
};

export const EMPTY_PROGRESS: Progress = {
  solved: {},
  skipped: [],
  drafts: {},
  settings: { ownParts: "mine" },
};

const MODES: OwnPartsMode[] = ["built-in", "mine", "only-mine"];

function parse(raw: string | null): Progress | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<Progress> | null;
  if (!value || typeof value !== "object") return null;
  const solved: Record<string, Solution> = {};
  for (const [id, item] of Object.entries(value.solved ?? {})) {
    if (!item || typeof item !== "object" || !Number.isFinite(item.at)) continue;
    const circuit = item.circuit === undefined ? undefined : validateCircuit(item.circuit);
    if (item.circuit !== undefined && !circuit) continue;
    solved[id] = circuit ? { at: item.at, circuit } : { at: item.at };
  }
  return {
    solved,
    skipped: Array.isArray(value.skipped)
      ? value.skipped.filter((id): id is string => typeof id === "string")
      : [],
    drafts: value.drafts && typeof value.drafts === "object" ? value.drafts : {},
    settings: {
      ownParts: MODES.includes(value.settings?.ownParts as OwnPartsMode)
        ? (value.settings!.ownParts as OwnPartsMode)
        : EMPTY_PROGRESS.settings.ownParts,
    },
  };
}

/** Passed levels of the old build-a-CPU page, carried over once. */
function fromOldCpuProgress(): Progress | null {
  const raw = localStorage.getItem(OLD_CPU_KEY);
  if (!raw) return null;
  const value = JSON.parse(raw) as { passed?: unknown; circuits?: Record<string, unknown> } | null;
  const passed = Array.isArray(value?.passed) ? value.passed.filter(Number.isInteger) : [];
  return {
    ...EMPTY_PROGRESS,
    solved: Object.fromEntries(passed.map((level: number) => [`cpu-${level}`, { at: 0 }])),
    drafts: Object.fromEntries(
      Object.entries(value?.circuits ?? {}).map(([level, saved]) => [`cpu-${level}`, saved]),
    ),
  };
}

function read(): Progress {
  try {
    return parse(localStorage.getItem(PROGRESS_KEY)) ?? fromOldCpuProgress() ?? EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

let current: Progress | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

const onStorage = (event: StorageEvent) => {
  if (event.key !== PROGRESS_KEY) return;
  current = read();
  notify();
};

export const progressStore = {
  get(): Progress {
    if (typeof window === "undefined") return EMPTY_PROGRESS;
    current ??= read();
    return current;
  },
  subscribe(listener: () => void) {
    if (!listeners.size && typeof window !== "undefined")
      window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size && typeof window !== "undefined")
        window.removeEventListener("storage", onStorage);
    };
  },
  update(change: (progress: Progress) => Progress) {
    const next = change(progressStore.get());
    if (next === current) return;
    current = next;
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: progress lasts until the tab closes.
    }
    notify();
  },
  /** Forgets the cached copy, e.g. between tests. */
  reset() {
    current = null;
    notify();
  },
};

export const markSolved = (level: string, circuit?: Circuit) =>
  progressStore.update((progress) => ({
    ...progress,
    solved: {
      ...progress.solved,
      [level]: circuit ? { at: Date.now(), circuit } : { at: Date.now() },
    },
    skipped: progress.skipped.filter((id) => id !== level),
  }));

export const markSkipped = (level: string) =>
  progressStore.update((progress) =>
    progress.skipped.includes(level)
      ? progress
      : { ...progress, skipped: [...progress.skipped, level] },
  );

export const saveDraft = (level: string, draft: unknown) =>
  progressStore.update((progress) => ({
    ...progress,
    drafts: { ...progress.drafts, [level]: draft },
  }));

export const setOwnPartsMode = (ownParts: OwnPartsMode) =>
  progressStore.update((progress) =>
    progress.settings.ownParts === ownParts
      ? progress
      : { ...progress, settings: { ...progress.settings, ownParts } },
  );

/** Forgets a level's solution and draft, so it can be built again from scratch. */
export const forgetLevel = (level: string) =>
  progressStore.update((progress) => {
    const solved = { ...progress.solved };
    const drafts = { ...progress.drafts };
    delete solved[level];
    delete drafts[level];
    return { ...progress, solved, drafts };
  });
