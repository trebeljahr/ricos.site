import { describe, expect, it } from "vitest";
import {
  blockHash,
  buildEntries,
  curateRetro,
  type DiaryEntry,
  type DiaryLog,
  dailyOrder,
  diaryStats,
  entryDate,
  entryTitle,
  kindOf,
  morningPageRel,
  PART_TARGET,
  retroBlocks,
  splitParts,
  todaysPick,
  undoToday,
} from "./diary";

const words = (n: number, word = "word") => Array.from({ length: n }, () => word).join(" ");

const entry = (id: string, date: string | null, extra: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id,
  path: `/notes/${id}`,
  rel: id,
  kind: "diary",
  title: id,
  date,
  words: 500,
  fullWords: null,
  body: words(500),
  part: null,
  ...extra,
});

describe("kindOf", () => {
  it("takes diaries, morning pages, retros, dreams, essays and tiny thoughts", () => {
    expect(kindOf("diary-entries/2019-12-15-example.md")).toBe("diary");
    expect(kindOf("morning-pages/2026-11-November/2026-11-01.md")).toBe("morning-pages");
    expect(kindOf("notion/Workspace/Weekly Retros/2025 - Example/2025 - CW 47.md")).toBe(
      "retro",
    );
    expect(kindOf("dreams/example-dream.md")).toBe("dream");
    expect(kindOf("essays/Curiosity.md")).toBe("essay");
    expect(kindOf("misc/tiny-thoughts.md")).toBe("thoughts");
  });

  it("leaves out templates, to-do lists and everything else", () => {
    expect(kindOf("morning-pages/_example-template.md")).toBeNull();
    expect(kindOf("notion/Workspace/Weekly Retros/2025 - CW TEMPLATE.md")).toBeNull();
    expect(kindOf("notion/Workspace/Todo Lists/Example List.md")).toBeNull();
    expect(kindOf("misc/some-note.md")).toBeNull();
    expect(kindOf("diary-entries/photo.jpg")).toBeNull();
  });
});

describe("entryDate", () => {
  it("reads the date from the file name", () => {
    expect(entryDate("diary-entries/2019-12-15-example.md")).toBe("2019-12-15");
    expect(entryDate("morning-pages/2026-10-October/2026-10-28-example.md")).toBe(
      "2026-10-28",
    );
  });

  it("dates a weekly retro by the Monday of its ISO week", () => {
    expect(entryDate("x/2025 - CW 47.md")).toBe("2025-11-17");
    expect(entryDate("x/2023 - CW11.md")).toBe("2023-03-13");
    expect(entryDate("x/2026 - CW 1.md")).toBe("2025-12-29");
  });

  it("gives no date to undated or impossible names", () => {
    expect(entryDate("essays/Curiosity.md")).toBeNull();
    expect(entryDate("x/2022-16-22-nonsense.md")).toBeNull();
    expect(entryDate("x/2024 - Example.md")).toBeNull();
  });
});

describe("entryTitle", () => {
  it("prefers the frontmatter title, then the first heading, then the file name", () => {
    expect(entryTitle("diary-entries/2019-12-15-example.md", "diary", "Example", "")).toBe(
      "Example",
    );
    expect(entryTitle("x/2025 - CW 47.md", "retro", undefined, "# 2025 - CW 47\n\ntext")).toBe(
      "2025 - CW 47",
    );
    expect(
      entryTitle("diary-entries/2023-01-16-monday-start-of-example.md", "diary", "", "text"),
    ).toBe("Start of example");
    expect(entryTitle("morning-pages/2026-10/2026-10-31.md", "morning-pages", "", "text")).toBe(
      "Morning page",
    );
  });
});

describe("splitParts", () => {
  it("keeps a short entry whole", () => {
    expect(splitParts(words(1000))).toHaveLength(1);
  });

  it("cuts a long text at paragraph breaks into parts of at least the target", () => {
    const text = Array.from({ length: 12 }, () => words(400)).join("\n\n");
    const parts = splitParts(text);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(part.split(/\s+/).length).toBeGreaterThanOrEqual(PART_TARGET);
    }
    expect(parts.join("\n\n")).toBe(text);
  });

  it("never ends a part on a heading", () => {
    const text = [words(1300), "## Next thing", words(700), words(300)].join("\n\n");
    const parts = splitParts(text);
    expect(parts).toHaveLength(2);
    expect(parts[1].startsWith("## Next thing")).toBe(true);
  });
});

