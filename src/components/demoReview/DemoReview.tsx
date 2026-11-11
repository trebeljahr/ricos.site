import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyReview,
  IMAGE_TYPES,
  NOTE_LIMIT,
  type ReviewState,
  type ReviewUpdate,
  stageOf,
} from "src/lib/demoReview";
import { type ReviewSeries, reviewApi } from "src/lib/demoReviewSeries";

// The controls of the demo review, used by the bar on each demo page of every
// series. Development only: nothing here reaches a production page.

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

/** Each series' link colour on hover, matching its demo pages. */
export const HOVER_TEXT: Record<ReviewSeries, string> = {
  computer: "hover:text-cyan-600 dark:hover:text-cyan-300",
  piano: "hover:text-orange-700 dark:hover:text-orange-300",
};

export const HOVER_BORDER: Record<ReviewSeries, string> = {
  computer: "hover:border-cyan-500 dark:hover:border-cyan-400",
  piano: "hover:border-orange-500 dark:hover:border-orange-400",
};

export type DemoReviewApi = {
  state: ReviewState;
  change: (slug: string, update: ReviewUpdate) => void;
  /** Uploads pasted or dropped screenshots and adds them to the note. */
  addImages: (slug: string, files: File[]) => void;
  saveError: string | null;
};

export const imageUrl = (series: ReviewSeries, name: string) => reviewApi(series, { image: name });

const isPastedImage = (file: File) => file.type in IMAGE_TYPES;

/** The image files in a paste or a drop. */
export const imagesIn = (data: DataTransfer | null): File[] =>
  Array.from(data?.files ?? []).filter(isPastedImage);

const base64Of = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** The saved review and a way to change it, one save at a time. */
export function useDemoReview(series: ReviewSeries, initial: ReviewState): DemoReviewApi {
  const [state, setState] = useState(initial);
  const [saveError, setSaveError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());

  const change = useCallback(
    (slug: string, update: ReviewUpdate) => {
      setState((current) => ({
        ...current,
        reviews: applyReview(current.reviews, slug, update, new Date()),
      }));
      // One at a time, so an older save can never land after a newer one.
      queue.current = queue.current.then(async () => {
        try {
          const response = await fetch(reviewApi(series), {
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
    },
    [series],
  );

  const addImages = useCallback(
    (slug: string, files: File[]) => {
      for (const file of files) {
        queue.current = queue.current.then(async () => {
          try {
            const response = await fetch(reviewApi(series), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slug,
                image: { type: file.type, data: await base64Of(file) },
              }),
            });
            const body = (await response.json().catch(() => ({}))) as {
              image?: string;
              error?: string;
            };
            if (!response.ok || !body.image)
              throw new Error(body.error ?? `HTTP ${response.status}`);
            const saved = body.image;
            setState((current) => ({
              ...current,
              reviews: applyReview(
                current.reviews,
                slug,
                { images: [...(current.reviews[slug]?.images ?? []), saved] },
                new Date(),
              ),
            }));
            setSaveError(null);
          } catch (error) {
            setSaveError(`${slug} screenshot: ${String(error)}`);
          }
        });
      }
    },
    [series],
  );

  return { state, change, addImages, saveError };
}

/** The saved review, or null where the endpoint does not answer (another machine). */
export async function fetchDemoReview(series: ReviewSeries): Promise<ReviewState | null> {
  const response = await fetch(reviewApi(series));
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
  onImages,
}: {
  title: string;
  initial: string;
  focus?: boolean;
  className?: string;
  onSave: (note: string) => void;
  /** Screenshots pasted or dropped into the note. */
  onImages?: (files: File[]) => void;
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
      onDragOver={(event) => {
        if (onImages && event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        const files = imagesIn(event.dataTransfer);
        if (!onImages || files.length === 0) return;
        event.preventDefault();
        onImages(files);
      }}
      onPaste={(event) => {
        const files = imagesIn(event.clipboardData);
        if (!onImages || files.length === 0) return;
        // A copied file can come with its name as text; keep only the picture.
        event.preventDefault();
        onImages(files);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      placeholder={onImages ? "Note (paste or drop screenshots)" : "Note"}
      ref={field}
      rows={1}
      value={draft}
    />
  );
}

/** Thumbnails of a note's screenshots, each opening full size; removable when live. */
export function ReviewImages({
  series,
  images,
  onRemove,
}: {
  series: ReviewSeries;
  images: readonly string[] | undefined;
  onRemove?: (name: string) => void;
}) {
  if (!images?.length) return null;
  return (
    <ul className="not-prose m-0 mt-label flex list-none flex-wrap gap-tight p-0">
      {images.map((name, index) => (
        <li className="relative m-0 p-0" key={name}>
          <a href={imageUrl(series, name)} rel="noreferrer" target="_blank">
            {/* biome-ignore lint/performance/noImgElement: dev-only, served from private Notes */}
            <img
              alt={`Screenshot ${index + 1}`}
              className="m-0 block h-20 w-auto max-w-40 rounded border border-gray-300 object-cover dark:border-gray-700"
              src={imageUrl(series, name)}
            />
          </a>
          {onRemove && (
            <button
              aria-label={`Remove screenshot ${index + 1}`}
              className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-gray-900/80 text-xs text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
              onClick={() => onRemove(name)}
              type="button"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
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
