import { describe, expect, it } from "vitest";
import {
  type DeskIO,
  loadDiary,
  loadWriting,
  mergeWordLogs,
  runOfDays,
  seedFromHistory,
  splitFrontmatter,
  streakWarning,
  updateJson,
  WORDS_SEED_REL,
  type WordLog,
  writeDraft,
} from "./deskStore";

/** A tiny YAML reader: flat `key: value` lines are all these tests need. */
const parseYaml = (yaml: string) =>
  Object.fromEntries(
    yaml.split("\n").map((line) => {
      const [key, ...rest] = line.split(": ");
      const raw = rest.join(": ").replace(/^"|"$/g, "");
      const value = raw === "true" ? true : raw === "false" ? false : raw;
      return [key, /^\d+$/.test(raw) ? Number(raw) : value];
    }),
  );

function fakeIO(files: Record<string, string>, device = "laptop") {
  const io: DeskIO = {
    markdownFiles: () => Object.keys(files).filter((f) => f.endsWith(".md")),
    read: async (rel) => files[rel],
    listFolder: async (folder) =>
      Object.keys(files).filter(
        (f) => f.startsWith(`${folder}/`) && !f.slice(folder.length + 1).includes("/"),
      ),
    readJson: async <T>(rel: string, fallback: T) =>
      rel in files ? (JSON.parse(files[rel]) as T) : fallback,
    writeJson: async (rel, value) => {
      files[rel] = JSON.stringify(value);
    },
    createNote: async (rel, content) => {
      if (rel in files) return false;
      files[rel] = content;
      return true;
    },
    parseYaml,
    deviceId: () => device,
  };
  return { io, files };
}

const chapter = (status = "drafting") => `---
title: "Bits"
slug: "bits"
part: 1
partTitle: "The Basics"
number: "9.9"
kind: chapter
order: 1
status: ${status}
published: false
---

${"word ".repeat(120)}
`;

describe("splitFrontmatter", () => {
  it("separates data from the body", () => {
    expect(splitFrontmatter('---\ntitle: "A"\n---\nBody', parseYaml)).toEqual({
      data: { title: "A" },
      content: "Body",
    });
  });
  it("leaves a note without frontmatter alone", () => {
    expect(splitFrontmatter("Just text\n---\nmore", parseYaml).content).toBe(
      "Just text\n---\nmore",
    );
  });
});

describe("mergeWordLogs", () => {
  it("keeps the total seen last for each day, whichever device saw it", () => {
    const laptop: WordLog = {
      "2026-11-03": { words: 100, at: 1 },
      "2026-11-04": { words: 200, at: 5 },
    };
    const phone: WordLog = { "2026-11-04": { words: 180, at: 9 } };
    expect(mergeWordLogs([laptop, phone])).toEqual({
      "2026-11-03": { words: 100, at: 1 },
      "2026-11-04": { words: 180, at: 9 },
    });
  });
});

describe("streakWarning", () => {
  it("stays quiet with nothing at stake", () => {
    expect(streakWarning(0, false, 22, "Write")).toBeNull();
    expect(streakWarning(5, true, 22, "Write")).toBeNull();
  });
  it("warns all day and turns urgent in the evening", () => {
    expect(streakWarning(5, false, 9, "Write")?.urgent).toBe(false);
    expect(streakWarning(5, false, 18, "Write")?.urgent).toBe(true);
    expect(streakWarning(5, false, 9, "Write one word")?.text).toBe(
      "Your 5-day streak ends tonight. Write one word to keep it.",
    );
  });
});

