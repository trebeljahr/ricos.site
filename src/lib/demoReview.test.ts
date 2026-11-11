// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../pages/api/dev/demo-review";
import { getServerSideProps } from "../pages/computer/demos";
import { getServerSideProps as getPianoServerSideProps } from "../pages/piano/demos";
import { UNIVERSAL_GATE_LEVELS } from "./computer/tutorial/levels/universalGates";
import { computerDemos } from "./computerDemos";
import {
  applyReview,
  type DemoReviews,
  groupByStage,
  isReworked,
  markAddressed,
  NOTE_LIMIT,
  nextInQueue,
  parseReviewUpdate,
  queueCounts,
  queueInOrder,
  roundOf,
  stageOf,
} from "./demoReview";
import { REVIEW_SERIES } from "./demoReviewSeries";
import { readDemoReviews, writeDemoReviews } from "./demoReviewStore";
import { pianoDemos } from "./pianoDemos";

const REVIEW_FILE = REVIEW_SERIES.computer.file;

const NOW = new Date(2026, 10, 4, 12);
const LATER = new Date(2026, 10, 5, 12);
const rejected = (slug = "clock", at = NOW) => applyReview({}, slug, { verdict: "rejected" }, at);

describe("stages", () => {
  it("starts every demo in the queue", () => {
    expect(stageOf({ reviews: {} }, "clock")).toBe("queue");
  });

  it("moves a demo to accepted and to rejected", () => {
    const reviews = applyReview({}, "a", { verdict: "accepted" }, NOW);
    expect(stageOf({ reviews }, "a")).toBe("accepted");
    expect(stageOf({ reviews: rejected() }, "clock")).toBe("rejected");
  });

  it("keeps a rejected demo rejected until its feedback is addressed", () => {
    expect(stageOf({ reviews: rejected() }, "clock")).toBe("rejected");
  });

  it("closes the round when feedback is addressed, and sends the demo to the queue", () => {
    const noted = applyReview(rejected(), "clock", { note: "wobbly" }, NOW);
    const reviews = markAddressed(noted, "clock", { summary: "steadied", commit: "abc" }, LATER);
    const state = { reviews };
    expect(stageOf(state, "clock")).toBe("queue");
    expect(isReworked(state, "clock")).toBe(true);
    expect(reviews.clock.note).toBe("");
    expect(reviews.clock.rounds).toEqual([
      {
        note: "wobbly",
        rejectedAt: NOW.getTime(),
        addressedAt: LATER.getTime(),
        summary: "steadied",
        commit: "abc",
      },
    ]);
    expect(roundOf(reviews.clock)).toBe(2);
  });

  it("only addresses rejected demos, and only with a summary", () => {
    expect(() => markAddressed({}, "clock", { summary: "x" }, NOW)).toThrow("not rejected");
    const accepted = applyReview({}, "clock", { verdict: "accepted" }, NOW);
    expect(() => markAddressed(accepted, "clock", { summary: "x" }, NOW)).toThrow("not rejected");
    expect(() => markAddressed(rejected(), "clock", { summary: " " }, NOW)).toThrow();
  });

  it("keeps every round through new verdicts and notes", () => {
    const first = markAddressed(rejected(), "clock", { summary: "one" }, NOW);
    const again = applyReview(first, "clock", { verdict: "rejected" }, LATER);
    const noted = applyReview(again, "clock", { note: "still off" }, LATER);
    expect(stageOf({ reviews: noted }, "clock")).toBe("rejected");
    const second = markAddressed(noted, "clock", { summary: "two" }, LATER);
    expect(second.clock.rounds?.map(({ summary }) => summary)).toEqual(["one", "two"]);
    const accepted = applyReview(second, "clock", { verdict: "accepted" }, LATER);
    expect(accepted.clock.rounds).toHaveLength(2);
    expect(isReworked({ reviews: accepted }, "clock")).toBe(false);
    const back = applyReview(accepted, "clock", { verdict: null }, LATER);
    expect(back.clock.rounds).toHaveLength(2);
  });

  it("does not restart the rejection when only the note changes", () => {
    const reviews = applyReview(rejected(), "clock", { note: "later thought" }, LATER);
    expect(reviews.clock.rejectedAt).toBe(NOW.getTime());
  });

  it("puts a demo back in the queue by hand, keeping a note", () => {
    const noted = applyReview(rejected(), "clock", { note: "wobbly" }, NOW);
    const back = applyReview(noted, "clock", { verdict: null }, LATER);
    expect(stageOf({ reviews: back }, "clock")).toBe("queue");
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
    expect(parseReviewUpdate({ note: "x".repeat(NOTE_LIMIT + 1) })).toBeNull();
    expect(parseReviewUpdate({ note: "x".repeat(5000) })).toEqual({ note: "x".repeat(5000) });
    expect(parseReviewUpdate({ images: ["../texts/diary.png"] })).toBeNull();
    expect(parseReviewUpdate({ images: "clock-1.png" })).toBeNull();
    expect(parseReviewUpdate({ images: ["clock-1.png"] })).toEqual({ images: ["clock-1.png"] });
    expect(parseReviewUpdate({})).toBeNull();
    expect(parseReviewUpdate({ verdict: null })).toEqual({ verdict: null });
    expect(parseReviewUpdate({ note: "" })).toEqual({ note: "" });
  });
});

