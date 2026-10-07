import { describe, expect, it } from "vitest";
import {
  type ChapterMeta,
  chapterProgress,
  countWords,
  dailyWords,
  nextUp,
  pace,
  recordDay,
  splitSections,
  streak,
  WORDS_PER_SECTION,
} from "./computerSeries";

const meta = (overrides: Partial<ChapterMeta> = {}): ChapterMeta => ({
  title: "Bits",
  part: 1,
  partTitle: "The Basics",
  number: "1.1",
  kind: "chapter",
  order: 1,
  status: "idea",
  ...overrides,
});

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("countWords", () => {
  it("counts prose and skips code, tags, comments and link targets", () => {
    const md = [
      "A switch is on or off.",
      "```js\nconst ignored = true;\n```",
      '<ByteExplorer bits={8} label="ignored" />',
      "<!-- ignored --> %%ignored too%%",
      "See [[1.2-gates|the gates]] and [a link](https://example.com/ignored).",
    ].join("\n");
    expect(countWords(md)).toBe(6 + 6);
  });
});

describe("splitSections", () => {
  it("treats text before the first heading as the chapter introduction", () => {
    const sections = splitSections(
      `intro words here\n\n## First\n\none two\n\n### Deeper\n`,
      "Bits",
    );
    expect(sections.map((s) => [s.heading, s.depth, s.words])).toEqual([
      ["Bits", 1, 3],
      ["First", 2, 2],
      ["Deeper", 3, 0],
    ]);
  });

  it("ignores heading-like lines inside code fences", () => {
    expect(splitSections("```\n# not a heading\n```", "Bits")).toHaveLength(1);
  });
});

describe("chapterProgress", () => {
  it("credits each section only up to its own target", () => {
    const body = `${words(WORDS_PER_SECTION * 3)}\n\n## Empty\n`;
    const progress = chapterProgress(meta(), body, "x.md");
    expect(progress.target).toBe(WORDS_PER_SECTION * 2);
    expect(progress.credited).toBe(WORDS_PER_SECTION);
    expect(progress.words).toBe(WORDS_PER_SECTION * 3);
  });

  it("credits the whole target once a chapter is marked done", () => {
    const progress = chapterProgress(meta({ status: "done" }), "## Empty\n", "x.md");
    expect(progress.credited).toBe(progress.target);
  });
});

describe("pace", () => {
  const chapter = chapterProgress(meta(), `${words(100)}\n## A\n## B\n## C\n`, "x.md");

  it("expects a straight line from start to deadline, up to the start of today", () => {
    const p = pace([chapter], "2026-01-05", "2026-01-01", "2026-01-10");
    expect(p.target).toBe(4 * WORDS_PER_SECTION);
    expect(p.expected).toBe(Math.round((p.target * 4) / 10));
    expect(p.lead).toBe(100 - p.expected);
    expect(p.daysLeft).toBe(6);
    expect(p.neededPerDay).toBe(Math.ceil((p.target - 100) / 6));
  });

  it("puts everything on the last day once the deadline has passed", () => {
    const p = pace([chapter], "2026-02-01", "2026-01-01", "2026-01-10");
    expect(p.expected).toBe(p.target);
    expect(p.daysLeft).toBe(0);
  });
});

describe("nextUp", () => {
  it("returns the first unfinished section in reading order, skipping done chapters", () => {
    const later = chapterProgress(meta({ order: 2, title: "Later" }), "", "b.md");
    const done = chapterProgress(meta({ order: 0, status: "done" }), "", "a.md");
    const first = chapterProgress(
      meta({ order: 1 }),
      `${words(WORDS_PER_SECTION)}\n## Next\n`,
      "c.md",
    );
    const next = nextUp([later, done, first]);
    expect(next?.chapter.path).toBe("c.md");
    expect(next?.section.heading).toBe("Next");
  });
});

describe("history", () => {
  const history = { "2026-10-05": 100, "2026-10-06": 300, "2026-10-07": 300, "2026-10-08": 500 };

  it("turns daily totals into words per day", () => {
    expect(dailyWords(history)).toEqual([
      { day: "2026-10-06", words: 200 },
      { day: "2026-10-07", words: 0 },
      { day: "2026-10-08", words: 200 },
    ]);
  });

  it("records a baseline the first time, so the first day's words count", () => {
    const first = recordDay({}, "2026-10-08", 0);
    expect(dailyWords(recordDay(first, "2026-10-08", 450))).toEqual([
      { day: "2026-10-08", words: 450 },
    ]);
  });

  it("counts the streak back from today, or from yesterday if today is still empty", () => {
    expect(streak(history, "2026-10-08")).toBe(1);
    expect(streak({ ...history, "2026-10-07": 400 }, "2026-10-08")).toBe(3);
    expect(streak({ ...history, "2026-10-09": 500 }, "2026-10-09")).toBe(1);
  });
});
