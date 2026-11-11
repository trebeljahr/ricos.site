import { readFileSync } from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { describe, expect, it } from "vitest";
import { confirmCopy, escapeHtml, fillTemplate, renderConfirmEmail } from "./confirmEmail";
import { confirmLink } from "./confirmLink";
import { LIST_KEYS, type ListKey } from "./lists";

const template = readFileSync(
  path.join(process.cwd(), "src", "content", "email-templates", "confirmSubscription.hbs"),
  "utf-8",
);

describe("renderConfirmEmail", () => {
  it("renders the same HTML as Handlebars for every list choice", () => {
    process.env.NEWSLETTER_TOKEN_SECRET = "test-token-secret";
    const choices: ListKey[][] = [["live-and-learn"], ["computer"], ["announce"], [...LIST_KEYS]];
    for (const lists of choices) {
      const link = confirmLink("reader+tag@example.com", lists);
      const { subject, heading, intro } = confirmCopy(lists);
      const ours = renderConfirmEmail(template, link, lists);
      expect(ours.subject).toBe(subject);
      expect(ours.html).toBe(Handlebars.compile(template)({ confirmLink: link, heading, intro }));
    }
  });
});

describe("fillTemplate", () => {
  it("escapes like Handlebars", () => {
    const value = `a&b<c>d"e'f\`g=h`;
    expect(fillTemplate("{{x}}", { x: value })).toBe(Handlebars.compile("{{x}}")({ x: value }));
    expect(escapeHtml(value)).toBe(Handlebars.escapeExpression(value));
  });

  it("refuses Handlebars syntax it does not implement", () => {
    expect(() => fillTemplate("{{#if x}}y{{/if}}", { x: "1" })).toThrow(/Unsupported/);
    expect(() => fillTemplate("{{missing}}", {})).toThrow(/Unsupported/);
  });
});
