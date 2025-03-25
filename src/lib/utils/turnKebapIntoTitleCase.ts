import { toTitleCase } from "./toTitleCase";

export function turnKebabIntoTitleCase(kebab: string) {
  return kebab.split("-").map(toTitleCase).join(" ");
}
