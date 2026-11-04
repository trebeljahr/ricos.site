// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../pages/api/dev/demo-review";
import { getServerSideProps } from "../pages/dev/demo-review";
import { computerDemos } from "./computerDemos";
import {
  applyReview,
  countByStatus,
  parseReviewFilter,
  parseReviewUpdate,
  statusOf,
  visibleDemos,
} from "./demoReview";
import { REVIEW_FILE, readDemoReviews, writeDemoReviews } from "./demoReviewStore";

const DAY = "2026-11-04";

describe("reviews", () => {
  it("treats a demo with no record as not reviewed", () => {
    expect(statusOf({}, "clock")).toBe("unreviewed");
  });

  it("merges a status and a note set separately", () => {
    const withStatus = applyReview({}, "clock", { status: "needs-work" }, DAY);
    const both = applyReview(withStatus, "clock", { note: " wobbly " }, "2026-11-05");
    expect(both.clock).toEqual({ status: "needs-work", note: "wobbly", updated: "2026-11-05" });
  });

  it("keeps a note when the status goes back to not reviewed", () => {
    const reviews = applyReview({}, "clock", { status: "good", note: "fine" }, DAY);
    expect(applyReview(reviews, "clock", { status: "unreviewed" }, DAY).clock.note).toBe("fine");
  });

  it("drops the record once neither a status nor a note is left", () => {
    const reviews = applyReview({}, "clock", { status: "good" }, DAY);
    expect(applyReview(reviews, "clock", { status: "unreviewed" }, DAY)).toEqual({});
  });

  it("returns the same record when nothing changed, so the date stays", () => {
    const reviews = applyReview({}, "clock", { status: "good", note: "fine" }, DAY);
    expect(applyReview(reviews, "clock", { note: "fine" }, "2026-12-01")).toBe(reviews);
  });

  it("rejects unknown statuses, long notes and empty updates", () => {
    expect(parseReviewUpdate({ status: "great" })).toBeNull();
    expect(parseReviewUpdate({ note: "x".repeat(1001) })).toBeNull();
    expect(parseReviewUpdate({})).toBeNull();
    expect(parseReviewUpdate({ note: "" })).toEqual({ note: "" });
  });

  it("falls back to all for an unknown filter", () => {
    expect(parseReviewFilter("good")).toBe("good");
    expect(parseReviewFilter("nope")).toBe("all");
    expect(parseReviewFilter(undefined)).toBe("all");
  });

  it("counts every demo once", () => {
    const reviews = applyReview({}, "a", { status: "good" }, DAY);
    expect(countByStatus(["a", "b"], reviews)).toEqual({
      all: 2,
      unreviewed: 1,
      "needs-look": 0,
      "needs-work": 0,
      good: 1,
    });
  });

  it("filters by status but keeps rows changed under this filter", () => {
    const demos = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    const reviews = applyReview({}, "a", { status: "good" }, DAY);
    expect(visibleDemos(demos, reviews, "good", new Set()).map((d) => d.slug)).toEqual(["a"]);
    expect(visibleDemos(demos, reviews, "good", new Set(["c"])).map((d) => d.slug)).toEqual([
      "a",
      "c",
    ]);
    expect(visibleDemos(demos, reviews, "all", new Set())).toHaveLength(3);
  });
});

describe("demo list", () => {
  // The review page lists computerDemos, so a demo page missing there would
  // never come up for review.
  it("holds every demo page", () => {
    const pages = fs
      .readdirSync(path.join("src", "pages", "computer"))
      .filter((file) => file.endsWith(".tsx") && !file.startsWith("["))
      .map((file) => file.replace(".tsx", ""))
      .filter((page) => page !== "index" && page !== "demos");
    expect(pages.sort()).toEqual(computerDemos.map((demo) => demo.slug).sort());
  });
});

describe("store and endpoint", () => {
  let dir: string;

  const call = (
    body: unknown,
    { method = "POST", address = "127.0.0.1" } = {},
  ): { status: number; json: unknown } => {
    const result = { status: 0, json: undefined as unknown };
    const res = {
      setHeader: () => res,
      status(code: number) {
        result.status = code;
        return res;
      },
      json(value: unknown) {
        result.json = value;
        return res;
      },
    };
    handler(
      { method, body, headers: {}, socket: { remoteAddress: address } } as NextApiRequest,
      res as unknown as NextApiResponse,
    );
    return result;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "demo-review-"));
    vi.stubEnv("DIARY_TEXTS_DIR", path.join(dir, "texts"));
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("starts empty and reads back what it wrote, creating the folder", () => {
    expect(readDemoReviews()).toEqual({});
    const reviews = applyReview({}, "clock", { status: "good" }, DAY);
    writeDemoReviews(reviews);
    expect(readDemoReviews()).toEqual(reviews);
    expect(fs.readdirSync(path.join(dir, "texts"))).toEqual([REVIEW_FILE]);
  });

  it("saves a status and then a note to the file", () => {
    expect(call({ slug: "die-zoom", status: "needs-work" }).status).toBe(200);
    expect(call({ slug: "die-zoom", note: "labels overlap" }).status).toBe(200);
    expect(readDemoReviews()["die-zoom"]).toMatchObject({
      status: "needs-work",
      note: "labels overlap",
    });
  });

  it("refuses a demo that does not exist and a status that does not exist", () => {
    expect(call({ slug: "nope", status: "good" }).status).toBe(400);
    expect(call({ slug: "clock", status: "great" }).status).toBe(400);
    expect(readDemoReviews()).toEqual({});
  });

  it("does not overwrite a file it cannot read", () => {
    fs.mkdirSync(path.join(dir, "texts"));
    const file = path.join(dir, "texts", REVIEW_FILE);
    fs.writeFileSync(file, "{ broken");
    expect(call({ slug: "clock", status: "good" }).status).toBe(500);
    expect(fs.readFileSync(file, "utf8")).toBe("{ broken");
  });

  it("serves the page only under next dev, off Vercel, to this machine", async () => {
    const page = (address = "127.0.0.1") =>
      getServerSideProps({
        req: { headers: {}, socket: { remoteAddress: address } },
      } as unknown as GetServerSidePropsContext);

    const served = await page();
    expect(served).toHaveProperty("props");
    expect(await page("192.168.1.20")).toEqual({ notFound: true });
    vi.stubEnv("VERCEL", "1");
    expect(await page()).toEqual({ notFound: true });
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(await page()).toEqual({ notFound: true });
  });

  it("answers 404 outside next dev, on Vercel and for another machine", () => {
    expect(call({ slug: "clock", status: "good" }, { address: "192.168.1.20" }).status).toBe(404);
    vi.stubEnv("VERCEL", "1");
    expect(call({ slug: "clock", status: "good" }).status).toBe(404);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(call({ slug: "clock", status: "good" }).status).toBe(404);
    expect(fs.existsSync(path.join(dir, "texts"))).toBe(false);
  });
});
