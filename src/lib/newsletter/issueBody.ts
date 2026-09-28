import { escapeGoTemplate } from "./listmonk";
import type { NewsletterProvider } from "./subscribe";

/**
 * Stand-in for the unsubscribe link while an issue renders. It holds no
 * braces or percent signs, so neither Handlebars nor the Go-template
 * quoting below touches it.
 */
export const UNSUBSCRIBE_PLACEHOLDER = "__LIVE_AND_LEARN_UNSUBSCRIBE_URL__";

/**
 * Swap the placeholder for the provider's per-recipient unsubscribe link.
 * ListMonk treats the whole body as a Go template, so quote any `{{` the
 * issue brings along first.
 */
export function finalizeIssueBody(body: string, provider: NewsletterProvider): string {
  if (provider === "listmonk") {
    return escapeGoTemplate(body).replaceAll(UNSUBSCRIBE_PLACEHOLDER, "{{ UnsubscribeURL }}");
  }
  return body.replaceAll(UNSUBSCRIBE_PLACEHOLDER, "%mailing_list_unsubscribe_url%");
}