describe("buildEntries", () => {
  it("cleans Obsidian syntax, drops stubs and splits long files into parts with stable ids", () => {
    const long = Array.from({ length: 6 }, (_, i) => `Paragraph ${i} ${words(450)}`).join("\n\n");
    const entries = buildEntries([
      {
        rel: "dreams/flying.md",
        path: "/n/dreams/flying.md",
        content: `I flew over [[Berlin|the city]]. %%note%% ${words(60)}`,
      },
      { rel: "dreams/stub.md", path: "/n/dreams/stub.md", content: "too short" },
      { rel: "misc/tiny-thoughts.md", path: "/n/misc/tiny-thoughts.md", content: long },
    ]);
    expect(entries[0].body).toContain("I flew over the city.");
    expect(entries[0].body).not.toContain("%%");
    expect(entries.some((e) => e.rel === "dreams/stub.md")).toBe(false);
    const parts = entries.filter((e) => e.kind === "thoughts");
    expect(parts.length).toBe(2);
    expect(parts[0].id).toBe("misc/tiny-thoughts.md#paragraph-0-word-word-word-word");
    expect(parts[1].part).toEqual({ index: 2, count: 2 });
  });
});

describe("buildEntries headings", () => {
  it("drops a first heading that only repeats the title", () => {
    const [dream] = buildEntries([
      {
        rel: "dreams/flying.md",
        path: "/n/flying.md",
        content: `# Flying\n\n## Over the city\n\n${words(60)}`,
      },
    ]);
    expect(dream.title).toBe("Flying");
    expect(dream.body.startsWith("## Over the city")).toBe(true);
  });
});

