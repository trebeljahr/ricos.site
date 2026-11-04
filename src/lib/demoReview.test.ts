// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../pages/api/dev/demo-review";
import { getServerSideProps } from "../pages/computer/demos";
import { computerDemos } from "./computerDemos";
import {
  applyReview,
  type DemoReviews,
  groupByStage,
  isReworked,
  nextInQueue,
  parseReviewUpdate,
  stageOf,
} from "./demoReview";
import { REVIEW_FILE, readDemoReviews, writeDemoReviews } from "./demoReviewStore";
import { demoFiles, readDemoWork } from "./demoWork";

const NOW = new Date(2026, 10, 4, 12);
const LATER = new Date(2026, 10, 5, 12);
const rejected = (slug = "clock", at = NOW) => applyReview({}, slug, { verdict: "rejected" }, at);

describe("stages", () => {
  it("starts every demo in the queue", () => {
    expect(stageOf({ reviews: {}, work: {} }, "clock")).toBe("queue");
  });

  it("moves a demo to accepted and to rejected", () => {
    const reviews = applyReview({}, "a", { verdict: "accepted" }, NOW);
    expect(stageOf({ reviews, work: {} }, "a")).toBe("accepted");
    expect(stageOf({ reviews: rejected(), work: {} }, "clock")).toBe("rejected");
  });

  it("sends a rejected demo back to the queue after a later commit, note kept", () => {
    const reviews = applyReview(rejected(), "clock", { note: "wobbly" }, NOW);
    const state = { reviews, work: { clock: LATER.getTime() } };
    expect(stageOf(state, "clock")).toBe("queue");
    expect(isReworked(state, "clock")).toBe(true);
    expect(reviews.clock.note).toBe("wobbly");
  });

  it("keeps a rejected demo rejected when its last commit is older", () => {
    const state = { reviews: rejected("clock", LATER), work: { clock: NOW.getTime() } };
    expect(stageOf(state, "clock")).toBe("rejected");
  });

  it("restarts the rejection when a reworked demo is rejected again", () => {
    const again = applyReview(rejected(), "clock", { verdict: "rejected" }, LATER);
    const state = { reviews: again, work: { clock: LATER.getTime() - 1000 } };
    expect(stageOf(state, "clock")).toBe("rejected");
  });

  it("does not restart the rejection when only the note changes", () => {
    const reviews = applyReview(rejected(), "clock", { note: "later thought" }, LATER);
    expect(reviews.clock.rejectedAt).toBe(NOW.getTime());
  });

  it("leaves accepted demos accepted whatever gets committed", () => {
    const reviews = applyReview({}, "a", { verdict: "accepted" }, NOW);
    expect(stageOf({ reviews, work: { a: LATER.getTime() } }, "a")).toBe("accepted");
  });

  it("puts a demo back in the queue by hand, keeping a note", () => {
    const noted = applyReview(rejected(), "clock", { note: "wobbly" }, NOW);
    const back = applyReview(noted, "clock", { verdict: null }, LATER);
    expect(stageOf({ reviews: back, work: {} }, "clock")).toBe("queue");
    expect(back.clock.note).toBe("wobbly");
    expect(back.clock.rejectedAt).toBeUndefined();
  });

  it("drops the record once neither a verdict nor a note is left", () => {
    expect(applyReview(rejected(), "clock", { verdict: null }, LATER)).toEqual({});
  });

  it("returns the same record when a note did not change", () => {
    const reviews = applyReview(rejected(), "clock", { note: " same " }, NOW);
    expect(applyReview(reviews, "clock", { note: "same" }, LATER)).toBe(reviews);
  });

  it("rejects unknown verdicts, long notes and empty updates", () => {
    expect(parseReviewUpdate({ verdict: "great" })).toBeNull();
    expect(parseReviewUpdate({ note: "x".repeat(1001) })).toBeNull();
    expect(parseReviewUpdate({})).toBeNull();
    expect(parseReviewUpdate({ verdict: null })).toEqual({ verdict: null });
    expect(parseReviewUpdate({ note: "" })).toEqual({ note: "" });
  });
});

describe("order", () => {
  const demos = ["a", "b", "c", "d"].map((slug) => ({ slug }));

  it("groups by stage, keeping the order within each", () => {
    let reviews: DemoReviews = applyReview({}, "a", { verdict: "accepted" }, NOW);
    reviews = applyReview(reviews, "c", { verdict: "rejected" }, NOW);
    const groups = groupByStage(demos, (slug) => stageOf({ reviews, work: {} }, slug));
    expect(groups.queue.map((d) => d.slug)).toEqual(["b", "d"]);
    expect(groups.rejected.map((d) => d.slug)).toEqual(["c"]);
    expect(groups.accepted.map((d) => d.slug)).toEqual(["a"]);
  });

  it("finds the next demo in the queue, wrapping round and never itself", () => {
    const reviews = applyReview({}, "c", { verdict: "accepted" }, NOW);
    const state = { reviews, work: {} };
    expect(nextInQueue(demos, state, "b")?.slug).toBe("d");
    expect(nextInQueue(demos, state, "d")?.slug).toBe("a");
    const only = { reviews: { ...rejected("a"), ...rejected("b"), ...rejected("d") }, work: {} };
    expect(nextInQueue(demos, { ...only, reviews: { ...only.reviews, ...reviews } }, "a")).toBe(
      undefined,
    );
  });
});

