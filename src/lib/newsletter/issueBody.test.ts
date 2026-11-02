import { describe, expect, it } from "vitest";
import { finalizeIssueBody, UNSUBSCRIBE_PLACEHOLDER } from "./issueBody";

const body = `<p>Code: {{ .Secret }}</p><a href="${UNSUBSCRIBE_PLACEHOLDER}">Unsubscribe</a>`;

describe("finalizeIssueBody", () => {
  it("gives ListMonk its unsubscribe tag and quotes the issue's own braces", () => {
    expect(finalizeIssueBody(body)).toBe(
      '<p>Code: {{"{{"}} .Secret }}</p><a href="{{ UnsubscribeURL }}">Unsubscribe</a>',
    );
  });
});
