import { describe, expect, it } from "vitest";
import { finalizeIssueBody, UNSUBSCRIBE_PLACEHOLDER } from "./issueBody";

const body = `<p>Code: {{ .Secret }}</p><a href="${UNSUBSCRIBE_PLACEHOLDER}">Unsubscribe</a>`;

describe("finalizeIssueBody", () => {
  it("gives ListMonk its unsubscribe tag and quotes the issue's own braces", () => {
    expect(finalizeIssueBody(body, "listmonk")).toBe(
      '<p>Code: {{"{{"}} .Secret }}</p><a href="{{ UnsubscribeURL }}">Unsubscribe</a>',
    );
  });

  it("gives Mailgun its list unsubscribe variable and leaves the rest alone", () => {
    expect(finalizeIssueBody(body, "mailgun")).toBe(
      '<p>Code: {{ .Secret }}</p><a href="%mailing_list_unsubscribe_url%">Unsubscribe</a>',
    );
  });
});
