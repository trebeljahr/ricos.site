import { describe, expect, it } from "vitest";

import {
  archiveFacets,
  countForDoor,
  frontShelf,
  hostLabel,
  matchesFilters,
  NO_FILTERS,
  orderForPath,
  pickRandom,
  plainNote,
  publicNeedles,
  timeBucket,
} from "./public";
import type { Needle, NeedleStatus, Rating } from "./types";

const needle = (overrides: Partial<Needle> & { id: string }): Needle => ({
  url: `https://example.com/${overrides.id}`,
  title: overrides.id,
  type: "article",
  topics: [],
  paths: [],
  rating: 2,
  status: "reviewed",
  pool: "needlestack",
  folders: [],
  ...overrides,
});

describe("publicNeedles", () => {
  it("publishes only reviewed needles rated 1 or more", () => {
    const statuses: NeedleStatus[] = ["unclassified", "classified", "reviewed", "rejected"];
    const ratings: Rating[] = [0, 1, 2, 3];
    const all = statuses.flatMap((status) =>
      ratings.map((rating) => needle({ id: `${status}-${rating}`, status, rating })),
    );

    expect(publicNeedles(all).map((one) => one.id)).toEqual([
      "reviewed-3",
      "reviewed-2",
      "reviewed-1",
    ]);
  });

  it("drops the triage fields instead of serialising them into the page", () => {
    const [published] = publicNeedles([
      needle({
        id: "a",
        pool: "best",
        folders: ["Best/Best Articles"],
        newsletter: 12,
        inNeedlestackMd: true,
        reviewedAt: "2026-09-01",
        noteSource: "ai",
        guess: { reason: "a machine guess nobody vouched for", rating: 3 },
      }),
    ]);

    expect(Object.keys(published).sort()).toEqual([
      "id",
      "paths",
      "rating",
      "title",
      "topics",
      "type",
      "url",
    ]);
  });

  it("sorts by rating, then by date, then by title", () => {
    const sorted = publicNeedles([
      needle({ id: "old-two", rating: 2, addedAt: "2020-01-01" }),
      needle({ id: "three", rating: 3, addedAt: "2019-01-01" }),
      needle({ id: "new-two", rating: 2, addedAt: "2026-01-01" }),
      needle({ id: "b", rating: 1 }),
      needle({ id: "a", rating: 1 }),
    ]);
    expect(sorted.map((one) => one.id)).toEqual(["three", "new-two", "old-two", "a", "b"]);
  });
});

describe("plainNote", () => {
  it("unwraps links and the leading dash of an imported note", () => {
    expect(plainNote("— I wrote about [what this means](/posts/open-ai-codex)")).toBe(
      "I wrote about what this means",
    );
  });

  it("returns undefined for nothing and for markdown that leaves nothing", () => {
    expect(plainNote(undefined)).toBeUndefined();
    expect(plainNote("  ")).toBeUndefined();
    expect(plainNote("![a picture](/a.png)")).toBeUndefined();
  });
});

describe("orderForPath", () => {
  const needles = publicNeedles([
    needle({ id: "first", rating: 1, paths: ["how-brains-work"] }),
    needle({ id: "second", rating: 3, paths: ["how-brains-work"] }),
    needle({ id: "unlisted", rating: 3, paths: ["how-brains-work"] }),
    needle({ id: "elsewhere", rating: 3, paths: ["make-a-game"] }),
  ]);

  it("follows paths.json, then falls back to rating", () => {
    expect(
      orderForPath(needles, "how-brains-work", ["first", "second", "gone"]).map((one) => one.id),
    ).toEqual(["first", "second", "unlisted"]);
  });

  it("orders by rating when the path has no curation yet", () => {
    expect(orderForPath(needles, "how-brains-work").map((one) => one.id)).toEqual([
      "second",
      "unlisted",
      "first",
    ]);
  });
});

describe("countForDoor", () => {
  it("counts needles through their door field and through their paths", () => {
    const needles = publicNeedles([
      needle({ id: "by-path", paths: ["how-brains-work"] }),
      needle({ id: "by-door", door: "understand" }),
      needle({ id: "same-path", paths: ["how-brains-work"] }),
      needle({ id: "other", paths: ["make-a-game"] }),
    ]);
    expect(countForDoor(needles, "understand")).toEqual({ needles: 3, paths: 1 });
    expect(countForDoor(needles, "wonder")).toEqual({ needles: 0, paths: 0 });
  });
});

describe("frontShelf", () => {
  it("takes the highest rated needles that carry a note", () => {
    const needles = publicNeedles([
      needle({ id: "no-note", rating: 3 }),
      needle({ id: "noted-three", rating: 3, note: "why it is good" }),
      needle({ id: "noted-two", rating: 2, note: "also good" }),
      needle({ id: "noted-one", rating: 1, note: "archive only" }),
    ]);
    expect(frontShelf(needles, 2).map((one) => one.id)).toEqual(["noted-three", "noted-two"]);
  });
});

describe("filters", () => {
  const needles = publicNeedles([
    needle({
      id: "short-intro",
      rating: 2,
      topics: ["brains"],
      type: "video",
      level: "intro",
      minutes: 12,
    }),
    needle({ id: "long-deep", rating: 3, topics: ["maths"], type: "lecture", level: "deep" }),
  ]);

  it("buckets a time commitment", () => {
    expect(timeBucket(undefined)).toBeUndefined();
    expect(timeBucket(9)).toBe("quick");
    expect(timeBucket(30)).toBe("short");
    expect(timeBucket(60)).toBe("medium");
    expect(timeBucket(61)).toBe("long");
  });

  it("treats the rating as a floor and a missing time as no match", () => {
    const short = needles.find((one) => one.id === "short-intro")!;
    const long = needles.find((one) => one.id === "long-deep")!;
    expect(matchesFilters(long, { ...NO_FILTERS, minRating: 3 })).toBe(true);
    expect(matchesFilters(short, { ...NO_FILTERS, minRating: 3 })).toBe(false);
    expect(matchesFilters(short, { ...NO_FILTERS, time: "short" })).toBe(true);
    expect(matchesFilters(long, { ...NO_FILTERS, time: "short" })).toBe(false);
    expect(matchesFilters(short, { ...NO_FILTERS, topic: "brains" })).toBe(true);
    expect(matchesFilters(short, { ...NO_FILTERS, type: "lecture" })).toBe(false);
    expect(matchesFilters(short, { ...NO_FILTERS, level: "deep" })).toBe(false);
  });

  it("offers only the filters the data can answer", () => {
    expect(archiveFacets(needles)).toEqual({
      topics: ["brains", "maths"],
      types: ["lecture", "video"],
      levels: ["intro", "deep"],
      times: [{ id: "short", label: "10 – 30 min" }],
      ratings: [2, 3],
    });
    expect(archiveFacets([])).toEqual({
      topics: [],
      types: [],
      levels: [],
      times: [],
      ratings: [],
    });
  });
});

describe("pickRandom", () => {
  it("picks with the given random source and copes with an empty list", () => {
    const needles = publicNeedles([needle({ id: "a", rating: 3 }), needle({ id: "b", rating: 2 })]);
    expect(pickRandom(needles, () => 0)?.id).toBe("a");
    expect(pickRandom(needles, () => 0.99)?.id).toBe("b");
    expect(pickRandom([], () => 0)).toBeUndefined();
  });
});

describe("hostLabel", () => {
  it("names the site a needle leads to, and copes with a broken url", () => {
    expect(hostLabel("https://www.youtube.com/watch?v=abc")).toBe("youtube.com");
    expect(hostLabel("not a url")).toBe("");
  });
});