describe("screenshots", () => {
  it("keeps a record that holds only screenshots, and drops it once they are gone", () => {
    const withImage = applyReview({}, "clock", { images: ["clock-1.png"] }, NOW);
    expect(withImage.clock).toMatchObject({ note: "", images: ["clock-1.png"] });
    expect(applyReview(withImage, "clock", { images: [] }, NOW)).toEqual({});
  });

  it("keeps screenshots through note and verdict changes", () => {
    let reviews = applyReview(rejected(), "clock", { images: ["clock-1.png"] }, NOW);
    reviews = applyReview(reviews, "clock", { note: "wires cross" }, NOW);
    expect(reviews.clock.images).toEqual(["clock-1.png"]);
    expect(applyReview(reviews, "clock", { images: ["clock-1.png"] }, LATER)).toBe(reviews);
  });

  it("moves screenshots into the round when feedback is addressed", () => {
    const reviews = applyReview(rejected(), "clock", { images: ["clock-1.png"] }, NOW);
    const addressed = markAddressed(reviews, "clock", { summary: "fixed" }, LATER);
    expect(addressed.clock.images).toBeUndefined();
    expect(addressed.clock.rounds?.[0].images).toEqual(["clock-1.png"]);
  });
});

describe("order", () => {
  const demos = ["a", "b", "c", "d"].map((slug) => ({ slug }));

  it("groups by stage, keeping the order within each", () => {
    let reviews: DemoReviews = applyReview({}, "a", { verdict: "accepted" }, NOW);
    reviews = applyReview(reviews, "c", { verdict: "rejected" }, NOW);
    const groups = groupByStage(demos, (slug) => stageOf({ reviews }, slug));
    expect(groups.queue.map((d) => d.slug)).toEqual(["b", "d"]);
    expect(groups.rejected.map((d) => d.slug)).toEqual(["c"]);
    expect(groups.accepted.map((d) => d.slug)).toEqual(["a"]);
  });

  it("finds the next demo in the queue, wrapping round and never itself", () => {
    const reviews = applyReview({}, "c", { verdict: "accepted" }, NOW);
    const state = { reviews };
    expect(nextInQueue(demos, state, "b")?.slug).toBe("d");
    expect(nextInQueue(demos, state, "d")?.slug).toBe("a");
    const only = { reviews: { ...rejected("a"), ...rejected("b"), ...rejected("d") } };
    expect(nextInQueue(demos, { ...only, reviews: { ...only.reviews, ...reviews } }, "a")).toBe(
      undefined,
    );
  });
});

describe("queue counts", () => {
  it("splits the queue into new and reworked demos", () => {
    const demos = [{ slug: "a" }, { slug: "b" }, { slug: "c" }, { slug: "d" }];
    let reviews = applyReview({}, "a", { verdict: "accepted" }, NOW);
    reviews = markAddressed(
      applyReview(reviews, "b", { verdict: "rejected" }, NOW),
      "b",
      {
        summary: "done",
      },
      NOW,
    );
    reviews = applyReview(reviews, "c", { verdict: "rejected" }, NOW);
    expect(queueCounts(demos, { reviews })).toEqual({ fresh: 1, reworked: 1 });
  });
});

