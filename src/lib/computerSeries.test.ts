import { describe, expect, it } from "vitest";
import {
  bestStreak,
  type ChapterMeta,
  calendar,
  chapterProgress,
  countWords,
  DEFAULT_BOX_WORDS,
  DEFAULT_LEAF_WORDS,
  DEFAULT_PARENT_WORDS,
  dailyWords,
  LOCK_STEP,
  nextStep,
  partChapters,
  partPace,
  progressColor,
  recordDay,
  splitSections,
  stepDone,
  streak,
  tallyByKind,
  writingOrder,
} from "./computerSeries";

const meta = (overrides: Partial<ChapterMeta> = {}): ChapterMeta => ({
  title: "Bits",
  part: 1,
  partTitle: "The Basics",
  number: "test",
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

  it("counts a folded box as a section and returns to the text around it", () => {
    const sections = splitSections(
      `## First\n\none\n\n> [!more]- Box\n>\n> #### Inside\n>\n> two three\n\nfour\n\n## Next\n`,
      "Bits",
      { First: 100 },
    );
    expect(sections.map((s) => [s.heading, s.depth, s.words, s.target])).toEqual([
      ["Bits", 1, 0, DEFAULT_PARENT_WORDS],
      ["First", 2, 2, 100],
      ["Box", 2, 3, DEFAULT_BOX_WORDS],
      ["Next", 2, 0, DEFAULT_LEAF_WORDS],
    ]);
  });

  it("leaves a link box and other callouts in the section around them", () => {
    const sections = splitSections(`> [!more] [Page](/x)\n\n> [!tip]- Folded tip\n> two`, "Bits");
    expect(sections).toHaveLength(1);
  });
});

describe("chapterProgress", () => {
  it("credits each section only up to its own target", () => {
    const body = `${words(DEFAULT_PARENT_WORDS * 3)}\n\n## Empty\n\n### Leaf\n`;
    const progress = chapterProgress(meta(), body, "x.md");
    // The intro and "Empty" each have a deeper heading after them; "Leaf" has none.
    expect(progress.target).toBe(DEFAULT_PARENT_WORDS * 2 + DEFAULT_LEAF_WORDS);
    expect(progress.credited).toBe(DEFAULT_PARENT_WORDS);
    expect(progress.words).toBe(DEFAULT_PARENT_WORDS * 3);
  });

  it("locks a drafted chapter's short sections at their word count, rounded down to 50", () => {
    const body = `${words(30)}\n\n## Short\n\n${words(437)}\n\n## Exact\n\n${words(400)}\n\n## Long\n\n${words(900)}\n`;
    const estimates = { Bits: 150, Short: 650, Exact: 650, Long: 500 };
    const drafting = chapterProgress(meta({ status: "drafting" }), body, "x.md", estimates);
    expect(drafting.sections.map((s) => s.target)).toEqual([150, 650, 650, 500]);

    for (const status of ["draft-done", "revising", "done"] as const) {
      const drafted = chapterProgress(meta({ status }), body, "x.md", estimates);
      // A section already past its estimate keeps the estimate.
      expect(drafted.sections.map((s) => s.target)).toEqual([0, 400, 400, 500]);
      expect(drafted.target).toBe(1300);
      expect(drafted.credited).toBe(drafted.target);
      expect(drafted.words).toBe(drafting.words);
    }
  });
});

describe("estimates", () => {
  it("uses a heading's estimate and falls back to defaults for unknown headings", () => {
    const body = "## Known\n\n## Unknown leaf\n";
    const progress = chapterProgress(meta(), body, "x.md", { Bits: 120, Known: 900 });
    expect(progress.sections.map((s) => s.target)).toEqual([120, 900, DEFAULT_LEAF_WORDS]);
  });

  it("looks the chapter up by number in the shared estimates", () => {
    const tour = chapterProgress(meta({ number: "1.0", title: "Whirlwind Tour" }), "", "x.md");
    expect(tour.target).toBe(900);
  });
});

describe("chapter steps", () => {
  it("reads drafted and polished from the status and live from published", () => {
    const steps = (overrides: Partial<ChapterMeta>) =>
      (["drafted", "polished", "live"] as const).map((step) => stepDone(meta(overrides), step));
    expect(steps({ status: "drafting" })).toEqual([false, false, false]);
    expect(steps({ status: "revising" })).toEqual([true, false, false]);
    expect(steps({ status: "done" })).toEqual([true, true, false]);
    expect(steps({ status: "done", published: true })).toEqual([true, true, true]);
  });

  it("leaves other parts and asides out of a part's deadline", () => {
    const chapters = [
      { part: 1, kind: "chapter" as const, order: 1 },
      { part: 1, kind: "aside" as const, order: 2 },
      { part: 2, kind: "chapter" as const, order: 3 },
    ];
    expect(partChapters(chapters, 1).map((c) => c.order)).toEqual([1]);
  });
});

