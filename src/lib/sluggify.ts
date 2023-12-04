export function sluggify(text: string) {
  return text
    .replaceAll(" ", "-")
    .replaceAll("/", "-")
    .replaceAll(",", "")
    .replaceAll(":", "")
    .replaceAll(";", "")
    .replaceAll("!", "")
    .replaceAll("?", "")
    .replaceAll(".", "")
    .toLowerCase();
}