describe("retroBlocks", () => {
  const retro = [
    "## Summary",
    "",
    "- chill week",
    "",
    "## Learnings:",
    "",
    "- first thought",
    "    - nested under it",
    "",
    "    ⇒ and a paragraph under it",
    "- second thought",
    "continues on the next line",
    "",
    "A paragraph on its own",
    "over two lines",
    "",
    "**Kinda:**",
    "",
    "- started something",
  ].join("\n");

  it("keeps a bullet with everything under it, and each block's text word for word", () => {
    expect(retroBlocks(retro).map((b) => [b.heading, b.text])).toEqual([
      ["## Summary", "- chill week"],
      ["## Learnings:", "- first thought\n    - nested under it\n\n    ⇒ and a paragraph under it"],
      ["## Learnings:", "- second thought\ncontinues on the next line"],
      ["## Learnings:", "A paragraph on its own\nover two lines"],
      ["**Kinda:**", "- started something"],
    ]);
  });

  it("hashes a block by its opening, so text added at the end keeps it picked", () => {
    const long = `- ${words(30)}`;
    expect(blockHash(`${long} and a later addition`)).toBe(blockHash(long));
    expect(blockHash("- one thing")).not.toBe(blockHash("- another thing"));
    expect(blockHash("- one thing")).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("curateRetro", () => {
  const long = (word: string) => `- ${words(30, word)}`;
  const retro = [
    "## Highlights",
    long("party"),
    "- met a friend",
    "## Learnings",
    long("insight"),
    "- too short to count",
    long("taxes"),
    "## Next Week's Goals",
    long("goal"),
  ].join("\n");

  it("shows only the picked blocks, word for word, and names their sections if there are several", () => {
    const picked = [blockHash(long("party")), blockHash(long("insight"))];
    expect(curateRetro(retro, picked)).toBe(
      ["## Highlights", long("party"), "## Learnings", long("insight")].join("\n\n"),
    );
  });

  it("leaves out the section name when only one section stays", () => {
    expect(curateRetro(retro, [blockHash(long("insight"))])).toBe(long("insight"));
  });

  it("shows nothing for a retro with an empty pick list", () => {
    expect(curateRetro(retro, [])).toBe("");
  });

  it("falls back to long Learnings for a retro without picks", () => {
    expect(curateRetro(retro)).toBe([long("insight"), long("taxes")].join("\n\n"));
  });
});

describe("buildEntries for retros", () => {
  const rel = "notion/Workspace/Weekly Retros/2023 - Example/2023 - CW45.md";
  const insight = `- ${words(50, "insight")}`;
  const content = `# 2023 - CW45\n\n## Highlights\n\n- ${words(50, "update")}\n\n## Learnings\n\n${insight}\n`;

  it("shows the picked blocks and remembers how long the whole file is", () => {
    const [entry] = buildEntries([{ rel, path: "/n/r.md", content }], {
      "2023 - Example/2023 - CW45.md": [blockHash(insight)],
    });
    expect(entry.title).toBe("2023 - CW45");
    expect(entry.body).toBe(insight);
    expect(entry.words).toBe(50);
    expect(entry.fullWords).toBeGreaterThan(100);
  });

  it("leaves out a retro with nothing picked", () => {
    const picks = { "2023 - Example/2023 - CW45.md": [] };
    expect(buildEntries([{ rel, path: "/n/r.md", content }], picks)).toEqual([]);
  });

  it("does not touch other kinds of entries", () => {
    const text = `Some prose first.\n\n## Highlights\n\n- ${words(50, "update")}`;
    const [entry] = buildEntries([{ rel: "dreams/a.md", path: "/n/a.md", content: text }]);
    expect(entry.body).toBe(text);
    expect(entry.fullWords).toBeNull();
  });
});

describe("dailyOrder and todaysPick", () => {
  const today = "2026-11-02";
  const entries = [
    entry("old-today", "2019-11-02"),
    entry("old-other", "2019-05-10"),
    entry("essay", null, { kind: "essay" }),
    entry("recent", "2026-10-30"),
  ];
  const none: DiaryLog = { events: [] };

  it("is the same all day and changes from day to day", () => {
    const ids = (day: string) => dailyOrder(entries, none, day).map((c) => c.entry.id);
    expect(ids(today)).toEqual(ids(today));
    const days = ["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];
    expect(new Set(days.map((d) => ids(d).join())).size).toBeGreaterThan(1);
  });

  it("names why an entry came up", () => {
    const reasons = Object.fromEntries(
      dailyOrder(entries, none, today).map((c) => [c.entry.id, c.reason]),
    );
    expect(reasons["old-today"]).toBe("On this day, 7 years ago");
    expect(reasons["old-other"]).toBe("Not re-read yet · from May 2019");
    expect(reasons.essay).toBe("Not re-read yet");
  });

  it("brings this day in earlier years up most of the time", () => {
    const days = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
    const firsts = days.filter((day) => {
      const shifted = [entry("same-day", `2019-${day.slice(5)}`), ...entries.slice(1)];
      return dailyOrder(shifted, none, day)[0].entry.id === "same-day";
    });
    expect(firsts.length).toBeGreaterThan(15);
  });

  it("rests an entry for a year after it was read", () => {
    const log: DiaryLog = {
      events: [{ day: "2026-06-01", id: "old-today", action: "read", words: 500 }],
    };
    expect(dailyOrder(entries, log, today).map((c) => c.entry.id)).not.toContain("old-today");
    const later = dailyOrder(entries, log, "2027-06-02").find((c) => c.entry.id === "old-today");
    expect(later?.reason).toBe("Last read June 2026");
  });

  it("moves past what was read or skipped today, and undo brings it back", () => {
    const order = dailyOrder(entries, none, today);
    const first = order[0].entry.id;
    const skipped: DiaryLog = { events: [{ day: today, id: first, action: "skip", words: 500 }] };
    expect(todaysPick(order, skipped, today)?.entry.id).toBe(order[1].entry.id);
    expect(todaysPick(order, undoToday(skipped, first, today), today)?.entry.id).toBe(first);
  });
});

describe("diaryStats", () => {
  it("counts the last 30 days and how much of the archive was read", () => {
    const entries = [entry("a", "2026-11-01"), entry("b", "2026-10-20"), entry("c", "2020-01-01")];
    const log: DiaryLog = {
      events: [
        { day: "2026-11-02", id: "c", action: "read", words: 500 },
        { day: "2026-11-02", id: "b", action: "skip", words: 500 },
      ],
    };
    expect(diaryStats(entries, log, "2026-11-02")).toEqual({
      written: 1000,
      read: 500,
      daysWritten: 2,
      daysRead: 1,
      entriesMet: 1,
      entries: 3,
      wordsMet: 500,
      words: 1500,
    });
  });
});

describe("morningPageRel", () => {
  it("follows the morning pages' month folders", () => {
    expect(morningPageRel("2026-11-02")).toBe("morning-pages/2026-11-November/2026-11-02.md");
  });
});
