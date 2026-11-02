import { escapeGoTemplate } from "./listmonk";

/**
 * Stand-in for the unsubscribe link while an issue renders. It holds no
 * braces or percent signs, so neither Handlebars nor the Go-template
 * quoting below touches it.
 */
export const UNSUBSCRIBE_PLACEHOLDER = "__LIVE_AND_LEARN_UNSUBSCRIBE_URL__";

/**
 * Swap the placeholder for ListMonk's per-recipient unsubscribe link.
 * ListMonk treats the whole body as a Go template, so quote any `{{` the
 * issue brings along first.
 */
export function finalizeIssueBody(body: string): string {
  return escapeGoTemplate(body).replaceAll(UNSUBSCRIBE_PLACEHOLDER, "{{ UnsubscribeURL }}");
}
