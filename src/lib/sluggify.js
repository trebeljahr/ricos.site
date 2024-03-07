export const sluggify = (str, separator = "-") => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, separator);
};
