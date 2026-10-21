/** Sizes the field to its text. False while it has no layout, as inside a closed callout. */
export function fitHeight(element: HTMLTextAreaElement): boolean {
  element.style.height = "auto";
  if (element.scrollHeight === 0) return false;
  const borders = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borders}px`;
  return true;
}
