export function sluggify(text) {
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