describe("reworked demos", () => {
  const demos = ["a", "b", "c", "d"].map((slug) => ({ slug }));
  const addressed = (reviews: DemoReviews, slug: string, at: Date) =>
    markAddressed({ ...reviews, ...rejected(slug) }, slug, { summary: "done" }, at);
  const reviews = addressed(addressed({}, "c", LATER), "a", NOW);
  const state = { reviews };

  it("waits behind new demos, longest waiting first", () => {
    expect(queueInOrder(demos, state).map((d) => d.slug)).toEqual(["b", "d", "a", "c"]);
  });

  it("comes up next only when no new demo is left", () => {
    expect(nextInQueue(demos, state, "b")?.slug).toBe("d");
    expect(nextInQueue(demos, state, "a")?.slug).toBe("b");
    const noneNew = {
      reviews: {
        ...reviews,
        ...applyReview({}, "b", { verdict: "accepted" }, NOW),
        ...applyReview({}, "d", { verdict: "accepted" }, NOW),
      },
    };
    expect(nextInQueue(demos, noneNew, "b")?.slug).toBe("a");
    expect(nextInQueue(demos, noneNew, "a")?.slug).toBe("c");
    expect(nextInQueue(demos, noneNew, "c")?.slug).toBe("a");
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

  it("gives every universal gate challenge a page", () => {
    const slugs = computerDemos.map(({ slug }) => slug as string);
    const missing = UNIVERSAL_GATE_LEVELS.filter(({ id }) => !slugs.includes(id));
    expect(missing).toEqual([]);
  });

  it("gives every chapter demo a page", () => {
    const pages = computerDemos.map(({ slug }) => pageText(slug)).join("\n");
    // Shelved, and chapter lessons made of demos that have their own pages.
    const exempt = [
      "TruthTableScale",
      "TransistorGateLessons",
      "DecoderLesson",
      "UniversalGates",
      // The chapter's name for TransistorGates.
      "GateTruthTable",
      // The chapter's names for HalfAdder and FullAdder.
      "AdditionTable",
      "FullAdderTable",
    ];
    expect(mdxNames.filter((name) => !exempt.includes(name) && !uses(pages, name))).toEqual([]);
  });
});

describe("piano demo files", () => {
  // The list is pianoDemos, so a demo page missing there is never reviewed.
  it("holds every demo page", () => {
    const pages = fs
      .readdirSync(path.join("src", "pages", "piano"))
      .filter((file) => file.endsWith(".tsx") && !file.startsWith("["))
      .map((file) => file.replace(".tsx", ""))
      .filter((page) => page !== "index" && page !== "demos");
    expect(pages.sort()).toEqual(pianoDemos.map((demo) => demo.slug).sort());
  });
});

describe("store and endpoint", () => {
  let dir: string;

  const call = (
    body: unknown,
    { method = "POST", address = "127.0.0.1" } = {},
    query: Record<string, string> = {},
  ): { status: number; json: unknown; sent: unknown; headers: Record<string, string> } => {
    const result = {
      status: 0,
      json: undefined as unknown,
      sent: undefined as unknown,
      headers: {} as Record<string, string>,
    };
    const res = {
      setHeader(name: string, value: string) {
        result.headers[name] = value;
        return res;
      },
      send(value: unknown) {
        result.sent = value;
        return res;
      },
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
      { method, body, query, headers: {}, socket: { remoteAddress: address } } as NextApiRequest,
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
    expect(readDemoReviews("computer")).toEqual({});
    const reviews = rejected();
    writeDemoReviews("computer", reviews);
    expect(readDemoReviews("computer")).toEqual(reviews);
    expect(fs.readdirSync(path.join(dir, "texts"))).toEqual([REVIEW_FILE]);
  });

  it("saves a verdict and then a note, and serves them back", () => {
    expect(call({ slug: "die-zoom", verdict: "rejected" }).status).toBe(200);
    expect(call({ slug: "die-zoom", note: "labels overlap" }).status).toBe(200);
    expect(readDemoReviews("computer")["die-zoom"]).toMatchObject({
      verdict: "rejected",
      note: "labels overlap",
    });
    const read = call(undefined, { method: "GET" });
    expect(read.status).toBe(200);
    expect(read.json).toMatchObject({ reviews: { "die-zoom": { verdict: "rejected" } } });
  });

  it("saves a pasted screenshot next to the record and serves it back", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const upload = call({
      slug: "die-zoom",
      image: { type: "image/png", data: png.toString("base64") },
    });
    expect(upload.status).toBe(200);
    const name = (upload.json as { image: string }).image;
    expect(name).toMatch(/^die-zoom-\d+\.png$/);
    expect(readDemoReviews("computer")["die-zoom"].images).toEqual([name]);
    expect(fs.readFileSync(path.join(dir, "texts", "demo-review-images", name))).toEqual(png);

    const served = call(undefined, { method: "GET" }, { image: name });
    expect(served.status).toBe(200);
    expect(served.headers["Content-Type"]).toBe("image/png");
    expect(served.sent).toEqual(png);
    expect(call(undefined, { method: "GET" }, { image: "../demo-review.json" }).status).toBe(404);

    expect(call({ slug: "die-zoom", image: { type: "text/html", data: "aGk=" } }).status).toBe(400);
    expect(call({ slug: "die-zoom", images: [] }).status).toBe(200);
    expect(readDemoReviews("computer")["die-zoom"]).toBeUndefined();
  });

  it("refuses a demo that does not exist and a verdict that does not exist", () => {
    expect(call({ slug: "nope", verdict: "accepted" }).status).toBe(400);
    expect(call({ slug: "clock-scope", verdict: "great" }).status).toBe(400);
    expect(readDemoReviews("computer")).toEqual({});
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
    for (const props of [getServerSideProps, getPianoServerSideProps]) {
      vi.stubEnv("NODE_ENV", "development");
      const page = (address = "127.0.0.1") =>
        props({
          req: { headers: {}, socket: { remoteAddress: address } },
        } as unknown as GetServerSidePropsContext);

      expect(await page()).toEqual({ props: { review: { reviews: {} } } });
      expect(await page("192.168.1.20")).toEqual({ props: { review: null } });
      vi.stubEnv("NODE_ENV", "production");
      expect(await page()).toEqual({ notFound: true });
    }
  });

  it("keeps the piano review in its own file, with its own demos and screenshots", () => {
    const piano = { series: "piano" };
    expect(call({ slug: "chord-builder", verdict: "rejected" }, {}, piano).status).toBe(200);
    expect(call({ slug: "chord-builder", note: "too quiet" }, {}, piano).status).toBe(200);
    expect(readDemoReviews("piano")["chord-builder"]).toMatchObject({
      verdict: "rejected",
      note: "too quiet",
    });
    expect(readDemoReviews("computer")).toEqual({});
    expect(fs.readdirSync(path.join(dir, "texts"))).toEqual([REVIEW_SERIES.piano.file]);
    expect(call(undefined, { method: "GET" }, piano).json).toMatchObject({
      reviews: { "chord-builder": { verdict: "rejected" } },
    });
    expect(call(undefined, { method: "GET" }).json).toEqual({ reviews: {} });

    // A computer demo is not a piano demo, and the other way round.
    expect(call({ slug: "die-zoom", verdict: "accepted" }, {}, piano).status).toBe(400);
    expect(call({ slug: "chord-builder", verdict: "accepted" }).status).toBe(400);
    expect(call({ slug: "chord-builder", verdict: "accepted" }, {}, { series: "x" }).status).toBe(
      400,
    );

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 4, 5, 6]);
    const upload = call(
      { slug: "chord-builder", image: { type: "image/png", data: png.toString("base64") } },
      {},
      piano,
    );
    const name = (upload.json as { image: string }).image;
    expect(fs.readFileSync(path.join(dir, "texts", REVIEW_SERIES.piano.imageDir, name))).toEqual(
      png,
    );
    expect(call(undefined, { method: "GET" }, { ...piano, image: name }).sent).toEqual(png);
    expect(call(undefined, { method: "GET" }, { image: name }).status).toBe(404);
  });
});
