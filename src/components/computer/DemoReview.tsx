import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyReview,
  NOTE_LIMIT,
  type ReviewState,
  type ReviewUpdate,
  stageOf,
} from "src/lib/demoReview";

// The controls of the demo review, used by the bar on each
// demo page. Development only: nothing here reaches a production page.

const API = "/api/dev/demo-review";
const NOTE_SAVE_DELAY = 500;

const BUTTON =
  "inline-flex min-h-10 items-center rounded border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";

const IDLE =
  "border-gray-300 text-gray-600 hover:border-cyan-500 hover:text-cyan-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-cyan-400 dark:hover:text-cyan-300";

const PRESSED = {
  accepted:
    "border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200",
  rejected:
    "border-rose-600 bg-rose-100 text-rose-900 dark:border-rose-400 dark:bg-rose-950 dark:text-rose-200",
};

export type DemoReviewApi = {
  state: ReviewState;
  change: (slug: string, update: ReviewUpdate) => void;
  saveError: string | null;
};

/** The saved review and a way to change it, one save at a time. */
export function useDemoReview(initial: ReviewState): DemoReviewApi {
  const [state, setState] = useState(initial);
  const [saveError, setSaveError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());

  const change = useCallback((slug: string, update: ReviewUpdate) => {
    setState((current) => ({
      ...current,
      reviews: applyReview(current.reviews, slug, update, new Date()),
    }));
    // One at a time, so an older save can never land after a newer one.
    queue.current = queue.current.then(async () => {
      try {
        const response = await fetch(API, {
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

  return { state, change, saveError };
}

/** The saved review, or null where the endpoint does not answer (another machine). */
export async function fetchDemoReview(): Promise<ReviewState | null> {
  const response = await fetch(API);
  return response.ok ? ((await response.json()) as ReviewState) : null;
}

export function VerdictButtons({
  slug,
  title,
  review,
  onReject,
}: {
  slug: string;
  title: string;
  review: DemoReviewApi;
  onReject?: () => void;
}) {
  const stage = stageOf(review.state, slug);
  return (
    <fieldset className="flex shrink-0 gap-tight">
      <legend className="sr-only">Verdict on {title}</legend>
      <button
        aria-pressed={stage === "accepted"}
        className={clsx(BUTTON, stage === "accepted" ? PRESSED.accepted : IDLE)}
        onClick={() => review.change(slug, { verdict: stage === "accepted" ? null : "accepted" })}
        type="button"
      >
        {stage === "accepted" ? "Accepted" : "Accept"}
      </button>
      <button
        aria-pressed={stage === "rejected"}
        className={clsx(BUTTON, stage === "rejected" ? PRESSED.rejected : IDLE)}
        onClick={() => {
          if (stage === "rejected") {
            review.change(slug, { verdict: null });
            return;
          }
          review.change(slug, { verdict: "rejected" });
          onReject?.();
        }}
        type="button"
      >
        {stage === "rejected" ? "Rejected" : "Reject"}
      </button>
    </fieldset>
  );
}

export function NoteField({
  title,
  initial,
  focus = false,
  className,
  onSave,
  onDone,
}: {
  title: string;
  initial: string;
  focus?: boolean;
  className?: string;
  onSave: (note: string) => void;
  /** The note lost focus. */
  onDone?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current === null) return;
    onSave(pending.current);
    pending.current = null;
  }, [onSave]);

  // A row that moves away and a closing tab fire no blur: both still save.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    if (focus) field.current?.focus();
  }, [focus]);

  return (
    <textarea
      aria-label={`Note on ${title}`}
      className={clsx(
        "block min-h-10 w-full resize-none rounded border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 field-sizing-content placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400",
        className,
      )}
      maxLength={NOTE_LIMIT}
      onBlur={() => {
        flush();
        onDone?.();
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        pending.current = event.target.value;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, NOTE_SAVE_DELAY);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      placeholder="Note"
      ref={field}
      rows={1}
      value={draft}
    />
  );
}

export function SaveError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-label text-sm font-medium text-red-700 dark:text-red-300" role="alert">
      Not saved: {message}
    </p>
  );
}