describe("runOfDays", () => {
  it("counts back from today, or from yesterday while today is open", () => {
    const done = new Set(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(runOfDays(done, "2026-11-03")).toBe(3);
    expect(runOfDays(done, "2026-11-04")).toBe(3);
    expect(runOfDays(done, "2026-11-05")).toBe(0);
  });
});

describe("updateJson", () => {
  it("changes the file as it is now, not an older copy", async () => {
    const { io, files } = fakeIO({ "a.json": '{"n":1}' });
    files["a.json"] = '{"n":5}';
    await updateJson(io, "a.json", { n: 0 }, (v) => ({ n: v.n + 1 }));
    expect(JSON.parse(files["a.json"])).toEqual({ n: 6 });
  });
  it("refuses to overwrite a damaged file", async () => {
    const { io, files } = fakeIO({ "a.json": "{broken" });
    await expect(updateJson(io, "a.json", { n: 0 }, () => ({ n: 1 }))).rejects.toThrow();
    expect(files["a.json"]).toBe("{broken");
  });
});

describe("loadWriting", () => {
  const now = new Date("2026-11-04T20:00:00");
  const rel = "computer/Part 1 - The Basics/9.9 Bits.md";

  it("writes only to this device's own log and carries the seed history", async () => {
    const seed = seedFromHistory({ "2026-11-02": 50, "2026-11-03": 100 });
    const { io, files } = fakeIO({
      [rel]: chapter(),
      [WORDS_SEED_REL]: JSON.stringify(seed),
    });
    const data = await loadWriting(io, now);
    expect(data.today).toBe(20);
    expect(data.streak).toBe(2);
    expect(data.warning).toBeNull();
    expect(JSON.parse(files["texts/desk-words-laptop.json"])["2026-11-04"].words).toBe(120);
    expect(JSON.parse(files[WORDS_SEED_REL])).toEqual(seed);
  });

  it("warns when the streak has nothing today yet", async () => {
    const seed = seedFromHistory({ "2026-11-02": 50, "2026-11-03": 120 });
    const { io } = fakeIO({ [rel]: chapter(), [WORDS_SEED_REL]: JSON.stringify(seed) });
    const data = await loadWriting(io, now);
    expect(data.today).toBe(0);
    expect(data.warning?.urgent).toBe(true);
    expect(data.warning?.text).toContain("1-day streak");
  });

  it("finds what to write next", async () => {
    const { io } = fakeIO({ [rel]: chapter() });
    const data = await loadWriting(io, now);
    expect(data.next?.step).toBe("drafted");
    expect(data.next?.chapter.path).toBe(rel);
  });
});

describe("loadDiary", () => {
  it("serves an old entry, finds today's morning page and counts the read streak", async () => {
    const text = `${"thought ".repeat(60)}\n`;
    const { io } = fakeIO({
      "texts/diary-entries/2021-11-04-old.md": text,
      "texts/morning-pages/2026-11-November/2026-11-04.md": "morning words here\n",
      "texts/ideas/not-served.md": text,
      "texts/diary-progress.json": JSON.stringify({
        events: [{ day: "2026-11-03", id: "x", action: "read", words: 10 }],
      }),
    });
    const data = await loadDiary(io, new Date("2026-11-04T09:00:00"));
    expect(data.pick?.entry.rel).toBe("diary-entries/2021-11-04-old.md");
    expect(data.pick?.reason).toBe("On this day, 5 years ago");
    expect(data.morning).toEqual({
      rel: "texts/morning-pages/2026-11-November/2026-11-04.md",
      words: 3,
    });
    expect(data.readStreak).toBe(1);
    expect(data.warning?.urgent).toBe(false);
  });

  it("reports no morning page when today's file is missing", async () => {
    const { io } = fakeIO({});
    const data = await loadDiary(io, new Date("2026-11-04T09:00:00"));
    expect(data.morning.words).toBeNull();
    expect(data.pick).toBeNull();
  });
});

describe("writeDraft", () => {
  it("never overwrites an existing draft", async () => {
    const { io, files } = fakeIO({ "texts/drafts/envy.md": "mine" });
    const book = {
      marks: [
        { id: "a", quote: "Q", rel: "texts/x.md", title: "X", date: null, day: "2026-11-04" },
      ],
      piles: [{ name: "Envy", ids: ["a"] }],
    };
    expect(await writeDraft(io, book, "Envy")).toBe("texts/drafts/envy-2.md");
    expect(files["texts/drafts/envy.md"]).toBe("mine");
    expect(files["texts/drafts/envy-2.md"]).toContain("> Q");
  });
});
