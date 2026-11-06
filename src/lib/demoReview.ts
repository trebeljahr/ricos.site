// Rico's review of the computer-series demos. Pure logic, shared by
// /computer/demos, the bar on each demo page, the endpoint and
// `pnpm demo:addressed`; the file itself is handled in demoReviewStore.ts.
//
// A demo has one of three stages, and the demo list is sorted by them:
//   queue     never looked at, or its feedback was addressed
//   rejected  rejected, and the feedback not addressed yet
//   accepted
// Only Rico sets a verdict. Marking feedback addressed closes the round: the note
// moves to `rounds` with what was done about it, and the demo waits at the end of
// the queue for a fresh verdict.

export const REVIEW_VERDICTS = ["accepted", "rejected"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const REVIEW_STAGES = ["queue", "rejected", "accepted"] as const;
export type ReviewStage = (typeof REVIEW_STAGES)[number];

/** One finished iteration: Rico's feedback and the answer to it. */
export type ReviewRound = {
  note: string;
  /** Screenshots that came with the note, file names in REVIEW_IMAGE_DIR. */
  images?: string[];
  rejectedAt?: number;
  addressedAt: number;
  summary: string;
  commit?: string;
};

export type DemoReview = {
  verdict?: ReviewVerdict;
  note: string;
  /** Pasted screenshots, file names in REVIEW_IMAGE_DIR, oldest first. */
  images?: string[];
  /** Local calendar day of the last change. */
  updated: string;
  /** Milliseconds; set on each rejection. */
  rejectedAt?: number;
  /** Finished iterations, oldest first. */
  rounds?: ReviewRound[];
};

export type DemoReviews = Record<string, DemoReview>;

/** `verdict: null` puts a demo back in the queue by hand. */
export type ReviewUpdate = {
  verdict?: ReviewVerdict | null;
  note?: string;
  /** The full list of screenshots, replacing the old one. */
  images?: string[];
};

export type ReviewState = { reviews: DemoReviews };

/** Only a guard against a runaway request; a note may be as long as it needs. */
export const NOTE_LIMIT = 100_000;

/** Screenshots live next to the record, in the same private Notes folder. */
export const REVIEW_IMAGE_DIR = "demo-review-images";
export const IMAGE_LIMIT = 30;

export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

const IMAGE_NAME = /^[a-z0-9-]+-\d+(-\d+)?\.(png|jpg|webp|gif)$/;

export const isImageName = (value: unknown): value is string =>
  typeof value === "string" && IMAGE_NAME.test(value);

const sameList = (a: readonly string[] = [], b: readonly string[] = []) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const isVerdict = (value: unknown): value is ReviewVerdict =>
  REVIEW_VERDICTS.includes(value as ReviewVerdict);

const localDay = (now: Date) => {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export function stageOf({ reviews }: ReviewState, slug: string): ReviewStage {
  return reviews[slug]?.verdict ?? "queue";
}

/** A demo waiting for a new look after its feedback was addressed. */
export const isReworked = (state: ReviewState, slug: string): boolean =>
  stageOf(state, slug) === "queue" && (state.reviews[slug]?.rounds?.length ?? 0) > 0;

/**
 * The iteration a demo is on, from 1. A closed round counts until a new verdict
 * opens the next one, so an addressed demo already reads as its next round.
 */
export const roundOf = (review: DemoReview | undefined): number =>
  (review?.rounds?.length ?? 0) + 1;

/**
 * Setting a verdict always counts, even the same one again. Finished rounds stay
 * whatever happens. A demo left with no verdict, no note and no rounds has no
 * record at all.
 */
export function applyReview(
  reviews: DemoReviews,
  slug: string,
  update: ReviewUpdate,
  now: Date,
): DemoReviews {
  const previous = reviews[slug];
  const note = (update.note ?? previous?.note ?? "").trim();
  const verdict = update.verdict === undefined ? previous?.verdict : (update.verdict ?? undefined);
  const images = update.images ?? previous?.images ?? [];
  if (
    update.verdict === undefined &&
    previous?.note === note &&
    sameList(previous?.images, images)
  ) {
    return reviews;
  }

  const { [slug]: _replaced, ...rest } = reviews;
  const rounds = previous?.rounds;
  if (!verdict && !note && !images.length && !rounds?.length) return rest;

  const review: DemoReview = { note, updated: localDay(now) };
  if (images.length) review.images = images;
  if (verdict) review.verdict = verdict;
  if (verdict === "rejected") {
    review.rejectedAt = update.verdict === "rejected" ? now.getTime() : previous?.rejectedAt;
  }
  if (rounds?.length) review.rounds = rounds;
  return { ...rest, [slug]: review };
}

/**
 * Closes a rejected demo's round, which puts it at the end of the queue. Throws for
 * any other demo: only feedback Rico rejected with can be addressed, and a mistyped
 * slug must not write anything.
 */
export function markAddressed(
  reviews: DemoReviews,
  slug: string,
  { summary, commit }: { summary: string; commit?: string },
  now: Date,
): DemoReviews {
  const previous = reviews[slug];
  if (previous?.verdict !== "rejected") throw new Error(`${slug} is not rejected`);
  const text = summary.trim();
  if (!text) throw new Error("Say what was done");

  const round: ReviewRound = { note: previous.note, addressedAt: now.getTime(), summary: text };
  if (previous.images?.length) round.images = previous.images;
  if (previous.rejectedAt !== undefined) round.rejectedAt = previous.rejectedAt;
  if (commit) round.commit = commit;
  return {
    ...reviews,
    [slug]: { note: "", updated: localDay(now), rounds: [...(previous.rounds ?? []), round] },
  };
}

/** Reads a request body. Null when it changes nothing or holds something unknown. */
export function parseReviewUpdate(body: {
  verdict?: unknown;
  note?: unknown;
  images?: unknown;
}): ReviewUpdate | null {
  const update: ReviewUpdate = {};
  if (body.verdict !== undefined) {
    if (body.verdict !== null && !isVerdict(body.verdict)) return null;
    update.verdict = body.verdict;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== "string" || body.note.length > NOTE_LIMIT) return null;
    update.note = body.note;
  }
  if (body.images !== undefined) {
    if (
      !Array.isArray(body.images) ||
      body.images.length > IMAGE_LIMIT ||
      !body.images.every(isImageName)
    ) {
      return null;
    }
    update.images = body.images;
  }
  return Object.keys(update).length === 0 ? null : update;
}

/** The demos by stage, each stage keeping the order it was given. */
export function groupByStage<Demo extends { slug: string }>(
  demos: readonly Demo[],
  stage: (slug: string) => ReviewStage,
): Record<ReviewStage, Demo[]> {
  const groups: Record<ReviewStage, Demo[]> = { queue: [], rejected: [], accepted: [] };
  for (const demo of demos) groups[stage(demo.slug)].push(demo);
  return groups;
}

const addressedAt = (state: ReviewState, slug: string) =>
  state.reviews[slug]?.rounds?.at(-1)?.addressedAt ?? 0;

/** Reworked demos waiting for a look, the longest waiting first. */
function reworkedInOrder<Demo extends { slug: string }>(
  demos: readonly Demo[],
  state: ReviewState,
): Demo[] {
  return demos
    .filter((demo) => isReworked(state, demo.slug))
    .sort((a, b) => addressedAt(state, a.slug) - addressedAt(state, b.slug));
}

/** The queue as it gets worked through: new demos first, reworked ones at the end. */
export function queueInOrder<Demo extends { slug: string }>(
  demos: readonly Demo[],
  state: ReviewState,
): Demo[] {
  const fresh = demos.filter(
    (demo) => stageOf(state, demo.slug) === "queue" && !isReworked(state, demo.slug),
  );
  return [...fresh, ...reworkedInOrder(demos, state)];
}

const after = <Demo extends { slug: string }>(demos: readonly Demo[], current: string): Demo[] => {
  const start = demos.findIndex((demo) => demo.slug === current);
  return [...demos.slice(start + 1), ...demos.slice(0, Math.max(start, 0))];
};

/** How many demos wait for a first look, and how many for a look after rework. */
export function queueCounts(
  demos: readonly { slug: string }[],
  state: ReviewState,
): { fresh: number; reworked: number } {
  let fresh = 0;
  let reworked = 0;
  for (const { slug } of demos) {
    if (stageOf(state, slug) !== "queue") continue;
    if (isReworked(state, slug)) reworked += 1;
    else fresh += 1;
  }
  return { fresh, reworked };
}

/**
 * The next demo waiting for a look after this one, wrapping round. Never itself.
 * Reworked demos only come up once no new demo is left.
 */
export function nextInQueue<Demo extends { slug: string }>(
  demos: readonly Demo[],
  state: ReviewState,
  current: string,
): Demo | undefined {
  const fresh = after(demos, current).find(
    (demo) => stageOf(state, demo.slug) === "queue" && !isReworked(state, demo.slug),
  );
  return fresh ?? after(reworkedInOrder(demos, state), current)[0];
}
