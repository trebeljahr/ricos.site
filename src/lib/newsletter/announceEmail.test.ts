import { describe, expect, it } from "vitest";
import { announceEmail } from "./announceEmail";

const entry = {
  slug: "demo",
  date: new Date("2026-10-27T16:00:00Z"),
  title: "Demo {{ .Subscriber.Email }}",
  summary: "Turns <b>things</b> into other things.",
  link: "https://demo.trebeljahr.com",
};

describe("announceEmail", () => {
  it("names the thing, its card text and its link, with a live unsubscribe link", () => {
    const email = announceEmail(entry);
    expect(email.name).toBe("New thing: demo");
    expect(email.text).toContain("A new thing is out.");
    expect(email.text).toContain("https://demo.trebeljahr.com");
    expect(email.html).toContain('href="https://demo.trebeljahr.com"');
    expect(email.html).toContain("Turns &lt;b&gt;things&lt;/b&gt; into other things.");
    expect(email.html).toContain('href="{{ UnsubscribeURL }}"');
    expect(email.text).toContain("Unsubscribe: {{ UnsubscribeURL }}");
  });

  it("quotes Go-template braces from the entry", () => {
    const email = announceEmail(entry);
    expect(email.subject).not.toContain("{{ .Subscriber.Email }}");
    expect(email.html).not.toContain("{{ .Subscriber.Email }}");
    expect(email.html.match(/\{\{ UnsubscribeURL \}\}/g)).toHaveLength(1);
  });

  it("carries no tracking tags", () => {
    const { html, text } = announceEmail(entry);
    for (const part of [html, text]) expect(part).not.toMatch(/TrackView|TrackLink/);
  });
});
