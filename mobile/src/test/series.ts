import { addDays, type DateString } from "@/domain/dates";
import type { DayRow } from "@/domain/trend/series";

export function dayRows(
  start: DateString,
  values: {
    weights?: (number | null)[];
    calories?: (number | null)[];
  },
): DayRow[] {
  const weights = values.weights ?? [];
  const calories = values.calories ?? [];
  const length = Math.max(weights.length, calories.length);
  return Array.from({ length }, (_, i) => ({
    date: addDays(start, i),
    weightKg: weights[i] ?? null,
    caloriesKcal: calories[i] ?? null,
  }));
}

export function linearWeights(
  count: number,
  first: number,
  perDay: number,
): number[] {
  return Array.from({ length: count }, (_, i) => first + perDay * i);
}