describe("partPace", () => {
  const deadline = { part: 1, date: "2026-01-10", start: "2026-01-01", stepsAtStart: 2 };
  const drafted = chapterProgress(meta({ status: "draft-done" }), "", "a.md");
  const idea = chapterProgress(meta(), "", "b.md");
  // 12 steps, 2 of them done, which is where the line starts.
  const part = [drafted, drafted, idea, idea];

  it("starts on the line, however many steps were done before the deadline was set", () => {
    const p = partPace(part, "2026-01-01", deadline);
    expect(p.stepsTotal).toBe(12);
    expect(p.stepsDone).toBe(2);
    expect(p.expected).toBe(2);
    expect(p.lead).toBe(0);
    expect(p.daysLeft).toBe(10);
    expect(p.neededPerWeek).toBe(7);
  });

  it("falls behind and needs more per week with every day without a step", () => {
    const p = partPace(part, "2026-01-06", deadline);
    expect(p.expected).toBe(7);
    expect(p.lead).toBe(-5);
    expect(p.daysLeft).toBe(5);
    expect(p.neededPerWeek).toBe(14);
  });

  it("goes ahead of the line for steps done early", () => {
    const polished = chapterProgress(meta({ status: "done" }), "", "c.md");
    const p = partPace([polished, polished, idea, idea], "2026-01-01", deadline);
    expect(p.lead).toBe(2);
  });

  it("puts every step left on the last day once the date has passed", () => {
    const p = partPace(part, "2026-02-01", deadline);
    expect(p.expected).toBe(12);
    expect(p.daysLeft).toBe(0);
    expect(p.neededPerWeek).toBe(10);
  });

  it("counts the words the chapters are still short of, not what they went over", () => {
    const over = chapterProgress(meta(), words(DEFAULT_PARENT_WORDS * 2), "d.md");
    const short = chapterProgress(meta(), `${words(50)}\n## A\n`, "e.md");
    const p = partPace([over, short], "2026-01-01", deadline);
    expect(p.wordsLeft).toBe(
      over.target - over.credited + DEFAULT_PARENT_WORDS - 50 + DEFAULT_LEAF_WORDS,
    );
  });

  it("leaves boxes out of the words a part has left", () => {
    const body = `${words(DEFAULT_LEAF_WORDS)}\n\n> [!more]- Box\n`;
    const p = partPace([chapterProgress(meta(), body, "a.md")], "2026-01-01", deadline);
    expect(p.wordsLeft).toBe(0);
  });
});

describe("nextStep", () => {
  const chapter = (overrides: Partial<ChapterMeta>, body = "") =>
    chapterProgress(meta(overrides), body, `${overrides.order}.md`);

  it("returns the first short section of the first chapter not yet drafted", () => {
    const next = nextStep([
      chapter({ order: 2, title: "Later" }),
      chapter({ order: 0, status: "draft-done" }),
      chapter({ order: 1 }, `${words(DEFAULT_PARENT_WORDS)}\n## Next\n`),
    ]);
    expect(next?.step).toBe("drafted");
    expect(next?.chapter.order).toBe(1);
    expect(next?.section?.heading).toBe("Next");
  });

  it("leaves the section key out when every section reached its target but the status lags", () => {
    const next = nextStep([chapter({ order: 1 }, words(DEFAULT_LEAF_WORDS))]);
    expect(next?.step).toBe("drafted");
    expect(next).not.toHaveProperty("section");
  });

  it("moves to polishing once every chapter is drafted, then to putting them live", () => {
    const revising = chapter({ order: 1, status: "revising" });
    const done = chapter({ order: 2, status: "done" });
    expect(nextStep([done, revising])).toMatchObject({ step: "polished", chapter: { order: 1 } });
    const finished = { ...revising, status: "done" as const };
    expect(nextStep([done, finished])).toMatchObject({ step: "live", chapter: { order: 1 } });
    expect(nextStep([{ ...done, published: true }, finished])?.chapter.order).toBe(1);
  });

  it("returns nothing when every chapter is live", () => {
    expect(nextStep([chapter({ order: 1, status: "done", published: true })])).toBeNull();
  });

  it("orders asides after every chapter", () => {
    const aside = chapterProgress(meta({ order: 2, kind: "aside", parent: "1.1" }), "", "aside.md");
    const lateAside = chapterProgress(meta({ order: 4, kind: "aside" }), "", "late-aside.md");
    const main = chapterProgress(meta({ order: 3 }), "", "chapter.md");
    expect(writingOrder([lateAside, main, aside]).map((c) => c.path)).toEqual([
      "chapter.md",
      "aside.md",
      "late-aside.md",
    ]);
  });

  it("never asks for a box while a chapter is in draft", () => {
    const body = `${words(DEFAULT_LEAF_WORDS)}\n\n> [!more]- Box\n`;
    expect(nextStep([chapterProgress(meta(), `${body}\n## Later\n`, "a.md")])).toMatchObject({
      step: "drafted",
      section: { heading: "Later" },
    });
    const next = nextStep([chapterProgress(meta(), body, "a.md")]);
    expect(next?.step).toBe("drafted");
    expect(next?.section).toBeUndefined();
  });

  it("closes a box with words when its chapter is drafted and keeps an empty one open", () => {
    const body = `> [!more]- Empty\n\n> [!more]- Started\n> ${words(LOCK_STEP + 1)}\n`;
    const drafted = chapterProgress(meta({ status: "draft-done" }), body, "a.md");
    expect(drafted.sections.filter((s) => s.box).map((s) => [s.heading, s.target])).toEqual([
      ["Empty", DEFAULT_BOX_WORDS],
      ["Started", LOCK_STEP],
    ]);
  });
});

