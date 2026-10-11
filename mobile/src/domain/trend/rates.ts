import { addDays, type DateString } from "../dates";
import { windowAverage, type Series } from "./series";

export const MIN_DAYS_PER_WINDOW = 4;

export function avg7(series: Series, day: DateString): number | null {
  return windowAverage(
    series.weights,
    addDays(day, -6),
    day,
    MIN_DAYS_PER_WINDOW,
  );
}

function rateOver(
  series: Series,
  today: DateString,
  days: number,
): number | null {
  const now = avg7(series, today);
  const before = avg7(series, addDays(today, -days));
  if (now === null || before === null) return null;
  return (now - before) / (days / 7);
}

export function weeklyRate(series: Series, today: DateString): number | null {
  return rateOver(series, today, 7);
}

export function rate14(series: Series, today: DateString): number | null {
  return rateOver(series, today, 14);
}

export function rate21(series: Series, today: DateString): number | null {
  return rateOver(series, today, 21);
}

export function currentWeight(
  series: Series,
  today: DateString,
): number | null {
  const average = avg7(series, today);
  if (average !== null) return average;
  let latest: DateString | null = null;
  for (const date of series.weights.keys()) {
    if (date <= today && (latest === null || date > latest)) latest = date;
  }
  return latest === null ? null : series.weights.get(latest)!;
}
