// The demo series Rico reviews, each with its own queue and its own record in
// private Notes. Everything else about the review (stages, rounds, the queue
// order) is the same for all of them; see demoReview.ts.

import { computerDemos } from "./computerDemos";
import { pianoDemos } from "./pianoDemos";

export type ReviewSeriesConfig = {
  /** The demos, in the order the series lists them. */
  demos: readonly { slug: string; title: string }[];
  /** Where a demo's page is. */
  path: string;
  /** The record, in Notes/texts. */
  file: string;
  /** Pasted screenshots, a folder next to the record. */
  imageDir: string;
};

export const REVIEW_SERIES = {
  computer: {
    demos: computerDemos,
    path: "/computer",
    file: "demo-review.json",
    imageDir: "demo-review-images",
  },
  piano: {
    demos: pianoDemos,
    path: "/piano",
    file: "piano-demo-review.json",
    imageDir: "piano-demo-review-images",
  },
} as const satisfies Record<string, ReviewSeriesConfig>;

export type ReviewSeries = keyof typeof REVIEW_SERIES;

export const isReviewSeries = (value: unknown): value is ReviewSeries =>
  typeof value === "string" && Object.hasOwn(REVIEW_SERIES, value);

export const seriesDemos = (series: ReviewSeries): ReviewSeriesConfig["demos"] =>
  REVIEW_SERIES[series].demos;

export const demoHref = (series: ReviewSeries, slug: string) =>
  `${REVIEW_SERIES[series].path}/${slug}`;

export const demoTitle = (series: ReviewSeries, slug: string) =>
  seriesDemos(series).find((demo) => demo.slug === slug)?.title ?? slug;

const API = "/api/dev/demo-review";

/** The review endpoint for one series, with any more query parameters. */
export const reviewApi = (series: ReviewSeries, query: Record<string, string> = {}) =>
  `${API}?${new URLSearchParams({ series, ...query })}`;
