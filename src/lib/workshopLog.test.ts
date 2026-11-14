import { describe, expect, it } from "vitest";
import { formatEntryDate, parseWorkshopLog } from "./workshopLog";

const log = [
  "---",
  "title: Test Log",
  "subtitle: A made-up subtitle",
  "published: true",
  "---",
  "",
  "Intro text that is not an entry.",
  "",
  "## 2026-11-13",
  "",
  "First day.",
  "",
  "## 2026-11-14 – Second title",
  "",
  "Second day.",
  "",
  "```md",
  "## 2026-01-01 inside a code block",
  "```",
  "",
  "## Notes without a date",
  "",
  "Not shown.",
  "",
  "## 2026-02-30",
  "",
  "Not a real date.",
].join("\n");

describe("parseWorkshopLog", () => {
  const parsed = parseWorkshopLog(log);

  it("reads the frontmatter", () => {
    expect(parsed.title).toBe("Test Log");
    expect(parsed.subtitle).toBe("A made-up subtitle");
    expect(parsed.published).toBe(true);
  });

  it("splits dated headings into entries, newest first", () => {
    expect(parsed.entries.map((e) => e.date)).toEqual(["2026-11-14", "2026-11-13"]);
    expect(parsed.entries[0].title).toBe("Second title");
    expect(parsed.entries[1].markdown).toBe("First day.");
  });

  it("keeps code blocks inside the entry and ends it at an undated heading", () => {
    expect(parsed.entries[0].markdown).toContain("## 2026-01-01 inside a code block");
    expect(parsed.entries[0].markdown).not.toContain("Not shown.");
  });

  it("skips headings whose date does not exist", () => {
    expect(parsed.entries.some((e) => e.markdown.includes("Not a real date."))).toBe(false);
  });

  it("is unpublished unless the file says so", () => {
    expect(parseWorkshopLog("## 2026-11-14\n\nHi").published).toBe(false);
  });
});

describe("formatEntryDate", () => {
  it("writes the day, month name and year", () => {
    expect(formatEntryDate("2026-11-04")).toBe("4 November 2026");
  });
});
