import { describe, expect, it } from "vitest";
import { type ChapterEntry, chapterAlertEmail, findPublishedChapter } from "./chapterAlert";

const chapter: ChapterEntry = {
  slug: "what-is-a-bit",
  title: "What is a bit?",
  summary: "Two states & a lot of patience.",
  published: true,
};

describe("findPublishedChapter", () => {
  const chapters: ChapterEntry[] = [chapter, { slug: "draft", title: "Draft", published: false }];

  it("finds a published chapter by slug", () => {
    expect(findPublishedChapter(chapters, "what-is-a-bit")).toBe(chapter);
  });

  it("refuses an unpublished or unknown chapter", () => {
    expect(() => findPublishedChapter(chapters, "draft")).toThrow(/not published/);
    expect(() => findPublishedChapter(chapters, "nope")).toThrow(/Published: what-is-a-bit/);
  });
});

describe("chapterAlertEmail", () => {
  it("links the chapter and keeps only the unsubscribe placeholder live", () => {
    const email = chapterAlertEmail(chapter, "https://ricos.site");
    expect(email.subject).toBe("New chapter: What is a bit?");
    expect(email.html).toContain('href="https://ricos.site/computer/what-is-a-bit"');
    expect(email.html).toContain("Two states &amp; a lot of patience.");
    expect(email.html).toContain('href="{{ UnsubscribeURL }}"');
    expect(email.text).toContain("Read the chapter: https://ricos.site/computer/what-is-a-bit");
    expect(email.text).toContain("Unsubscribe: {{ UnsubscribeURL }}");
  });

  it("quotes Go-template braces from the chapter", () => {
    const email = chapterAlertEmail(
      { ...chapter, title: "Templates {{ like this }}", summary: undefined },
      "https://ricos.site",
    );
    expect(email.subject).toBe('New chapter: Templates {{"{{"}} like this }}');
    expect(email.html).toContain('Templates {{"{{"}} like this }}');
    expect(email.html.match(/\{\{ UnsubscribeURL \}\}/g)).toHaveLength(1);
  });
});