describe("demo files", () => {
  // The list is computerDemos, so a demo page missing there is never reviewed.
  it("holds every demo page", () => {
    const pages = fs
      .readdirSync(path.join("src", "pages", "computer"))
      .filter((file) => file.endsWith(".tsx") && !file.startsWith("["))
      .map((file) => file.replace(".tsx", ""))
      .filter((page) => page !== "index" && page !== "demos");
    expect(pages.sort()).toEqual(computerDemos.map((demo) => demo.slug).sort());
  });

  // Each demo gets its own page, so each can be reviewed on its own.
  const pagesDir = path.join("src", "pages", "computer");
  const pageText = (slug: string) => fs.readFileSync(path.join(pagesDir, `${slug}.tsx`), "utf8");
  const mdxNames = [
    ...fs
      .readFileSync(path.join("src", "components", "computer", "MdxComputerDemos.tsx"), "utf8")
      .split("COMPUTER_MDX_DEMOS")[1]
      .matchAll(/^ {2}([A-Z]\w+):/gm),
  ].map((match) => match[1]);
  const uses = (text: string, name: string) =>
    text.match(new RegExp(`<${name}[\\s/>]`, "g"))?.length ?? 0;

  it("shows one demo per page", () => {
    // A test page for embedding several builders, not a demo to read.
    const crowded = computerDemos
      .filter(({ slug }) => slug !== "builders-on-one-page")
      .filter(({ slug }) => {
        const text = pageText(slug);
        return mdxNames.reduce((count, name) => count + uses(text, name), 0) > 1;
      });
    expect(crowded).toEqual([]);
  });

  it("gives every chapter demo a page", () => {
    const pages = computerDemos.map(({ slug }) => pageText(slug)).join("\n");
    // Shelved, and two chapter lessons made of demos that have their own pages.
    const exempt = ["TruthTableScale", "TransistorGateLessons", "DecoderLesson"];
    expect(mdxNames.filter((name) => !exempt.includes(name) && !uses(pages, name))).toEqual([]);
  });

  it("counts a demo's own component as its work, and not the shared nav", () => {
    const files = demoFiles();
    expect(files["die-zoom"]).toContain(path.join("src", "pages", "computer", "die-zoom.tsx"));
    expect(files["die-zoom"]).toContain(path.join("src", "components", "computer", "DieZoom.tsx"));
    expect(files["die-zoom"]).not.toContain(
      path.join("src", "components", "computer", "ComputerDemoNav.tsx"),
    );
  });

  it("keeps the wrapper shared by demo pages out of a demo's work", () => {
    expect(demoFiles()["half-adder"]).not.toContain(
      path.join("src", "components", "computer", "DeviceDemoPage.tsx"),
    );
  });

  it("reads a last commit for rejected demos only", () => {
    const reviews = {
      ...rejected("die-zoom"),
      ...applyReview({}, "clock", { verdict: "accepted" }, NOW),
    };
    const work = readDemoWork(reviews);
    expect(Object.keys(work)).toEqual(["die-zoom"]);
    expect(work["die-zoom"]).toBeGreaterThan(0);
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
    const reviews = rejected();
    writeDemoReviews(reviews);
    expect(readDemoReviews()).toEqual(reviews);
    expect(fs.readdirSync(path.join(dir, "texts"))).toEqual([REVIEW_FILE]);
  });

  it("saves a verdict and then a note, and serves them back", () => {
    expect(call({ slug: "die-zoom", verdict: "rejected" }).status).toBe(200);
    expect(call({ slug: "die-zoom", note: "labels overlap" }).status).toBe(200);
    expect(readDemoReviews()["die-zoom"]).toMatchObject({
      verdict: "rejected",
      note: "labels overlap",
    });
    const read = call(undefined, { method: "GET" });
    expect(read.status).toBe(200);
    expect(read.json).toMatchObject({ reviews: { "die-zoom": { verdict: "rejected" } } });
  });

  it("refuses a demo that does not exist and a verdict that does not exist", () => {
    expect(call({ slug: "nope", verdict: "accepted" }).status).toBe(400);
    expect(call({ slug: "clock-scope", verdict: "great" }).status).toBe(400);
    expect(readDemoReviews()).toEqual({});
  });

  it("does not overwrite a file it cannot read", () => {
    fs.mkdirSync(path.join(dir, "texts"));
    const file = path.join(dir, "texts", REVIEW_FILE);
    fs.writeFileSync(file, "{ broken");
    expect(call({ slug: "clock-scope", verdict: "accepted" }).status).toBe(500);
    expect(fs.readFileSync(file, "utf8")).toBe("{ broken");
  });

  it("answers 404 outside next dev, on Vercel and for another machine", () => {
    const body = { slug: "clock-scope", verdict: "accepted" };
    expect(call(body, { address: "192.168.1.20" }).status).toBe(404);
    expect(call(undefined, { method: "GET", address: "192.168.1.20" }).status).toBe(404);
    vi.stubEnv("VERCEL", "1");
    expect(call(body).status).toBe(404);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(call(body).status).toBe(404);
    expect(fs.existsSync(path.join(dir, "texts"))).toBe(false);
  });

  it("serves the demo list only under next dev, with the review only to this machine", async () => {
    const page = (address = "127.0.0.1") =>
      getServerSideProps({
        req: { headers: {}, socket: { remoteAddress: address } },
      } as unknown as GetServerSidePropsContext);

    expect(await page()).toEqual({ props: { review: { reviews: {}, work: {} } } });
    expect(await page("192.168.1.20")).toEqual({ props: { review: null } });
    vi.stubEnv("NODE_ENV", "production");
    expect(await page()).toEqual({ notFound: true });
  });
});
