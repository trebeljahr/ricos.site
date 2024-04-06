import { parse, parseISO } from "date-fns";

export const byDates = (a: { date: string }, b: { date: string }) => {
  return parseDate(a.date) > parseDate(b.date) ? 1 : -1;
};

export function parseDate(dateString: string) {
  let date;
  if (dateString.match(/\d{2}.\d{2}.\d{4}/)) {
    date = parse(dateString, "dd.MM.yyyy", new Date());
  } else {
    date = parseISO(dateString);
  }
  return date;
}