describe("tallyByKind", () => {
  it("counts chapters and asides apart", () => {
    const body = `${words(300)}\n## Next\n${words(100)}`;
    const chapter = chapterProgress(meta(), body, "a.md");
    const aside = chapterProgress(meta({ kind: "aside" }), "", "b.md");
    expect(tallyByKind([chapter, aside, aside])).toEqual({
      chapter: {
        count: 1,
        credited: DEFAULT_PARENT_WORDS + 100,
        target: DEFAULT_PARENT_WORDS + DEFAULT_LEAF_WORDS,
      },
      aside: { count: 2, credited: 0, target: 2 * DEFAULT_LEAF_WORDS },
    });
    expect(tallyByKind([chapter]).aside).toEqual({ count: 0, credited: 0, target: 0 });
  });

  it("counts a chapter's boxes among the asides", () => {
    const body = `${words(DEFAULT_LEAF_WORDS)}\n\n> [!more]- Box\n> ${words(100)}\n`;
    const chapter = chapterProgress(meta(), body, "a.md");
    expect(tallyByKind([chapter])).toEqual({
      chapter: { count: 1, credited: DEFAULT_LEAF_WORDS, target: DEFAULT_LEAF_WORDS },
      aside: { count: 1, credited: 100, target: DEFAULT_BOX_WORDS },
    });
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

describe("progressColor", () => {
  it("gets greener and more saturated towards completion, clamped at both ends", () => {
    expect(progressColor(0)).toBe("hsl(70 35% 55%)");
    expect(progressColor(1)).toBe("hsl(145 72% 42%)");
    expect(progressColor(2)).toBe(progressColor(1));
    expect(progressColor(-1)).toBe(progressColor(0));
  });
});

describe("calendar", () => {
  it("fills whole Monday-to-Sunday weeks and marks days outside the range and in the future", () => {
    // 2026-10-08 is a Thursday, 2026-10-14 a Wednesday.
    const days = calendar(
      [{ day: "2026-10-09", words: 300 }],
      "2026-10-10",
      "2026-10-08",
      "2026-10-14",
    );
    expect(days[0].day).toBe("2026-10-05");
    expect(days.at(-1)?.day).toBe("2026-10-18");
    expect(days).toHaveLength(14);
    const byDay = Object.fromEntries(days.map((d) => [d.day, d]));
    expect(byDay["2026-10-05"]).toMatchObject({ inRange: false, words: null });
    expect(byDay["2026-10-08"]).toMatchObject({ inRange: true, words: 0 });
    expect(byDay["2026-10-09"].words).toBe(300);
    expect(byDay["2026-10-11"]).toMatchObject({ future: true, words: null });
  });
});

describe("bestStreak", () => {
  it("finds the longest run of consecutive days with words, broken by gaps or empty days", () => {
    expect(
      bestStreak([
        { day: "2026-10-01", words: 10 },
        { day: "2026-10-02", words: 10 },
        { day: "2026-10-03", words: 0 },
        { day: "2026-10-04", words: 10 },
        { day: "2026-10-05", words: 10 },
        { day: "2026-10-06", words: 10 },
        { day: "2026-10-08", words: 10 },
      ]),
    ).toBe(3);
  });
});
