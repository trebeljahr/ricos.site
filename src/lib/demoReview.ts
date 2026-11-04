// Rico's review of the computer-series demos: which ones are good and which
// still need him. Pure logic, shared by /dev/demo-review and its endpoint; the
// file itself is handled in demoReviewStore.ts.
//
// A demo with no record is "unreviewed". Only Rico sets a status, in the page.

export const REVIEW_STATUSES = ["unreviewed", "needs-look", "needs-work", "good"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  unreviewed: "Not reviewed",
  "needs-look": "Needs a look",
  "needs-work": "Needs work",
  good: "Good",
};

export type ReviewFilter = ReviewStatus | "all";

export type DemoReview = {
  status: ReviewStatus;
  note: string;
  /** Local calendar day of the last change. */
  updated: string;
};

export type DemoReviews = Record<string, DemoReview>;

export type ReviewUpdate = { status?: ReviewStatus; note?: string };

export const NOTE_LIMIT = 1000;

const isStatus = (value: unknown): value is ReviewStatus =>
  REVIEW_STATUSES.includes(value as ReviewStatus);

export const statusOf = (reviews: DemoReviews, slug: string): ReviewStatus =>
  reviews[slug]?.status ?? "unreviewed";

/** A demo back at "not reviewed" with no note has no record at all. */
export function applyReview(
  reviews: DemoReviews,
  slug: string,
  update: ReviewUpdate,
  day: string,
): DemoReviews {
  const status = update.status ?? statusOf(reviews, slug);
  const note = (update.note ?? reviews[slug]?.note ?? "").trim();
  const previous = reviews[slug];
  if (previous && previous.status === status && previous.note === note) return reviews;

  const { [slug]: _replaced, ...rest } = reviews;
  if (status === "unreviewed" && !note) return rest;
  return { ...rest, [slug]: { status, note, updated: day } };
}

/** Reads a request body. Null when it changes nothing or holds something unknown. */
export function parseReviewUpdate(body: { status?: unknown; note?: unknown }): ReviewUpdate | null {
  const update: ReviewUpdate = {};
  if (body.status !== undefined) {
    if (!isStatus(body.status)) return null;
    update.status = body.status;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== "string" || body.note.length > NOTE_LIMIT) return null;
    update.note = body.note;
  }
  return update.status === undefined && update.note === undefined ? null : update;
}

export const parseReviewFilter = (value: unknown): ReviewFilter =>
  isStatus(value) ? value : "all";

export function countByStatus(
  slugs: readonly string[],
  reviews: DemoReviews,
): Record<ReviewFilter, number> {
  const counts: Record<ReviewFilter, number> = {
    all: slugs.length,
    unreviewed: 0,
    "needs-look": 0,
    "needs-work": 0,
    good: 0,
  };
  for (const slug of slugs) counts[statusOf(reviews, slug)]++;
  return counts;
}

/**
 * The rows a filter shows. `kept` holds demos changed under this filter: they
 * stay until the filter is picked again, so a demo marked good does not vanish
 * before its note is written.
 */
export function visibleDemos<Demo extends { slug: string }>(
  demos: readonly Demo[],
  reviews: DemoReviews,
  filter: ReviewFilter,
  kept: ReadonlySet<string>,
): Demo[] {
  if (filter === "all") return [...demos];
  return demos.filter((demo) => statusOf(reviews, demo.slug) === filter || kept.has(demo.slug));
}
