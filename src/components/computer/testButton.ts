import { screen, within } from "@testing-library/react";

/**
 * Finds the one button whose aria-label, own text, or child span's text (as in
 * the Parts palette) is `name`.
 *
 * `getByRole("button", { name })` computes the accessible name of every button
 * in the builder, and each of those walks its subtree through jsdom's slow
 * getComputedStyle. Matching the label or text directly skips that walk, which
 * matters in tests that click Step dozens of times.
 */
export function testButton(name: string | RegExp, root?: HTMLElement): HTMLButtonElement {
  const scope = root ? within(root) : screen;
  const matches = new Set([
    ...scope.queryAllByLabelText(name, { selector: 'button, [role="button"]' }),
    ...scope.queryAllByText(name, { selector: "button" }),
    ...scope.queryAllByText(name, { selector: "button > span" }).map((span) => span.parentElement),
  ]);
  if (matches.size !== 1)
    throw new Error(`Expected one button named ${String(name)}, found ${matches.size}`);
  return [...matches][0] as HTMLButtonElement;
}
