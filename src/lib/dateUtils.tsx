export const byDates = (a: { date: string }, b: { date: string }) => {
  return new Date(a.date) > new Date(b.date) ? 1 : -1;
};
