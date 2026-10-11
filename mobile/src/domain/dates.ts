export type DateString = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function parseDateString(value: DateString): Date {
  if (!isRealDate(value)) throw new Error(`invalid date "${value}"`);
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateString(date: Date): DateString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocal(now: Date = new Date()): DateString {
  return toDateString(now);
}

// UTC so a DST change can't skip or repeat a day.
export function addDays(value: DateString, days: number): DateString {
  if (!isRealDate(value)) throw new Error(`invalid date "${value}"`);
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: DateString, to: DateString): number {
  if (!isRealDate(from)) throw new Error(`invalid date "${from}"`);
  if (!isRealDate(to)) throw new Error(`invalid date "${to}"`);
  const utc = (value: DateString) => {
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function startOfWeek(value: DateString): DateString {
  const [y, m, d] = value.split("-").map(Number);
  const dayFromMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(value, -dayFromMonday);
}
