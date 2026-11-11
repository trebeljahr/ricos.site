import { DEFAULT_LIST, type ListKey, listNames, NEWSLETTER_LISTS } from "./lists";

/**
 * The double-opt-in email: its copy per list choice, and the template
 * filled in. No Node imports and no `Handlebars.compile` (which builds a
 * function from a string, and the API Worker may not do that), so the
 * Next dev server and the Worker render the same email.
 *
 * The template (src/content/email-templates/confirmSubscription.hbs) uses
 * only `{{name}}` fields. They are escaped exactly as Handlebars escapes
 * them; confirmEmail.test.ts checks the output against Handlebars itself.
 */

export type ConfirmEmail = { subject: string; html: string };

export function confirmCopy(lists: readonly ListKey[]) {
  if (lists.length === 1 && lists[0] === DEFAULT_LIST) {
    return {
      subject: "Confirm Signup to the Live and Learn Newsletter",
      heading: "Welcome to Live and Learn.",
      intro:
        "Well almost... You still need to click the button below. Only then, you will get my newsletter regularly. Double Opt-In is a thing these days, you know. 😉",
    };
  }
  const names = listNames(lists);
  return {
    subject: `Confirm your signup to ${names}`,
    heading: `Welcome to ${names}.`,
    intro: `Well almost... You still need to click the button below. Only then, you will get ${lists
      .map((list) => {
        const promise = NEWSLETTER_LISTS[list].promise.replace(/\.$/, "");
        return promise[0].toLowerCase() + promise.slice(1);
      })
      .join(", and ")}. 😉`,
  };
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/** Handlebars' `escapeExpression`. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`=]/g, (ch) => ESCAPES[ch]);
}

/**
 * Fill `{{name}}` fields. Any other Handlebars syntax in the template is an
 * error, so a template edit that needs a real Handlebars feature fails the
 * tests instead of mailing raw braces.
 */
export function fillTemplate(source: string, values: Record<string, string>): string {
  return source.replace(/\{\{\s*([^}]*?)\s*\}\}/g, (match, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Unsupported template field: ${match}`);
    return escapeHtml(values[name]);
  });
}

export function renderConfirmEmail(
  template: string,
  link: string,
  lists: readonly ListKey[],
): ConfirmEmail {
  const { subject, heading, intro } = confirmCopy(lists);
  return { subject, html: fillTemplate(template, { confirmLink: link, heading, intro }) };
}
