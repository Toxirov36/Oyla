export const localDay = (date = new Date()) =>
  new Date(date.getTime() + 5 * 3600000).toISOString().slice(0, 10);
export function weekStart(date = new Date()) {
  const day = new Date(`${localDay(date)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return new Date(day.getTime() - 5 * 3600000);
}
