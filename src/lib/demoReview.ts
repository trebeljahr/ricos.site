// Rico's review of the computer-series demos. Pure logic, shared by
// /computer/demos, the bar on each demo page and the endpoint; the file itself
// is handled in demoReviewStore.ts.
//
// A demo has one of three stages, and the demo list is sorted by them:
//   queue     never looked at, or changed since its last rejection
//   rejected  rejected, and no work done since
//   accepted
// Only Rico sets a verdict. Work done is read from git (see demoWork.ts).

export const REVIEW_VERDICTS = ["accepted", "rejected"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const REVIEW_STAGES = ["queue", "rejected", "accepted"] as const;
export type ReviewStage = (typeof REVIEW_STAGES)[number];

export type DemoReview = {
  verdict?: ReviewVerdict;
  note: string;
  /** Local calendar day of the last change. */
  updated: string;
  /** Milliseconds; set on each rejection and compared with the last commit. */
  rejectedAt?: number;
};

export type DemoReviews = Record<string, DemoReview>;

/** Last commit touching each demo, in milliseconds. Only rejected demos need one. */
export type DemoWork = Record<string, number>;

/** `verdict: null` puts a demo back in the queue by hand. */
export type ReviewUpdate = { verdict?: ReviewVerdict | null; note?: string };

export type ReviewState = { reviews: DemoReviews; work: DemoWork };

export const NOTE_LIMIT = 1000;

const isVerdict = (value: unknown): value is ReviewVerdict =>
  REVIEW_VERDICTS.includes(value as ReviewVerdict);

const localDay = (now: Date) => {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** A rejected demo with commits after its rejection is back in the queue. */
export const isReworked = ({ reviews, work }: ReviewState, slug: string): boolean => {
  const review = reviews[slug];
  return review?.verdict === "rejected" && (work[slug] ?? 0) > (review.rejectedAt ?? 0);
};

export function stageOf(state: ReviewState, slug: string): ReviewStage {
  const verdict = state.reviews[slug]?.verdict;
  if (!verdict || isReworked(state, slug)) return "queue";
  return verdict;
}

/**
 * Setting a verdict always counts, even the same one again: rejecting a reworked
 * demo has to restart its rejection. A demo left with no verdict and no note has
 * no record at all.
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
  if (update.verdict === undefined && previous?.note === note) return reviews;

  const { [slug]: _replaced, ...rest } = reviews;
  if (!verdict && !note) return rest;

  const review: DemoReview = { note, updated: localDay(now) };
  if (verdict) review.verdict = verdict;
  if (verdict === "rejected") {
    review.rejectedAt = update.verdict === "rejected" ? now.getTime() : previous?.rejectedAt;
  }
  return { ...rest, [slug]: review };
}

/** Reads a request body. Null when it changes nothing or holds something unknown. */
export function parseReviewUpdate(body: {
  verdict?: unknown;
  note?: unknown;
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
  return update.verdict === undefined && update.note === undefined ? null : update;
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

/** The next demo waiting for a look after this one, wrapping round. Never itself. */
export function nextInQueue<Demo extends { slug: string }>(
  demos: readonly Demo[],
  state: ReviewState,
  current: string,
): Demo | undefined {
  const start = demos.findIndex((demo) => demo.slug === current);
  const ordered = [...demos.slice(start + 1), ...demos.slice(0, Math.max(start, 0))];
  return ordered.find((demo) => demo.slug !== current && stageOf(state, demo.slug) === "queue");
}
