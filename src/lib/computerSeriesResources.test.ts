import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type Catalog,
  checkCatalog,
  formatMinutes,
  furtherReading,
  setStudied,
  studyMarkdown,
  studyPlan,
  withDone,
} from "./computerSeriesResources";

const catalog: Catalog = {
  resources: {
    "yt-a": {
      title: "SR latch",
      url: "https://www.youtube.com/watch?v=a",
      kind: "video",
      by: "Ben Eater",
      minutes: 12,
      origin: "channel",
    },
    "yt-b": {
      title: "D latch",
      url: "https://www.youtube.com/watch?v=b",
      kind: "video",
      minutes: 9,
      origin: "bookmark",
    },
    code: { title: "Code", url: "https://example.org/code", kind: "book", origin: "added" },
    file: { title: "Notes.pdf", kind: "paper", origin: "still-to-read" },
  },
  chapters: {
    memory: {
      core: [{ id: "yt-a", note: "start here" }, { id: "yt-b" }, { id: "file" }],
      deeper: [{ id: "code", note: "the flip-flop chapter" }],
      questions: ["Why is S = R = 1 not allowed?"],
      note: "Strong coverage.",
    },
    empty: { core: [], deeper: [], questions: [] },
  },
};

describe("studyPlan", () => {
  it("fills in the resources and keeps the order and the notes", () => {
    const plan = studyPlan("memory", catalog);
    expect(plan?.core.map((item) => item.id)).toEqual(["yt-a", "yt-b", "file"]);
    expect(plan?.core[0]).toMatchObject({ title: "SR latch", by: "Ben Eater", note: "start here" });
    expect(plan?.deeper[0]).toMatchObject({ kind: "book", note: "the flip-flop chapter" });
    expect(plan?.note).toBe("Strong coverage.");
  });

  it("counts what is done and the video time that is left", () => {
    expect(studyPlan("memory", catalog)).toMatchObject({ coreDone: 0, minutesLeft: 21 });
    const plan = studyPlan("memory", catalog, { "yt-a": "2026-10-13", code: "2026-10-12" });
    expect(plan).toMatchObject({ coreDone: 1, minutesLeft: 9 });
    expect(plan?.core[0].done).toBe("2026-10-13");
    expect(plan?.deeper[0].done).toBe("2026-10-12");
  });

  it("is null for a chapter without a list, an empty list or no slug", () => {
    expect(studyPlan("unknown", catalog)).toBeNull();
    expect(studyPlan("empty", catalog)).toBeNull();
    expect(studyPlan(undefined, catalog)).toBeNull();
  });

  it("skips a link whose resource is gone", () => {
    const broken: Catalog = {
      ...catalog,
      chapters: { memory: { core: [{ id: "nope" }, { id: "yt-a" }], deeper: [], questions: [] } },
    };
    expect(studyPlan("memory", broken)?.core.map((item) => item.id)).toEqual(["yt-a"]);
  });
});

describe("withDone", () => {
  it("applies new ticks to a plan and drops the ones taken back", () => {
    const plan = studyPlan("memory", catalog, { "yt-a": "2026-10-13" });
    if (!plan) throw new Error("no plan");
    const later = withDone(plan, { "yt-b": "2026-10-14" });
    expect(later.core.map((item) => item.done)).toEqual([undefined, "2026-10-14", undefined]);
    expect(later).toMatchObject({ coreDone: 1, minutesLeft: 12 });
  });
});

describe("furtherReading", () => {
  it("lists a chapter's resources without study notes, only those with an address", () => {
    const list = furtherReading("memory", catalog);
    expect(list.map((r) => r.id)).toEqual(["yt-a", "yt-b", "code"]);
    expect(list.every((r) => !("note" in r) && !("done" in r))).toBe(true);
  });
});

describe("setStudied", () => {
  it("marks, keeps the first date, and clears", () => {
    const once = setStudied({}, "yt-a", true, "2026-10-13");
    expect(once).toEqual({ "yt-a": "2026-10-13" });
    expect(setStudied(once, "yt-a", true, "2026-10-20")).toEqual({ "yt-a": "2026-10-13" });
    expect(setStudied(once, "yt-a", false, "2026-10-20")).toEqual({});
  });
});

describe("formatMinutes", () => {
  it("writes hours once there are any", () => {
    expect(formatMinutes(16)).toBe("16 min");
    expect(formatMinutes(65)).toBe("1 h 05 min");
  });
});

describe("checkCatalog", () => {
  it("accepts a consistent catalog", () => {
    expect(checkCatalog(catalog, ["memory", "empty"])).toEqual([]);
  });

  it("names every kind of problem", () => {
    const bad: Catalog = {
      resources: {
        ...catalog.resources,
        twin: { title: "Again", url: "https://example.org/code", kind: "book", origin: "added" },
        odd: { title: "Odd", kind: "podcast", origin: "added" } as never,
      },
      chapters: {
        memory: {
          core: [{ id: "yt-a" }, { id: "yt-a" }, { id: "gone" }],
          deeper: [],
          questions: [],
        },
        ghost: { core: [{ id: "yt-b" }], deeper: [], questions: [] },
      },
    };
    const problems = checkCatalog(bad, ["memory", "clock"]);
    expect(problems).toEqual(
      expect.arrayContaining([
        "resources code and twin: same address",
        'resource odd: unknown kind "podcast"',
        "chapter memory: yt-a listed twice",
        "chapter memory: unknown resource gone",
        "chapter ghost: no chapter file has this slug",
        "chapter clock: no study list",
        "resource file: not used by any chapter",
      ]),
    );
  });
});

describe("studyMarkdown", () => {
  it("renders a section per chapter under its part", () => {
    const md = studyMarkdown(
      [
        { number: "1.5", title: "Memory", slug: "memory", partTitle: "Part 1 - The Basics" },
        { number: "1.6", title: "Nothing yet", slug: "empty", partTitle: "Part 1 - The Basics" },
      ],
      catalog,
    );
    expect(md).toContain("## Part 1 - The Basics\n\n### 1.5 Memory\n\nCore video time: 21 min.");
    expect(md).toContain(
      "- 📺 [SR latch](https://www.youtube.com/watch?v=a) · Ben Eater · 12 min — start here",
    );
    expect(md).toContain("- 📚 Notes.pdf");
    expect(md).toContain("- Why is S = R = 1 not allowed?");
    expect(md).not.toContain("Nothing yet");
  });
});

describe("src/content/computer/resources.json", () => {
  const real = JSON.parse(
    fs.readFileSync("src/content/computer/resources.json", "utf8"),
  ) as Catalog;

  it("has no dangling ids, duplicates or unused resources", () => {
    const problems = checkCatalog(real, Object.keys(real.chapters));
    expect(problems).toEqual([]);
  });

  it("gives every chapter at least one resource", () => {
    for (const [slug, study] of Object.entries(real.chapters)) {
      expect(study.core.length + study.deeper.length, slug).toBeGreaterThan(0);
    }
  });
});
